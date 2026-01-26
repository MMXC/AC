/**
 * WebSocket 聊天消息测试
 */

import { Server } from 'http';
import WebSocket from 'ws';
import { createApp } from '../src/app';
import { getPrismaClient } from '../src/db';
import { createWebSocketServer, closeWebSocketServer } from '../src/websocket';

describe('聊天消息', () => {
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
      testHostId = 'user-host999';
      testUserId1 = 'user-test999';
      testUserId2 = 'user-test998';
      testRoomId = 'room-test999';

      await prisma.room.create({
        data: {
          id: testRoomId,
          name: 'Test Room for Chat Messages',
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

  describe('客户端发送 CHAT_MESSAGE 可以成功接收', () => {
    it('应该能够接收并处理 CHAT_MESSAGE 消息', async () => {
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

      // 发送 CHAT_MESSAGE
      const chatMessage = {
        type: 'CHAT_MESSAGE',
        userId: testHostId,
        nickname: 'Test Host',
        content: 'Hello, this is a test message',
      };

      ws.send(JSON.stringify(chatMessage));

      // 等待收到 CHAT_MESSAGE 响应
      const response = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('CHAT_MESSAGE response timeout'));
        }, 10000);

        ws.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'CHAT_MESSAGE') {
              clearTimeout(timeout);
              resolve(message);
            } else if (message.type === 'ERROR') {
              clearTimeout(timeout);
              reject(new Error(message.error));
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

      // 验证响应格式
      expect(response.type).toBe('CHAT_MESSAGE');
      expect(response.data).toBeDefined();
      expect(response.data.id).toBeDefined();
      expect(response.data.userId).toBe(testHostId);
      expect(response.data.nickname).toBe('Test Host');
      expect(response.data.content).toBe('Hello, this is a test message');
      expect(response.data.timestamp).toBeDefined();
      expect(response.timestamp).toBeDefined();

      // 关闭连接
      ws.close();
    });
  });

  describe('消息保存到数据库', () => {
    it('发送的消息应该保存到数据库', async () => {
      const port = (httpServer.address() as { port: number }).port;

      // 连接 WebSocket
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId1}`);

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

      // 发送 CHAT_MESSAGE
      const testContent = `Test message ${Date.now()}`;
      const chatMessage = {
        type: 'CHAT_MESSAGE',
        userId: testUserId1,
        nickname: 'Test User 1',
        content: testContent,
      };

      ws.send(JSON.stringify(chatMessage));

      // 等待消息处理
      await new Promise<void>(resolve => {
        ws.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'CHAT_MESSAGE' && message.data.content === testContent) {
              resolve();
            }
          } catch (error) {
            // 忽略解析错误
          }
        });
      });

      // 验证消息已保存到数据库
      const savedMessage = await prisma.message.findFirst({
        where: {
          roomId: testRoomId,
          content: testContent,
        },
      });

      expect(savedMessage).toBeDefined();
      expect(savedMessage?.userId).toBe(testUserId1);
      expect(savedMessage?.nickname).toBe('Test User 1');
      expect(savedMessage?.content).toBe(testContent);
      expect(savedMessage?.id).toBeDefined();
      expect(savedMessage?.createdAt).toBeDefined();

      // 关闭连接
      ws.close();
    });
  });

  describe('消息广播给房间内所有成员', () => {
    it('发送的消息应该广播给房间内所有成员', async () => {
      const port = (httpServer.address() as { port: number }).port;

      // 连接多个 WebSocket
      const hostWs = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testHostId}`);
      const user1Ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId1}`);
      const user2Ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId2}`);

      // 等待所有连接建立
      await Promise.all([
        new Promise<void>(resolve => {
          hostWs.on('open', () => resolve());
        }),
        new Promise<void>(resolve => {
          user1Ws.on('open', () => resolve());
        }),
        new Promise<void>(resolve => {
          user2Ws.on('open', () => resolve());
        }),
      ]);

      // 跳过初始的 CONNECTED 和 SYNC_STATE 消息
      await Promise.all([
        new Promise<void>(resolve => {
          let messageCount = 0;
          hostWs.on('message', () => {
            messageCount++;
            if (messageCount >= 2) {
              resolve();
            }
          });
        }),
        new Promise<void>(resolve => {
          let messageCount = 0;
          user1Ws.on('message', () => {
            messageCount++;
            if (messageCount >= 2) {
              resolve();
            }
          });
        }),
        new Promise<void>(resolve => {
          let messageCount = 0;
          user2Ws.on('message', () => {
            messageCount++;
            if (messageCount >= 2) {
              resolve();
            }
          });
        }),
      ]);

      // 等待所有成员加入完成（MEMBER_JOINED 消息）
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 收集所有消息
      const hostMessages: any[] = [];
      const user1Messages: any[] = [];
      const user2Messages: any[] = [];

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

      user2Ws.on('message', data => {
        try {
          const message = JSON.parse(data.toString());
          user2Messages.push(message);
        } catch (error) {
          // 忽略解析错误
        }
      });

      // 发送 CHAT_MESSAGE（从 host 发送）
      const testContent = `Broadcast test message ${Date.now()}`;
      const chatMessage = {
        type: 'CHAT_MESSAGE',
        userId: testHostId,
        nickname: 'Test Host',
        content: testContent,
      };

      hostWs.send(JSON.stringify(chatMessage));

      // 等待消息广播
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 验证所有成员都收到了消息
      const hostReceived = hostMessages.find(
        (msg: any) => msg.type === 'CHAT_MESSAGE' && msg.data.content === testContent
      );
      const user1Received = user1Messages.find(
        (msg: any) => msg.type === 'CHAT_MESSAGE' && msg.data.content === testContent
      );
      const user2Received = user2Messages.find(
        (msg: any) => msg.type === 'CHAT_MESSAGE' && msg.data.content === testContent
      );

      expect(hostReceived).toBeDefined();
      expect(user1Received).toBeDefined();
      expect(user2Received).toBeDefined();

      // 验证消息内容一致
      expect(hostReceived.data.id).toBe(user1Received.data.id);
      expect(hostReceived.data.id).toBe(user2Received.data.id);
      expect(hostReceived.data.userId).toBe(testHostId);
      expect(hostReceived.data.nickname).toBe('Test Host');
      expect(hostReceived.data.content).toBe(testContent);

      // 关闭所有连接
      hostWs.close();
      user1Ws.close();
      user2Ws.close();
    });
  });

  describe('消息格式验证（内容长度、必需字段）', () => {
    it('缺少 userId 应该返回错误', async () => {
      const port = (httpServer.address() as { port: number }).port;

      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testHostId}`);

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

      // 发送缺少 userId 的消息
      ws.send(
        JSON.stringify({
          type: 'CHAT_MESSAGE',
          nickname: 'Test Host',
          content: 'Hello',
        })
      );

      const errorResponse = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Error response timeout'));
        }, 10000);

        ws.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'ERROR') {
              clearTimeout(timeout);
              resolve(message);
            }
          } catch (error) {
            // 忽略解析错误
          }
        });
      });

      expect(errorResponse.type).toBe('ERROR');
      expect(errorResponse.error).toContain('userId');

      ws.close();
    });

    it('缺少 nickname 应该返回错误', async () => {
      const port = (httpServer.address() as { port: number }).port;

      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testHostId}`);

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

      // 发送缺少 nickname 的消息
      ws.send(
        JSON.stringify({
          type: 'CHAT_MESSAGE',
          userId: testHostId,
          content: 'Hello',
        })
      );

      const errorResponse = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Error response timeout'));
        }, 10000);

        ws.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'ERROR') {
              clearTimeout(timeout);
              resolve(message);
            }
          } catch (error) {
            // 忽略解析错误
          }
        });
      });

      expect(errorResponse.type).toBe('ERROR');
      expect(errorResponse.error).toContain('nickname');

      ws.close();
    });

    it('缺少 content 应该返回错误', async () => {
      const port = (httpServer.address() as { port: number }).port;

      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testHostId}`);

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

      // 发送缺少 content 的消息
      ws.send(
        JSON.stringify({
          type: 'CHAT_MESSAGE',
          userId: testHostId,
          nickname: 'Test Host',
        })
      );

      const errorResponse = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Error response timeout'));
        }, 10000);

        ws.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'ERROR') {
              clearTimeout(timeout);
              resolve(message);
            }
          } catch (error) {
            // 忽略解析错误
          }
        });
      });

      expect(errorResponse.type).toBe('ERROR');
      expect(errorResponse.error).toContain('content');

      ws.close();
    });

    it('内容超过 1000 字符应该返回错误', async () => {
      const port = (httpServer.address() as { port: number }).port;

      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testHostId}`);

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

      // 发送超过 1000 字符的内容
      const longContent = 'a'.repeat(1001);
      ws.send(
        JSON.stringify({
          type: 'CHAT_MESSAGE',
          userId: testHostId,
          nickname: 'Test Host',
          content: longContent,
        })
      );

      const errorResponse = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Error response timeout'));
        }, 10000);

        ws.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'ERROR') {
              clearTimeout(timeout);
              resolve(message);
            }
          } catch (error) {
            // 忽略解析错误
          }
        });
      });

      expect(errorResponse.type).toBe('ERROR');
      expect(errorResponse.error).toContain('1000');

      ws.close();
    });

    it('内容为空应该返回错误', async () => {
      const port = (httpServer.address() as { port: number }).port;

      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testHostId}`);

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

      // 发送空内容
      ws.send(
        JSON.stringify({
          type: 'CHAT_MESSAGE',
          userId: testHostId,
          nickname: 'Test Host',
          content: '   ', // 只有空格
        })
      );

      const errorResponse = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Error response timeout'));
        }, 10000);

        ws.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'ERROR') {
              clearTimeout(timeout);
              resolve(message);
            }
          } catch (error) {
            // 忽略解析错误
          }
        });
      });

      expect(errorResponse.type).toBe('ERROR');
      expect(errorResponse.error).toContain('empty');

      ws.close();
    });

    it('userId 不匹配应该返回错误', async () => {
      const port = (httpServer.address() as { port: number }).port;

      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testHostId}`);

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

      // 发送 userId 不匹配的消息
      ws.send(
        JSON.stringify({
          type: 'CHAT_MESSAGE',
          userId: testUserId1, // 不匹配连接的 userId
          nickname: 'Test Host',
          content: 'Hello',
        })
      );

      const errorResponse = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Error response timeout'));
        }, 10000);

        ws.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'ERROR') {
              clearTimeout(timeout);
              resolve(message);
            }
          } catch (error) {
            // 忽略解析错误
          }
        });
      });

      expect(errorResponse.type).toBe('ERROR');
      expect(errorResponse.error).toContain('userId does not match');

      ws.close();
    });
  });

  describe('消息包含时间戳和唯一 ID', () => {
    it('消息应该包含唯一 ID 和时间戳', async () => {
      const port = (httpServer.address() as { port: number }).port;

      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testHostId}`);

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

      // 发送消息
      const chatMessage = {
        type: 'CHAT_MESSAGE',
        userId: testHostId,
        nickname: 'Test Host',
        content: 'Test message with ID and timestamp',
      };

      ws.send(JSON.stringify(chatMessage));

      // 等待响应
      const response = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Response timeout'));
        }, 10000);

        ws.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'CHAT_MESSAGE' && message.data.content === chatMessage.content) {
              clearTimeout(timeout);
              resolve(message);
            }
          } catch (error) {
            // 忽略解析错误
          }
        });
      });

      // 验证消息包含唯一 ID
      expect(response.data.id).toBeDefined();
      expect(typeof response.data.id).toBe('string');
      expect(response.data.id.length).toBeGreaterThan(0);
      expect(response.data.id).toMatch(/^msg-[a-z0-9]{8}$/);

      // 验证消息包含时间戳
      expect(response.data.timestamp).toBeDefined();
      expect(typeof response.data.timestamp).toBe('string');
      expect(new Date(response.data.timestamp).getTime()).toBeGreaterThan(0);

      // 验证消息对象也包含时间戳
      expect(response.timestamp).toBeDefined();
      expect(typeof response.timestamp).toBe('string');
      expect(new Date(response.timestamp).getTime()).toBeGreaterThan(0);

      // 验证数据库中的消息也有 ID 和时间戳
      const savedMessage = await prisma.message.findFirst({
        where: {
          id: response.data.id,
        },
      });

      expect(savedMessage).toBeDefined();
      expect(savedMessage?.id).toBe(response.data.id);
      expect(savedMessage?.createdAt).toBeDefined();

      ws.close();
    });

    it('不同消息应该有不同 ID', async () => {
      const port = (httpServer.address() as { port: number }).port;

      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testHostId}`);

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

      // 发送第一条消息
      const message1 = {
        type: 'CHAT_MESSAGE',
        userId: testHostId,
        nickname: 'Test Host',
        content: 'First message',
      };

      ws.send(JSON.stringify(message1));

      const response1 = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Response timeout'));
        }, 10000);

        ws.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'CHAT_MESSAGE' && message.data.content === message1.content) {
              clearTimeout(timeout);
              resolve(message);
            }
          } catch (error) {
            // 忽略解析错误
          }
        });
      });

      // 等待一段时间
      await new Promise(resolve => setTimeout(resolve, 500));

      // 发送第二条消息
      const message2 = {
        type: 'CHAT_MESSAGE',
        userId: testHostId,
        nickname: 'Test Host',
        content: 'Second message',
      };

      ws.send(JSON.stringify(message2));

      const response2 = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Response timeout'));
        }, 10000);

        ws.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'CHAT_MESSAGE' && message.data.content === message2.content) {
              clearTimeout(timeout);
              resolve(message);
            }
          } catch (error) {
            // 忽略解析错误
          }
        });
      });

      // 验证两条消息的 ID 不同
      expect(response1.data.id).toBeDefined();
      expect(response2.data.id).toBeDefined();
      expect(response1.data.id).not.toBe(response2.data.id);

      ws.close();
    });
  });
});
