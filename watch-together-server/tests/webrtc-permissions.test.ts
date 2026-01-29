/**
 * WebRTC 信令权限控制测试
 *
 * 确保只有房主可以发送 WEBRTC_OFFER，
 * 普通成员伪造 WEBRTC_OFFER 时会被服务器拒绝并返回 WEBRTC_ERROR。
 */

import { Server } from 'http';
import WebSocket from 'ws';
import { createApp } from '../src/app';
import { getPrismaClient } from '../src/db';
import { createWebSocketServer, closeWebSocketServer } from '../src/websocket';

describe('WebRTC 信令权限控制', () => {
  let httpServer: Server;
  const prisma = getPrismaClient();

  // 使用符合后端格式校验的 ID
  // room-{8位小写字母或数字}, user-{8位小写字母或数字}
  const roomId = 'room-abc12345';      // abc12345 -> 8 chars
  const hostUserId = 'user-host0000';  // host0000 -> 8 chars
  const memberUserId = 'user-mem00001'; // mem00001 -> 8 chars

  beforeAll(async () => {
    jest.setTimeout(30000);

    const app = createApp();
    httpServer = app.listen(0);
    createWebSocketServer(httpServer);

    // 准备房间与成员数据
    await prisma.room.create({
      data: {
        id: roomId,
        name: 'WebRTC Room',
        hostId: hostUserId,
        currentUrl: null,
      },
    });

    await prisma.roomMember.create({
      data: {
        roomId,
        userId: hostUserId,
        nickname: 'Host',
        isHost: true,
      },
    });

    await prisma.roomMember.create({
      data: {
        roomId,
        userId: memberUserId,
        nickname: 'Member',
        isHost: false,
      },
    });
  }, 30000);

  afterAll(async () => {
    jest.setTimeout(30000);

    try {
      await closeWebSocketServer();
    } catch {
      // ignore
    }

    await new Promise<void>(resolve => {
      httpServer.close(() => resolve());
    });

    try {
      await prisma.roomMember.deleteMany({ where: { roomId } });
      await prisma.room.delete({ where: { id: roomId } });
    } catch {
      // ignore
    }
  }, 30000);

  it('普通成员伪造 WEBRTC_OFFER 时会被拒绝并返回 WEBRTC_ERROR', async () => {
    const port = (httpServer.address() as { port: number }).port;
    const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${roomId}&userId=${memberUserId}`);

    const errorMessage = await new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for WEBRTC_ERROR'));
      }, 8000);

      ws.on('open', () => {
        // 模拟在浏览器控制台直接发送 WEBRTC_OFFER
        const forgedOffer = {
          type: 'WEBRTC_OFFER',
          roomId,
          fromUserId: memberUserId,
          toUserId: null,
          sdp: 'fake-sdp',
          timestamp: Date.now(),
        };
        ws.send(JSON.stringify(forgedOffer));
      });

      ws.on('message', data => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'WEBRTC_ERROR') {
            clearTimeout(timeout);
            resolve(msg);
          }
        } catch (e) {
          clearTimeout(timeout);
          reject(e);
        }
      });

      ws.on('error', err => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    expect(errorMessage).toBeDefined();
    expect(errorMessage.type).toBe('WEBRTC_ERROR');
    expect(errorMessage.errorMessage).toContain('Only host can send WEBRTC_OFFER');

    ws.close();
  });
});

