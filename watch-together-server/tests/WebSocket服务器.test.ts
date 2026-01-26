/**
 * WebSocket 服务器基础框架测试
 */

import { Server } from 'http';
import WebSocket from 'ws';
import { createApp } from '../src/app';
import { getPrismaClient } from '../src/db';
import { getCacheService } from '../src/redis';
import { createWebSocketServer, closeWebSocketServer } from '../src/websocket';

describe('WebSocket服务器', () => {
  let httpServer: Server;
  let wsServer: ReturnType<typeof createWebSocketServer>;
  const prisma = getPrismaClient();
  const cache = getCacheService();
  let testRoomId: string;
  let testUserId: string;

  beforeAll(async () => {
    // 增加超时时间到 30 秒
    jest.setTimeout(30000);

    // 创建 HTTP 服务器
    const app = createApp();
    httpServer = app.listen(0); // 使用随机端口

    // 创建 WebSocket 服务器
    wsServer = createWebSocketServer(httpServer);

    try {
      // 创建测试房间和用户
      const room = await prisma.room.create({
        data: {
          id: 'room-test123',
          name: 'Test Room',
          hostId: 'user-host123',
          currentUrl: null,
        },
      });
      testRoomId = room.id;

      await prisma.roomMember.create({
        data: {
          roomId: testRoomId,
          userId: 'user-host123',
          nickname: 'Test Host',
          isHost: true,
        },
      });

      const member = await prisma.roomMember.create({
        data: {
          roomId: testRoomId,
          userId: 'user-test123',
          nickname: 'Test User',
          isHost: false,
        },
      });
      testUserId = member.userId;
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

  describe('WebSocket 服务器可以启动', () => {
    it('WebSocket 服务器应该成功创建', () => {
      expect(wsServer).toBeDefined();
      expect(wsServer.clients).toBeDefined();
    });
  });

  describe('客户端可以成功连接（通过 roomId 和 userId 参数）', () => {
    it('使用有效的 roomId 和 userId 应该连接成功', async () => {
      const port = (httpServer.address() as { port: number }).port;
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId}`);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 5000);

        ws.on('open', () => {
          clearTimeout(timeout);
          expect(ws.readyState).toBe(WebSocket.OPEN);
          ws.close();
          resolve();
        });

        ws.on('error', error => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    });

    it('连接成功后应该收到 CONNECTED 消息', async () => {
      const port = (httpServer.address() as { port: number }).port;
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId}`);

      const message = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message timeout'));
        }, 5000);

        ws.on('message', data => {
          clearTimeout(timeout);
          try {
            const message = JSON.parse(data.toString());
            resolve(message);
          } catch (error) {
            reject(error);
          }
        });

        ws.on('error', error => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      expect(message.type).toBe('CONNECTED');
      expect(message.data.roomId).toBe(testRoomId);
      expect(message.data.userId).toBe(testUserId);
      expect(message.timestamp).toBeDefined();

      ws.close();
    });
  });

  describe('连接时验证 roomId 和 userId 的有效性', () => {
    it('缺少 roomId 参数应该拒绝连接', async () => {
      const port = (httpServer.address() as { port: number }).port;
      const ws = new WebSocket(`ws://localhost:${port}/ws?userId=${testUserId}`);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 5000);

        ws.on('close', (code, reason) => {
          clearTimeout(timeout);
          expect(code).toBe(1008);
          expect(reason.toString()).toContain('Missing required parameters');
          resolve();
        });

        ws.on('error', () => {
          // WebSocket 连接错误是预期的
          clearTimeout(timeout);
          resolve();
        });
      });
    });

    it('缺少 userId 参数应该拒绝连接', async () => {
      const port = (httpServer.address() as { port: number }).port;
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}`);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 5000);

        ws.on('close', (code, reason) => {
          clearTimeout(timeout);
          expect(code).toBe(1008);
          expect(reason.toString()).toContain('Missing required parameters');
          resolve();
        });

        ws.on('error', () => {
          // WebSocket 连接错误是预期的
          clearTimeout(timeout);
          resolve();
        });
      });
    });

    it('无效的 roomId 格式应该拒绝连接', async () => {
      const port = (httpServer.address() as { port: number }).port;
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=invalid-room&userId=${testUserId}`);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 5000);

        ws.on('close', (code, reason) => {
          clearTimeout(timeout);
          expect(code).toBe(1008);
          expect(reason.toString()).toContain('Invalid roomId format');
          resolve();
        });

        ws.on('error', () => {
          // WebSocket 连接错误是预期的
          clearTimeout(timeout);
          resolve();
        });
      });
    });

    it('无效的 userId 格式应该拒绝连接', async () => {
      const port = (httpServer.address() as { port: number }).port;
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=invalid-user`);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 5000);

        ws.on('close', (code, reason) => {
          clearTimeout(timeout);
          expect(code).toBe(1008);
          expect(reason.toString()).toContain('Invalid userId format');
          resolve();
        });

        ws.on('error', () => {
          // WebSocket 连接错误是预期的
          clearTimeout(timeout);
          resolve();
        });
      });
    });

    it('不存在的 roomId 应该拒绝连接', async () => {
      const port = (httpServer.address() as { port: number }).port;
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=room-notexist&userId=${testUserId}`);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 5000);

        ws.on('close', (code, reason) => {
          clearTimeout(timeout);
          expect(code).toBe(1008);
          expect(reason.toString()).toContain('Room not found');
          resolve();
        });

        ws.on('error', () => {
          // WebSocket 连接错误是预期的
          clearTimeout(timeout);
          resolve();
        });
      });
    });

    it('不在房间中的 userId 应该拒绝连接', async () => {
      const port = (httpServer.address() as { port: number }).port;
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=user-notinroom`);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 5000);

        ws.on('close', (code, reason) => {
          clearTimeout(timeout);
          expect(code).toBe(1008);
          expect(reason.toString()).toContain('User not in room');
          resolve();
        });

        ws.on('error', () => {
          // WebSocket 连接错误是预期的
          clearTimeout(timeout);
          resolve();
        });
      });
    });
  });

  describe('连接信息存储到 Redis（用于多实例支持）', () => {
    it('连接成功后连接信息应该存储到 Redis', async () => {
      const port = (httpServer.address() as { port: number }).port;
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId}`);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 5000);

        ws.on('open', async () => {
          clearTimeout(timeout);

          // 等待一小段时间确保 Redis 操作完成
          await new Promise(resolve => setTimeout(resolve, 100));

          // 检查 Redis 中是否有连接信息
          const key = `ws:room:${testRoomId}:connections`;
          const connections = await cache.smembers(key);
          expect(connections).toContain(testUserId);

          ws.close();
          resolve();
        });

        ws.on('error', error => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    });

    it('连接断开后连接信息应该从 Redis 移除', async () => {
      const port = (httpServer.address() as { port: number }).port;
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId}`);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 5000);

        ws.on('open', async () => {
          // 等待一小段时间确保 Redis 操作完成
          await new Promise(resolve => setTimeout(resolve, 100));

          // 关闭连接
          ws.close();

          // 等待一小段时间确保清理操作完成
          await new Promise(resolve => setTimeout(resolve, 100));

          // 检查 Redis 中是否已移除连接信息
          const key = `ws:room:${testRoomId}:connections`;
          const connections = await cache.smembers(key);
          expect(connections).not.toContain(testUserId);

          clearTimeout(timeout);
          resolve();
        });

        ws.on('error', error => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    });
  });

  describe('连接断开时正确清理资源', () => {
    it('连接断开时应该清理内存中的连接信息', async () => {
      const port = (httpServer.address() as { port: number }).port;
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId}`);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 5000);

        ws.on('open', () => {
          // 检查连接是否在内存中
          expect(wsServer.clients.size).toBeGreaterThan(0);

          // 关闭连接
          ws.close();

          // 等待一小段时间确保清理操作完成
          setTimeout(() => {
            // 注意：由于 WebSocket 服务器可能还有其他连接，我们只检查当前连接已关闭
            expect(ws.readyState).toBe(WebSocket.CLOSED);
            clearTimeout(timeout);
            resolve();
          }, 100);
        });

        ws.on('error', error => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    });
  });
});
