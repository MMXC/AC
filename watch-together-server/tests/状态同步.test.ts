/**
 * WebSocket 状态同步测试
 */

import { Server } from 'http';
import WebSocket from 'ws';
import { createApp } from '../src/app';
import { getPrismaClient } from '../src/db';
import { createWebSocketServer, closeWebSocketServer } from '../src/websocket';

describe('状态同步', () => {
  let httpServer: Server;
  const prisma = getPrismaClient();
  let testRoomId: string;
  let testUserId: string;
  let testHostId: string;

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
      testHostId = 'user-host456';
      testUserId = 'user-test456';
      testRoomId = 'room-test456';

      await prisma.room.create({
        data: {
          id: testRoomId,
          name: 'Test Room for Sync',
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
          userId: testUserId,
          nickname: 'Test User',
          isHost: false,
        },
      });

      // 创建一些测试消息
      await prisma.message.createMany({
        data: [
          {
            id: 'msg-msg001',
            roomId: testRoomId,
            userId: testHostId,
            nickname: 'Test Host',
            content: 'Hello, this is message 1',
          },
          {
            id: 'msg-msg002',
            roomId: testRoomId,
            userId: testUserId,
            nickname: 'Test User',
            content: 'Hello, this is message 2',
          },
          {
            id: 'msg-msg003',
            roomId: testRoomId,
            userId: testHostId,
            nickname: 'Test Host',
            content: 'Hello, this is message 3',
          },
        ],
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

  describe('连接建立时自动发送 SYNC_STATE 消息', () => {
    it('连接时应该立即收到 SYNC_STATE 消息', async () => {
      const port = (httpServer.address() as { port: number }).port;
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId}`);

      const messages: any[] = [];

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message timeout'));
        }, 10000);

        ws.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            messages.push(message);

            // 等待收到 SYNC_STATE 消息
            if (message.type === 'SYNC_STATE') {
              clearTimeout(timeout);
              ws.close();
              resolve();
            }
          } catch (error) {
            // 忽略解析错误
          }
        });

        ws.on('error', error => {
          clearTimeout(timeout);
          reject(error);
        });

        ws.on('open', () => {
          // 连接打开后，等待 SYNC_STATE 消息
        });
      });

      // 验证收到了 SYNC_STATE 消息
      const syncStateMessage = messages.find(msg => msg.type === 'SYNC_STATE');
      expect(syncStateMessage).toBeDefined();
      expect(syncStateMessage.type).toBe('SYNC_STATE');
    });
  });

  describe('消息包含当前 URL、成员列表、最近消息', () => {
    it('SYNC_STATE 消息应该包含所有必需字段', async () => {
      const port = (httpServer.address() as { port: number }).port;
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId}`);

      const syncStateMessage = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message timeout'));
        }, 10000);

        ws.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'SYNC_STATE') {
              clearTimeout(timeout);
              resolve(message);
            }
          } catch (error) {
            // 忽略解析错误
          }
        });

        ws.on('error', error => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // 验证消息格式
      expect(syncStateMessage.type).toBe('SYNC_STATE');
      expect(syncStateMessage.data).toBeDefined();
      expect(syncStateMessage.timestamp).toBeDefined();

      // 验证数据字段
      expect(syncStateMessage.data.currentUrl).toBeDefined();
      expect(syncStateMessage.data.members).toBeDefined();
      expect(Array.isArray(syncStateMessage.data.members)).toBe(true);
      expect(syncStateMessage.data.recentMessages).toBeDefined();
      expect(Array.isArray(syncStateMessage.data.recentMessages)).toBe(true);

      // 验证当前 URL
      expect(syncStateMessage.data.currentUrl).toBe('https://example.com');

      // 验证成员列表
      expect(syncStateMessage.data.members.length).toBeGreaterThan(0);
      const member = syncStateMessage.data.members.find((m: any) => m.userId === testUserId);
      expect(member).toBeDefined();
      expect(member.nickname).toBe('Test User');
      expect(member.isHost).toBe(false);
      expect(member.joinedAt).toBeDefined();

      // 验证最近消息
      expect(syncStateMessage.data.recentMessages.length).toBeGreaterThan(0);
      const message = syncStateMessage.data.recentMessages[0];
      expect(message.id).toBeDefined();
      expect(message.userId).toBeDefined();
      expect(message.nickname).toBeDefined();
      expect(message.content).toBeDefined();
      expect(message.timestamp).toBeDefined();

      ws.close();
    });

    it('成员列表应该包含所有未离开的成员', async () => {
      const port = (httpServer.address() as { port: number }).port;
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId}`);

      const syncStateMessage = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message timeout'));
        }, 10000);

        ws.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'SYNC_STATE') {
              clearTimeout(timeout);
              resolve(message);
            }
          } catch (error) {
            // 忽略解析错误
          }
        });

        ws.on('error', error => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // 验证成员列表包含房主和测试用户
      const members = syncStateMessage.data.members;
      expect(members.length).toBe(2);

      const hostMember = members.find((m: any) => m.userId === testHostId);
      expect(hostMember).toBeDefined();
      expect(hostMember.isHost).toBe(true);

      const userMember = members.find((m: any) => m.userId === testUserId);
      expect(userMember).toBeDefined();
      expect(userMember.isHost).toBe(false);

      ws.close();
    });

    it('最近消息应该按时间正序排列（最旧的在前）', async () => {
      const port = (httpServer.address() as { port: number }).port;
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId}`);

      const syncStateMessage = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message timeout'));
        }, 10000);

        ws.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'SYNC_STATE') {
              clearTimeout(timeout);
              resolve(message);
            }
          } catch (error) {
            // 忽略解析错误
          }
        });

        ws.on('error', error => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // 验证消息顺序
      const messages = syncStateMessage.data.recentMessages;
      if (messages.length > 1) {
        for (let i = 0; i < messages.length - 1; i++) {
          const currentTime = new Date(messages[i].timestamp).getTime();
          const nextTime = new Date(messages[i + 1].timestamp).getTime();
          expect(currentTime).toBeLessThanOrEqual(nextTime);
        }
      }

      ws.close();
    });
  });

  describe('客户端发送 SYNC_REQUEST 时响应 SYNC_STATE', () => {
    it('发送 SYNC_REQUEST 应该收到 SYNC_STATE 响应', async () => {
      const port = (httpServer.address() as { port: number }).port;
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId}`);

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
            // 已收到 CONNECTED 和初始 SYNC_STATE
            resolve();
          }
        });
      });

      // 发送 SYNC_REQUEST
      const syncRequest = {
        type: 'SYNC_REQUEST',
      };
      ws.send(JSON.stringify(syncRequest));

      // 等待 SYNC_STATE 响应
      const syncStateMessage = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('SYNC_STATE response timeout'));
        }, 5000);

        ws.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'SYNC_STATE') {
              clearTimeout(timeout);
              resolve(message);
            }
          } catch (error) {
            // 忽略解析错误
          }
        });

        ws.on('error', error => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // 验证响应
      expect(syncStateMessage.type).toBe('SYNC_STATE');
      expect(syncStateMessage.data).toBeDefined();
      expect(syncStateMessage.data.currentUrl).toBeDefined();
      expect(syncStateMessage.data.members).toBeDefined();
      expect(syncStateMessage.data.recentMessages).toBeDefined();

      ws.close();
    });

    it('多次发送 SYNC_REQUEST 应该每次都收到 SYNC_STATE 响应', async () => {
      const port = (httpServer.address() as { port: number }).port;
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId}`);

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

      // 发送多次 SYNC_REQUEST
      const syncRequest = {
        type: 'SYNC_REQUEST',
      };

      const responses: any[] = [];
      const messageHandler = (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'SYNC_STATE') {
            responses.push(message);
          }
        } catch (error) {
          // 忽略解析错误
        }
      };

      ws.on('message', messageHandler);

      // 发送第一个请求
      ws.send(JSON.stringify(syncRequest));
      await new Promise(resolve => setTimeout(resolve, 500));

      // 发送第二个请求
      ws.send(JSON.stringify(syncRequest));
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证收到了两次响应
      expect(responses.length).toBeGreaterThanOrEqual(2);

      ws.off('message', messageHandler);
      ws.close();
    });
  });

  describe('消息格式符合 WebSocket 协议规范', () => {
    it('SYNC_STATE 消息应该是有效的 JSON 格式', async () => {
      const port = (httpServer.address() as { port: number }).port;
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId}`);

      const syncStateMessage = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message timeout'));
        }, 10000);

        ws.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'SYNC_STATE') {
              clearTimeout(timeout);
              resolve(message);
            }
          } catch (error) {
            clearTimeout(timeout);
            reject(error);
          }
        });

        ws.on('error', error => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // 验证 JSON 格式
      expect(() => JSON.stringify(syncStateMessage)).not.toThrow();
      expect(syncStateMessage).toBeInstanceOf(Object);

      ws.close();
    });

    it('SYNC_STATE 消息应该包含 timestamp 字段', async () => {
      const port = (httpServer.address() as { port: number }).port;
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId}`);

      const syncStateMessage = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message timeout'));
        }, 10000);

        ws.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'SYNC_STATE') {
              clearTimeout(timeout);
              resolve(message);
            }
          } catch (error) {
            // 忽略解析错误
          }
        });

        ws.on('error', error => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // 验证 timestamp 字段
      expect(syncStateMessage.timestamp).toBeDefined();
      expect(typeof syncStateMessage.timestamp).toBe('string');
      // 验证是有效的 ISO 日期字符串
      expect(() => new Date(syncStateMessage.timestamp)).not.toThrow();
      expect(new Date(syncStateMessage.timestamp).toString()).not.toBe('Invalid Date');

      ws.close();
    });
  });

  describe('状态数据从数据库和 Redis 正确获取', () => {
    it('当前 URL 应该从数据库正确获取', async () => {
      // 更新房间的 URL
      await prisma.room.update({
        where: { id: testRoomId },
        data: { currentUrl: 'https://updated-example.com' },
      });

      const port = (httpServer.address() as { port: number }).port;
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId}`);

      const syncStateMessage = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message timeout'));
        }, 10000);

        ws.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'SYNC_STATE') {
              clearTimeout(timeout);
              resolve(message);
            }
          } catch (error) {
            // 忽略解析错误
          }
        });

        ws.on('error', error => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // 验证 URL 是最新的
      expect(syncStateMessage.data.currentUrl).toBe('https://updated-example.com');

      // 恢复原始 URL
      await prisma.room.update({
        where: { id: testRoomId },
        data: { currentUrl: 'https://example.com' },
      });

      ws.close();
    });

    it('成员列表应该从数据库正确获取', async () => {
      const port = (httpServer.address() as { port: number }).port;
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId}`);

      const syncStateMessage = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message timeout'));
        }, 10000);

        ws.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'SYNC_STATE') {
              clearTimeout(timeout);
              resolve(message);
            }
          } catch (error) {
            // 忽略解析错误
          }
        });

        ws.on('error', error => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // 验证成员列表与数据库一致
      const dbMembers = await prisma.roomMember.findMany({
        where: {
          roomId: testRoomId,
          leftAt: null,
        },
        orderBy: {
          joinedAt: 'asc',
        },
      });

      expect(syncStateMessage.data.members.length).toBe(dbMembers.length);

      // 验证每个成员的信息
      for (const dbMember of dbMembers) {
        const syncMember = syncStateMessage.data.members.find(
          (m: any) => m.userId === dbMember.userId
        );
        expect(syncMember).toBeDefined();
        expect(syncMember.nickname).toBe(dbMember.nickname);
        expect(syncMember.isHost).toBe(dbMember.isHost);
      }

      ws.close();
    });

    it('最近消息应该从数据库正确获取', async () => {
      const port = (httpServer.address() as { port: number }).port;
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId}`);

      const syncStateMessage = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message timeout'));
        }, 10000);

        ws.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'SYNC_STATE') {
              clearTimeout(timeout);
              resolve(message);
            }
          } catch (error) {
            // 忽略解析错误
          }
        });

        ws.on('error', error => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // 验证消息列表与数据库一致（最多 50 条）
      const dbMessages = await prisma.message.findMany({
        where: {
          roomId: testRoomId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      });

      // 反转回时间正序
      dbMessages.reverse();

      expect(syncStateMessage.data.recentMessages.length).toBe(dbMessages.length);

      // 验证每条消息的信息
      for (let i = 0; i < dbMessages.length; i++) {
        const dbMessage = dbMessages[i];
        const syncMessage = syncStateMessage.data.recentMessages[i];
        expect(syncMessage.id).toBe(dbMessage.id);
        expect(syncMessage.userId).toBe(dbMessage.userId);
        expect(syncMessage.nickname).toBe(dbMessage.nickname);
        expect(syncMessage.content).toBe(dbMessage.content);
      }

      ws.close();
    });
  });
});
