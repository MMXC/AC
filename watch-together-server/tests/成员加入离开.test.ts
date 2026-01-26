/**
 * WebSocket 成员加入和离开测试
 */

import { Server } from 'http';
import WebSocket from 'ws';
import { createApp } from '../src/app';
import { getPrismaClient } from '../src/db';
import { createWebSocketServer, closeWebSocketServer } from '../src/websocket';

describe('成员加入离开', () => {
  let httpServer: Server;
  const prisma = getPrismaClient();
  let testRoomId: string;
  let testHostId: string;
  let testUserId1: string;
  let testUserId2: string;

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
      testHostId = 'user-host789';
      testUserId1 = 'user-test789';
      testUserId2 = 'user-test790';
      testRoomId = 'room-test789';

      await prisma.room.create({
        data: {
          id: testRoomId,
          name: 'Test Room for Member Join/Leave',
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

      await prisma.roomMember.create({
        data: {
          roomId: testRoomId,
          userId: testUserId2,
          nickname: 'Test User 2',
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

  describe('新成员加入时广播 MEMBER_JOINED 消息', () => {
    it('新成员加入时，现有成员应该收到 MEMBER_JOINED 消息', async () => {
      const port = (httpServer.address() as { port: number }).port;

      // 第一个成员连接（房主）
      const hostWs = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testHostId}`);

      // 等待连接建立
      await new Promise<void>(resolve => {
        hostWs.on('open', () => {
          resolve();
        });
      });

      // 跳过初始的 CONNECTED 和 SYNC_STATE 消息
      await new Promise<void>(resolve => {
        let messageCount = 0;
        hostWs.on('message', () => {
          messageCount++;
          if (messageCount >= 2) {
            resolve();
          }
        });
      });

      // 第二个成员连接（应该触发 MEMBER_JOINED 广播）
      const user1Ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId1}`);

      // 等待收到 MEMBER_JOINED 消息
      const memberJoinedMessage = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('MEMBER_JOINED message timeout'));
        }, 10000);

        hostWs.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'MEMBER_JOINED') {
              clearTimeout(timeout);
              resolve(message);
            }
          } catch (error) {
            // 忽略解析错误
          }
        });

        hostWs.on('error', error => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // 验证消息格式
      expect(memberJoinedMessage.type).toBe('MEMBER_JOINED');
      expect(memberJoinedMessage.data).toBeDefined();
      expect(memberJoinedMessage.data.userId).toBe(testUserId1);
      expect(memberJoinedMessage.data.nickname).toBe('Test User 1');
      expect(memberJoinedMessage.data.isHost).toBe(false);
      expect(memberJoinedMessage.data.joinedAt).toBeDefined();
      expect(memberJoinedMessage.timestamp).toBeDefined();

      // 关闭连接
      hostWs.close();
      user1Ws.close();
    });

    it('新成员加入时，不应该收到自己的 MEMBER_JOINED 消息', async () => {
      const port = (httpServer.address() as { port: number }).port;

      // 第一个成员连接（房主）
      const hostWs = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testHostId}`);

      // 等待连接建立
      await new Promise<void>(resolve => {
        hostWs.on('open', () => {
          resolve();
        });
      });

      // 跳过初始的 CONNECTED 和 SYNC_STATE 消息
      await new Promise<void>(resolve => {
        let messageCount = 0;
        hostWs.on('message', () => {
          messageCount++;
          if (messageCount >= 2) {
            resolve();
          }
        });
      });

      // 第二个成员连接
      const user1Ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId1}`);

      // 等待连接建立
      await new Promise<void>(resolve => {
        user1Ws.on('open', () => {
          resolve();
        });
      });

      // 收集 user1Ws 收到的所有消息
      const user1Messages: any[] = [];
      user1Ws.on('message', data => {
        try {
          const message = JSON.parse(data.toString());
          user1Messages.push(message);
        } catch (error) {
          // 忽略解析错误
        }
      });

      // 等待一段时间确保消息已发送
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 验证 user1Ws 没有收到自己的 MEMBER_JOINED 消息
      const memberJoinedMessages = user1Messages.filter(msg => msg.type === 'MEMBER_JOINED');
      const selfMemberJoined = memberJoinedMessages.find(
        (msg: any) => msg.data.userId === testUserId1
      );
      expect(selfMemberJoined).toBeUndefined();

      // 关闭连接
      hostWs.close();
      user1Ws.close();
    });
  });

  describe('成员离开时广播 MEMBER_LEFT 消息', () => {
    it('成员离开时，其他成员应该收到 MEMBER_LEFT 消息', async () => {
      const port = (httpServer.address() as { port: number }).port;

      // 第一个成员连接（房主）
      const hostWs = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testHostId}`);

      // 等待连接建立
      await new Promise<void>(resolve => {
        hostWs.on('open', () => {
          resolve();
        });
      });

      // 跳过初始的 CONNECTED 和 SYNC_STATE 消息
      await new Promise<void>(resolve => {
        let messageCount = 0;
        hostWs.on('message', () => {
          messageCount++;
          if (messageCount >= 2) {
            resolve();
          }
        });
      });

      // 第二个成员连接
      const user1Ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId1}`);

      // 等待连接建立和 MEMBER_JOINED 消息
      await new Promise<void>(resolve => {
        let messageCount = 0;
        hostWs.on('message', () => {
          messageCount++;
          if (messageCount >= 3) {
            // CONNECTED, SYNC_STATE, MEMBER_JOINED
            resolve();
          }
        });
      });

      // 关闭第二个成员的连接（应该触发 MEMBER_LEFT 广播）
      user1Ws.close();

      // 等待收到 MEMBER_LEFT 消息
      const memberLeftMessage = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('MEMBER_LEFT message timeout'));
        }, 10000);

        hostWs.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'MEMBER_LEFT') {
              clearTimeout(timeout);
              resolve(message);
            }
          } catch (error) {
            // 忽略解析错误
          }
        });

        hostWs.on('error', error => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // 验证消息格式
      expect(memberLeftMessage.type).toBe('MEMBER_LEFT');
      expect(memberLeftMessage.data).toBeDefined();
      expect(memberLeftMessage.data.userId).toBe(testUserId1);
      expect(memberLeftMessage.data.nickname).toBe('Test User 1');
      expect(memberLeftMessage.data.isHost).toBe(false);
      expect(memberLeftMessage.timestamp).toBeDefined();

      // 关闭连接
      hostWs.close();
    });

    it('成员离开时，不应该收到自己的 MEMBER_LEFT 消息', async () => {
      const port = (httpServer.address() as { port: number }).port;

      // 第一个成员连接（房主）
      const hostWs = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testHostId}`);

      // 等待连接建立
      await new Promise<void>(resolve => {
        hostWs.on('open', () => {
          resolve();
        });
      });

      // 跳过初始的 CONNECTED 和 SYNC_STATE 消息
      await new Promise<void>(resolve => {
        let messageCount = 0;
        hostWs.on('message', () => {
          messageCount++;
          if (messageCount >= 2) {
            resolve();
          }
        });
      });

      // 第二个成员连接
      const user1Ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId1}`);

      // 等待连接建立
      await new Promise<void>(resolve => {
        user1Ws.on('open', () => {
          resolve();
        });
      });

      // 收集 user1Ws 收到的所有消息
      const user1Messages: any[] = [];
      user1Ws.on('message', data => {
        try {
          const message = JSON.parse(data.toString());
          user1Messages.push(message);
        } catch (error) {
          // 忽略解析错误
        }
      });

      // 关闭 user1Ws 连接
      user1Ws.close();

      // 等待一段时间确保消息已发送
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 验证 user1Ws 没有收到自己的 MEMBER_LEFT 消息
      const memberLeftMessages = user1Messages.filter(msg => msg.type === 'MEMBER_LEFT');
      const selfMemberLeft = memberLeftMessages.find((msg: any) => msg.data.userId === testUserId1);
      expect(selfMemberLeft).toBeUndefined();

      // 关闭连接
      hostWs.close();
    });
  });

  describe('消息只发送给同一房间的其他成员', () => {
    it('多个成员在房间中，新成员加入时所有现有成员都应该收到消息', async () => {
      const port = (httpServer.address() as { port: number }).port;

      // 第一个成员连接（房主）
      const hostWs = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testHostId}`);

      // 等待连接建立
      await new Promise<void>(resolve => {
        hostWs.on('open', () => {
          resolve();
        });
      });

      // 跳过初始的 CONNECTED 和 SYNC_STATE 消息
      await new Promise<void>(resolve => {
        let messageCount = 0;
        hostWs.on('message', () => {
          messageCount++;
          if (messageCount >= 2) {
            resolve();
          }
        });
      });

      // 第二个成员连接
      const user1Ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId1}`);

      // 等待连接建立和 MEMBER_JOINED 消息
      await new Promise<void>(resolve => {
        let messageCount = 0;
        hostWs.on('message', () => {
          messageCount++;
          if (messageCount >= 3) {
            // CONNECTED, SYNC_STATE, MEMBER_JOINED
            resolve();
          }
        });
      });

      // 第三个成员连接（应该触发 MEMBER_JOINED 广播给 host 和 user1）
      const user2Ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId2}`);

      // 等待 host 和 user1 都收到 MEMBER_JOINED 消息
      const hostMessages: any[] = [];
      const user1Messages: any[] = [];

      hostWs.on('message', data => {
        try {
          const message = JSON.parse(data.toString());
          hostMessages.push(message);
        } catch (error) {
          // 忽略解析错误
        }
      });

      user1Ws.on('message', data => {
        try {
          const message = JSON.parse(data.toString());
          user1Messages.push(message);
        } catch (error) {
          // 忽略解析错误
        }
      });

      // 等待消息
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 验证 host 收到了 MEMBER_JOINED 消息
      const hostMemberJoined = hostMessages.find(
        (msg: any) => msg.type === 'MEMBER_JOINED' && msg.data.userId === testUserId2
      );
      expect(hostMemberJoined).toBeDefined();

      // 验证 user1 收到了 MEMBER_JOINED 消息
      const user1MemberJoined = user1Messages.find(
        (msg: any) => msg.type === 'MEMBER_JOINED' && msg.data.userId === testUserId2
      );
      expect(user1MemberJoined).toBeDefined();

      // 关闭连接
      hostWs.close();
      user1Ws.close();
      user2Ws.close();
    });
  });

  describe('断开连接时自动触发 MEMBER_LEFT', () => {
    it('WebSocket 连接断开时应该自动触发 MEMBER_LEFT 消息', async () => {
      const port = (httpServer.address() as { port: number }).port;

      // 第一个成员连接（房主）
      const hostWs = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testHostId}`);

      // 等待连接建立
      await new Promise<void>(resolve => {
        hostWs.on('open', () => {
          resolve();
        });
      });

      // 跳过初始的 CONNECTED 和 SYNC_STATE 消息
      await new Promise<void>(resolve => {
        let messageCount = 0;
        hostWs.on('message', () => {
          messageCount++;
          if (messageCount >= 2) {
            resolve();
          }
        });
      });

      // 第二个成员连接
      const user1Ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId1}`);

      // 等待连接建立和 MEMBER_JOINED 消息
      await new Promise<void>(resolve => {
        let messageCount = 0;
        hostWs.on('message', () => {
          messageCount++;
          if (messageCount >= 3) {
            // CONNECTED, SYNC_STATE, MEMBER_JOINED
            resolve();
          }
        });
      });

      // 直接关闭连接（不调用 leave API）
      user1Ws.close();

      // 等待收到 MEMBER_LEFT 消息
      const memberLeftMessage = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('MEMBER_LEFT message timeout'));
        }, 10000);

        hostWs.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'MEMBER_LEFT') {
              clearTimeout(timeout);
              resolve(message);
            }
          } catch (error) {
            // 忽略解析错误
          }
        });

        hostWs.on('error', error => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // 验证消息格式
      expect(memberLeftMessage.type).toBe('MEMBER_LEFT');
      expect(memberLeftMessage.data.userId).toBe(testUserId1);

      // 关闭连接
      hostWs.close();
    });
  });
});
