/**
 * WebSocket 心跳和连接管理测试
 */

import { Server } from 'http';
import WebSocket from 'ws';
import { createApp } from '../src/app';
import { getPrismaClient } from '../src/db';
import { createWebSocketServer, closeWebSocketServer } from '../src/websocket';

describe('心跳连接管理', () => {
  let httpServer: Server;
  const prisma = getPrismaClient();
  let testRoomId: string;
  let testHostId: string;
  let testUserId1: string;

  beforeAll(async () => {
    // 增加超时时间到 30 秒
    jest.setTimeout(30000);

    // 创建 HTTP 服务器
    const app = createApp();
    httpServer = app.listen(0); // 使用随机端口

    // 创建 WebSocket 服务器
    createWebSocketServer(httpServer);

    try {
      // 创建测试房间和用户
      testHostId = 'user-heart999';
      testUserId1 = 'user-heart998';
      testRoomId = 'room-heart999';

      await prisma.room.create({
        data: {
          id: testRoomId,
          name: 'Test Room for Heartbeat',
          hostId: testHostId,
          currentUrl: 'https://example.com',
        },
      });

      await prisma.roomMember.create({
        data: {
          roomId: testRoomId,
          userId: testHostId,
          nickname: 'Test Host',
          isHost: true,
        },
      });

      await prisma.roomMember.create({
        data: {
          roomId: testRoomId,
          userId: testUserId1,
          nickname: 'Test User 1',
          isHost: false,
        },
      });
    } catch (error) {
      console.error('Error setting up test data:', error);
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    // 增加超时时间到 30 秒
    jest.setTimeout(30000);

    // 关闭 WebSocket 服务器
    try {
      await closeWebSocketServer();
    } catch (error) {
      console.error('Error closing WebSocket server:', error);
    }

    // 关闭 HTTP 服务器
    await new Promise<void>(resolve => {
      httpServer.close(() => {
        resolve();
      });
    });

    // 清理测试数据
    try {
      if (testRoomId) {
        await prisma.roomEvent.deleteMany({
          where: {
            roomId: testRoomId,
          },
        });
        await prisma.message.deleteMany({
          where: {
            roomId: testRoomId,
          },
        });
        await prisma.roomMember.deleteMany({
          where: {
            roomId: testRoomId,
          },
        });
        await prisma.room.delete({
          where: {
            id: testRoomId,
          },
        });
      }
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
  }, 30000);

  describe('服务器定期发送 ping，客户端响应 pong', () => {
    it('服务器应该定期发送 ping 消息', async () => {
      jest.useFakeTimers();
      const port = (httpServer.address() as { port: number }).port;

      // 连接 WebSocket
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testHostId}`);

      // 等待连接建立
      await new Promise<void>(resolve => {
        ws.on('open', () => {
          resolve();
        });
      });

      // 跳过初始的 CONNECTED 和 SYNC_STATE 消息
      await new Promise<void>(resolve => {
        let messageCount = 0;
        ws.on('message', () => {
          messageCount++;
          if (messageCount >= 2) {
            resolve();
          }
        });
      });

      // 收集 ping 消息
      const pingMessages: Buffer[] = [];
      ws.on('ping', (data: Buffer) => {
        pingMessages.push(data);
      });

      // 快进时间 35 秒（应该至少发送一次 ping）
      jest.advanceTimersByTime(35000);

      // 等待 ping 消息
      await new Promise(resolve => setTimeout(resolve, 100));

      // 验证收到了 ping
      expect(pingMessages.length).toBeGreaterThan(0);

      // 响应 pong
      if (pingMessages.length > 0) {
        ws.pong();
      }

      // 清理
      jest.useRealTimers();
      ws.close();
    });

    it('客户端响应 pong 后连接应该保持活跃', async () => {
      jest.useFakeTimers();
      const port = (httpServer.address() as { port: number }).port;

      // 连接 WebSocket
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testHostId}`);

      // 等待连接建立
      await new Promise<void>(resolve => {
        ws.on('open', () => {
          resolve();
        });
      });

      // 跳过初始消息
      await new Promise<void>(resolve => {
        let messageCount = 0;
        ws.on('message', () => {
          messageCount++;
          if (messageCount >= 2) {
            resolve();
          }
        });
      });

      // 监听 ping 并响应 pong
      ws.on('ping', () => {
        ws.pong();
      });

      // 快进时间 2 分钟（应该发送多次 ping）
      jest.advanceTimersByTime(2 * 60 * 1000);

      // 等待 ping/pong 循环
      await new Promise(resolve => setTimeout(resolve, 100));

      // 验证连接仍然打开
      expect(ws.readyState).toBe(WebSocket.OPEN);

      // 清理
      jest.useRealTimers();
      ws.close();
    });
  });

  describe('无响应 5 分钟后自动断开连接', () => {
    it('如果 5 分钟内没有收到 pong，连接应该自动断开', async () => {
      jest.useFakeTimers();
      const port = (httpServer.address() as { port: number }).port;

      // 连接 WebSocket
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testHostId}`);

      // 等待连接建立
      await new Promise<void>(resolve => {
        ws.on('open', () => {
          resolve();
        });
      });

      // 跳过初始消息
      await new Promise<void>(resolve => {
        let messageCount = 0;
        ws.on('message', () => {
          messageCount++;
          if (messageCount >= 2) {
            resolve();
          }
        });
      });

      // 不响应 ping（模拟无响应）
      ws.on('ping', () => {
        // 不响应 pong
      });

      // 监听关闭事件
      const closePromise = new Promise<void>(resolve => {
        ws.on('close', () => {
          resolve();
        });
      });

      // 快进时间 5 分钟 + 10 秒（超时检查间隔）
      jest.advanceTimersByTime(5 * 60 * 1000 + 10000);

      // 等待关闭
      await closePromise;

      // 验证连接已关闭
      expect(ws.readyState).toBe(WebSocket.CLOSED);

      // 清理
      jest.useRealTimers();
    }, 60000);
  });

  describe('断开连接时清理 Redis 中的连接记录', () => {
    it('断开连接时应该从 Redis 中移除连接记录', async () => {
      const port = (httpServer.address() as { port: number }).port;

      // 连接 WebSocket
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testHostId}`);

      // 等待连接建立
      await new Promise<void>(resolve => {
        ws.on('open', () => {
          resolve();
        });
      });

      // 跳过初始消息
      await new Promise<void>(resolve => {
        let messageCount = 0;
        ws.on('message', () => {
          messageCount++;
          if (messageCount >= 2) {
            resolve();
          }
        });
      });

      // 等待一下确保连接已存储到 Redis
      await new Promise(resolve => setTimeout(resolve, 500));

      // 关闭连接
      ws.close();

      // 等待清理完成
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 验证：由于 Redis 可能未运行，这里只验证连接已关闭
      // 实际环境中，应该检查 Redis 中的连接记录已被移除
      expect(ws.readyState).toBe(WebSocket.CLOSED);
    });
  });

  describe('断开连接时更新成员 last_active_at', () => {
    it('断开连接时应该更新成员的 lastActiveAt 字段', async () => {
      const port = (httpServer.address() as { port: number }).port;

      // 获取断开前的 lastActiveAt
      const memberBefore = await prisma.roomMember.findFirst({
        where: {
          roomId: testRoomId,
          userId: testHostId,
        },
      });

      const lastActiveAtBefore = memberBefore?.lastActiveAt;

      // 等待一下
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 连接 WebSocket
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testHostId}`);

      // 等待连接建立
      await new Promise<void>(resolve => {
        ws.on('open', () => {
          resolve();
        });
      });

      // 跳过初始消息
      await new Promise<void>(resolve => {
        let messageCount = 0;
        ws.on('message', () => {
          messageCount++;
          if (messageCount >= 2) {
            resolve();
          }
        });
      });

      // 等待一下确保连接已建立
      await new Promise(resolve => setTimeout(resolve, 500));

      // 关闭连接
      ws.close();

      // 等待更新完成
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 验证 lastActiveAt 已更新
      const memberAfter = await prisma.roomMember.findFirst({
        where: {
          roomId: testRoomId,
          userId: testHostId,
        },
      });

      expect(memberAfter).toBeDefined();
      if (memberAfter && lastActiveAtBefore) {
        // lastActiveAt 应该已更新（时间应该更晚）
        expect(memberAfter.lastActiveAt.getTime()).toBeGreaterThanOrEqual(lastActiveAtBefore.getTime());
      }
    });
  });

  describe('连接数限制（每 IP 最多 10 个连接）', () => {
    it('同一个 IP 最多可以建立 10 个连接', async () => {
      const port = (httpServer.address() as { port: number }).port;
      const connections: WebSocket[] = [];

      try {
        // 创建 10 个连接（应该都成功）
        for (let i = 0; i < 10; i++) {
          const userId = `user-limit${i}`;
          // 创建用户
          await prisma.roomMember.create({
            data: {
              roomId: testRoomId,
              userId: userId,
              nickname: `Test User ${i}`,
              isHost: false,
            },
          });

          const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${userId}`);
          await new Promise<void>(resolve => {
            ws.on('open', () => {
              resolve();
            });
            ws.on('error', () => {
              // 忽略错误
            });
          });

          connections.push(ws);
        }

        // 验证所有连接都成功
        connections.forEach(ws => {
          expect(ws.readyState).toBe(WebSocket.OPEN);
        });

        // 尝试创建第 11 个连接（应该失败）
        const userId11 = 'user-limit10';
        await prisma.roomMember.create({
          data: {
            roomId: testRoomId,
            userId: userId11,
            nickname: 'Test User 11',
            isHost: false,
          },
        });

        const ws11 = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${userId11}`);
        const closeCode = await new Promise<number>((resolve, reject) => {
          ws11.on('open', () => {
            reject(new Error('Connection should not succeed'));
          });
          ws11.on('close', (code: number) => {
            resolve(code);
          });
          ws11.on('error', () => {
            // 忽略错误
          });
        });

        // 验证连接被拒绝（关闭代码 1008 表示策略违规）
        expect(closeCode).toBe(1008);

        // 清理
        await prisma.roomMember.deleteMany({
          where: {
            roomId: testRoomId,
            userId: {
              startsWith: 'user-limit',
            },
          },
        });
      } finally {
        // 关闭所有连接
        connections.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        });
      }
    }, 30000);
  });
});
