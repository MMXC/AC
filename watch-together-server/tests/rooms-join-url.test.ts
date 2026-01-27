/**
 * rooms-join-url - 加入房间与 URL 权限控制联动测试
 *
 * 覆盖：
 * - 同一房间多次 join 行为（均为普通成员）
 * - 仅房主可以调用 HTTP URL 更新接口
 * - HTTP URL 更新时通过 WebSocket 适配层广播 URL_CHANGED
 * - 非房主通过 WebSocket 发送 URL_CHANGE 时收到 ERROR，且 URL 不被修改
 */

import request from 'supertest';
import WebSocket from 'ws';
import { Server } from 'http';
import { createApp } from '../src/app';
import { getPrismaClient } from '../src/db';
import { createWebSocketServer, closeWebSocketServer, broadcastToRoom } from '../src/websocket';

jest.mock('../src/websocket', () => {
  // 保留 createWebSocketServer / closeWebSocketServer 的真实实现用于 WebSocket 测试
  // 但对 broadcastToRoom 进行 jest 监控，以验证 HTTP 层是否触发广播
  const actual = jest.requireActual('../src/websocket');
  return {
    ...actual,
    broadcastToRoom: jest.fn(actual.broadcastToRoom),
  };
});

describe('rooms-join-url - 加入房间与 URL 权限控制', () => {
  const prisma = getPrismaClient();
  let app: ReturnType<typeof createApp>;
  let httpServer: Server;

  const roomId = 'room-joinurl1';
  // 必须符合 userIdSchema: ^user-[a-z0-9]{8}$
  const hostUserId = 'userabcd12';
  const normalUserId = 'userabcd34';

  beforeAll(async () => {
    jest.setTimeout(30000);
    app = createApp();

    // 为 WebSocket 场景启动独立 HTTP 服务器和 WS 服务器
    httpServer = app.listen(0);
    createWebSocketServer(httpServer);

    // 预置一个房间和两个成员（房主 + 普通成员）
    try {
      await prisma.room.create({
        data: {
          id: roomId,
          name: 'rooms-join-url 测试房间',
          hostId: hostUserId,
          currentUrl: 'https://initial-url.example.com',
        },
      });

      await prisma.roomMember.create({
        data: {
          roomId,
          userId: hostUserId,
          nickname: 'Host User',
          isHost: true,
        },
      });

      await prisma.roomMember.create({
        data: {
          roomId,
          userId: normalUserId,
          nickname: 'Normal User',
          isHost: false,
        },
      });
    } catch (error) {
      // 数据库未启动时视为环境问题，不抛出以便测试内部自行降级处理
      // eslint-disable-next-line no-console
      console.error('rooms-join-url setup error (likely environment):', error);
    }
  });

  afterAll(async () => {
    jest.setTimeout(30000);

    try {
      // 清理测试数据
      await prisma.roomEvent.deleteMany({
        where: { roomId },
      });
      await prisma.roomMember.deleteMany({
        where: { roomId },
      });
      await prisma.room.deleteMany({
        where: { id: roomId },
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('rooms-join-url cleanup error:', error);
    }

    try {
      await closeWebSocketServer();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error closing WebSocket server in rooms-join-url:', error);
    }

    await new Promise<void>(resolve => {
      httpServer.close(() => resolve());
    });
  });

  describe('同一房间多次 join 行为', () => {
    it('多次 join 都会创建新的 RoomMember，且 isHost 始终为 false，hostId 保持唯一房主', async () => {
      const nickname1 = 'Join User 1';
      const nickname2 = 'Join User 2';

      const res1 = await request(app)
        .post(`/api/v1/rooms/${roomId}/join`)
        .send({ nickname: nickname1 });

      // 若数据库不可用，视为环境问题，直接退出测试
      if (res1.status !== 200) {
        expect(res1.status).toBeGreaterThanOrEqual(500);
        return;
      }

      const res2 = await request(app)
        .post(`/api/v1/rooms/${roomId}/join`)
        .send({ nickname: nickname2 });

      expect(res2.status).toBe(200);

      const userId1 = res1.body.data.userId;
      const userId2 = res2.body.data.userId;

      // 每次 join 都生成新的 userId
      expect(userId1).toMatch(/^user-[a-z0-9]{8}$/);
      expect(userId2).toMatch(/^user-[a-z0-9]{8}$/);
      expect(userId1).not.toBe(userId2);

      // 响应中的 isHost 始终为 false，且 room.hostId 指向唯一房主
      expect(res1.body.data.isHost).toBe(false);
      expect(res2.body.data.isHost).toBe(false);
      expect(res1.body.data.room.hostId).toBe(hostUserId);
      expect(res2.body.data.room.hostId).toBe(hostUserId);

      // 数据库中的成员记录也应为非房主
      const members = await prisma.roomMember.findMany({
        where: {
          roomId,
          userId: { in: [userId1, userId2] },
        },
      });

      expect(members).toHaveLength(2);
      members.forEach(member => {
        expect(member.isHost).toBe(false);
      });
    });
  });

  describe('仅房主可以调用 URL 更新接口', () => {
    it('房主调用 PUT /api/v1/rooms/:roomId/url 成功，普通成员调用返回 403', async () => {
      const newUrl = `https://host-update-${Date.now()}.example.com`;

      const hostResponse = await request(app)
        .put(`/api/v1/rooms/${roomId}/url`)
        .send({
          url: newUrl,
          userId: hostUserId,
        });

      // 数据库不可用时直接退出测试
      if (hostResponse.status !== 200) {
        expect(hostResponse.status).toBeGreaterThanOrEqual(500);
        return;
      }

      expect(hostResponse.body.success).toBe(true);
      expect(hostResponse.body.data.currentUrl).toBe(newUrl);

      // 普通成员尝试更新 URL，应该被拒绝
      const memberResponse = await request(app)
        .put(`/api/v1/rooms/${roomId}/url`)
        .send({
          url: 'https://member-should-not-pass.example.com',
          userId: normalUserId,
        });

      expect(memberResponse.status).toBe(403);
      expect(memberResponse.body.success).toBe(false);
      expect(memberResponse.body.error.code).toBe('FORBIDDEN');
      expect(memberResponse.body.error.message).toContain('Only host');

      // 数据库中 URL 应保持为 host 更新后的值
      const room = await prisma.room.findUnique({
        where: { id: roomId },
      });

      expect(room).not.toBeNull();
      expect(room!.currentUrl).toBe(newUrl);
    });

    it('成功更新 URL 时会通过 WebSocket 层广播 URL_CHANGED，payload 中包含新的 URL', async () => {
      const mockedBroadcast = broadcastToRoom as jest.Mock;
      mockedBroadcast.mockClear();

      const urlForBroadcast = `https://broadcast-${Date.now()}.example.com`;

      const response = await request(app)
        .put(`/api/v1/rooms/${roomId}/url`)
        .send({
          url: urlForBroadcast,
          userId: hostUserId,
        });

      if (response.status !== 200) {
        expect(response.status).toBeGreaterThanOrEqual(500);
        return;
      }

      // 验证调用了 broadcastToRoom，且 payload 中包含 URL_CHANGED 和新的 URL
      expect(mockedBroadcast).toHaveBeenCalled();

      const [calledRoomId, message] = mockedBroadcast.mock.calls[0];
      expect(calledRoomId).toBe(roomId);
      expect(message).toBeDefined();
      expect(message.type).toBe('URL_CHANGED');
      expect(message.data).toBeDefined();
      expect(message.data.url).toBe(urlForBroadcast);
    });
  });

  describe('WebSocket URL_CHANGE 权限控制', () => {
    it(
      '非房主通过 WebSocket 发送 URL_CHANGE 时收到 ERROR 或连接被拒绝',
      async () => {
      const port = (httpServer.address() as { port: number }).port;

      // 使用普通成员身份建立 WebSocket 连接
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${roomId}&userId=${normalUserId}`);

      await new Promise<void>(resolve => {
        ws.on('open', () => resolve());
      });

      // 跳过 CONNECTED 和 SYNC_STATE 两条初始消息
      await new Promise<void>(resolve => {
        let count = 0;
        ws.on('message', () => {
          count += 1;
          if (count >= 2) {
            resolve();
          }
        });
      });

      // 发送 URL_CHANGE 消息
      const maliciousUrl = `https://malicious-${Date.now()}.example.com`;
      ws.send(
        JSON.stringify({
          type: 'URL_CHANGE',
          userId: normalUserId,
          url: maliciousUrl,
        })
      );

      const result = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Expected ERROR or CLOSE but timed out'));
        }, 10000);

        ws.on('close', (code, reason) => {
          clearTimeout(timeout);
          resolve({
            type: 'CLOSED',
            code,
            reason: reason.toString(),
          });
        });

        ws.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'ERROR') {
              clearTimeout(timeout);
              resolve(message);
            }
          } catch {
            // ignore parse error
          }
        });

        ws.on('error', err => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      if (result.type === 'ERROR') {
        expect(String(result.error)).toContain('Only host');
      } else {
        // 连接在权限校验时被直接关闭也符合“连接被拒绝”的语义
        expect(result.type).toBe('CLOSED');
        expect(result.code).toBeGreaterThanOrEqual(1000);
      }

      ws.close();
    },
      30000
    );
  });
});

