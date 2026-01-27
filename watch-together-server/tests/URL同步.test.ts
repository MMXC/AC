/**
 * WebSocket URL 同步测试
 */

import { Server } from 'http';
import WebSocket from 'ws';
import { createApp } from '../src/app';
import { getPrismaClient } from '../src/db';
import { createWebSocketServer, closeWebSocketServer } from '../src/websocket';

describe('URL同步', () => {
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
      testHostId = 'user-host888';
      testUserId1 = 'user-test888';
      testUserId2 = 'user-test887';
      testRoomId = 'room-test888';

      await prisma.room.create({
        data: {
          id: testRoomId,
          name: 'Test Room for URL Sync',
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
        await prisma.roomEvent.deleteMany({
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

  describe('客户端发送 URL_CHANGE 可以成功接收', () => {
    it('应该能够接收并处理 URL_CHANGE 消息', async () => {
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

      // 发送 URL_CHANGE
      const urlChangeMessage = {
        type: 'URL_CHANGE',
        userId: testHostId,
        url: 'https://newsite.com',
      };

      ws.send(JSON.stringify(urlChangeMessage));

      // 等待收到 URL_CHANGED 响应
      const response = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('URL_CHANGED response timeout'));
        }, 10000);

        ws.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'URL_CHANGED') {
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
      expect(response.type).toBe('URL_CHANGED');
      expect(response.data).toBeDefined();
      expect(response.data.url).toBe('https://newsite.com');
      expect(response.data.changedBy).toBeDefined();
      expect(response.data.changedBy.userId).toBe(testHostId);
      expect(response.data.changedBy.nickname).toBe('Test Host');
      expect(response.timestamp).toBeDefined();

      // 关闭连接
      ws.close();
    });
  });

  describe('URL 更新到数据库', () => {
    it('发送 URL_CHANGE 后，数据库中的房间 URL 应该更新', async () => {
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

      // 发送 URL_CHANGE
      const newUrl = `https://updated-${Date.now()}.com`;
      const urlChangeMessage = {
        type: 'URL_CHANGE',
        userId: testHostId,
        url: newUrl,
      };

      ws.send(JSON.stringify(urlChangeMessage));

      // 等待消息处理
      await new Promise<void>(resolve => {
        ws.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'URL_CHANGED' && message.data.url === newUrl) {
              resolve();
            }
          } catch (error) {
            // 忽略解析错误
          }
        });
      });

      // 验证数据库中的 URL 已更新
      const updatedRoom = await prisma.room.findUnique({
        where: {
          id: testRoomId,
        },
      });

      expect(updatedRoom).toBeDefined();
      expect(updatedRoom?.currentUrl).toBe(newUrl);

      // 验证 RoomEvent 已创建
      const event = await prisma.roomEvent.findFirst({
        where: {
          roomId: testRoomId,
          eventType: 'URL_CHANGED',
          userId: testHostId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(event).toBeDefined();
      expect(event?.eventData).toBeDefined();
      if (event?.eventData && typeof event.eventData === 'object' && 'newUrl' in event.eventData) {
        expect((event.eventData as { newUrl: string }).newUrl).toBe(newUrl);
      }

      // 关闭连接
      ws.close();
    });
  });

  describe('URL_CHANGED 消息广播给所有成员', () => {
    it('发送 URL_CHANGE 后，所有房间成员应该收到 URL_CHANGED 消息', async () => {
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

      // 发送 URL_CHANGE（从 host 发送）
      const testUrl = `https://broadcast-test-${Date.now()}.com`;
      const urlChangeMessage = {
        type: 'URL_CHANGE',
        userId: testHostId,
        url: testUrl,
      };

      hostWs.send(JSON.stringify(urlChangeMessage));

      // 等待消息广播
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 验证所有成员都收到了消息
      const hostReceived = hostMessages.find(
        (msg: any) => msg.type === 'URL_CHANGED' && msg.data.url === testUrl
      );
      const user1Received = user1Messages.find(
        (msg: any) => msg.type === 'URL_CHANGED' && msg.data.url === testUrl
      );
      const user2Received = user2Messages.find(
        (msg: any) => msg.type === 'URL_CHANGED' && msg.data.url === testUrl
      );

      expect(hostReceived).toBeDefined();
      expect(user1Received).toBeDefined();
      expect(user2Received).toBeDefined();

      // 验证消息内容一致
      expect(hostReceived.data.url).toBe(user1Received.data.url);
      expect(hostReceived.data.url).toBe(user2Received.data.url);
      expect(hostReceived.data.changedBy.userId).toBe(testHostId);
      expect(hostReceived.data.changedBy.nickname).toBe('Test Host');

      // 关闭所有连接
      hostWs.close();
      user1Ws.close();
      user2Ws.close();
    });
  });

  describe('URL 格式验证', () => {
    it('无效的 URL 应该返回错误', async () => {
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

      // 发送无效 URL
      ws.send(
        JSON.stringify({
          type: 'URL_CHANGE',
          userId: testHostId,
          url: 'not-a-valid-url',
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
      expect(errorResponse.error).toContain('valid HTTP or HTTPS URL');

      ws.close();
    });

    it('非 HTTP/HTTPS URL 应该返回错误', async () => {
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

      // 发送非 HTTP/HTTPS URL
      ws.send(
        JSON.stringify({
          type: 'URL_CHANGE',
          userId: testHostId,
          url: 'ftp://example.com',
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
      expect(errorResponse.error).toContain('valid HTTP or HTTPS URL');

      ws.close();
    });

    it('缺少 url 字段应该返回错误', async () => {
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

      // 发送缺少 url 的消息
      ws.send(
        JSON.stringify({
          type: 'URL_CHANGE',
          userId: testHostId,
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
      expect(errorResponse.error).toContain('url');

      ws.close();
    });

    it('空 URL 应该返回错误', async () => {
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

      // 发送空 URL
      ws.send(
        JSON.stringify({
          type: 'URL_CHANGE',
          userId: testHostId,
          url: '   ',
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
  });

  describe('消息包含 changedBy 字段', () => {
    it('URL_CHANGED 消息应该包含 changedBy 字段', async () => {
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

      // 发送 URL_CHANGE
      const urlChangeMessage = {
        type: 'URL_CHANGE',
        userId: testHostId,
        url: 'https://test-changedby.com',
      };

      ws.send(JSON.stringify(urlChangeMessage));

      // 等待响应
      const response = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Response timeout'));
        }, 10000);

        ws.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'URL_CHANGED' && message.data.url === urlChangeMessage.url) {
              clearTimeout(timeout);
              resolve(message);
            }
          } catch (error) {
            // 忽略解析错误
          }
        });
      });

      // 验证消息包含 changedBy 字段
      expect(response.data.changedBy).toBeDefined();
      expect(response.data.changedBy.userId).toBe(testHostId);
      expect(response.data.changedBy.nickname).toBe('Test Host');
      expect(typeof response.data.changedBy.userId).toBe('string');
      expect(typeof response.data.changedBy.nickname).toBe('string');

      ws.close();
    });

    it('非房主尝试更改 URL 时，不会产生 URL_CHANGED，且收到 ERROR', async () => {
      const port = (httpServer.address() as { port: number }).port;

      // 连接两个用户（房主和普通成员）
      const hostWs = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testHostId}`);
      const user1Ws = new WebSocket(`ws://localhost:${port}/ws?roomId=${testRoomId}&userId=${testUserId1}`);

      await Promise.all([
        new Promise<void>(resolve => {
          hostWs.on('open', () => resolve());
        }),
        new Promise<void>(resolve => {
          user1Ws.on('open', () => resolve());
        }),
      ]);

      // 跳过初始 CONNECTED + SYNC_STATE 消息
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
      ]);

      // 等待成员加入完成
      await new Promise(resolve => setTimeout(resolve, 1000));

      const hostMessages: any[] = [];
      hostWs.on('message', data => {
        try {
          const message = JSON.parse(data.toString());
          hostMessages.push(message);
        } catch {
          // ignore
        }
      });

      const errorPromise = new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Expected ERROR message from non-host URL_CHANGE'));
        }, 10000);

        user1Ws.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'ERROR') {
              clearTimeout(timeout);
              resolve(message);
            }
          } catch {
            // ignore
          }
        });

        user1Ws.on('error', err => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      // 从普通成员发送 URL_CHANGE
      const testUrl = `https://user1-should-not-change-${Date.now()}.com`;
      user1Ws.send(
        JSON.stringify({
          type: 'URL_CHANGE',
          userId: testUserId1,
          url: testUrl,
        })
      );

      const errorMessage = await errorPromise;

      expect(errorMessage.type).toBe('ERROR');
      expect(String(errorMessage.error)).toContain('Only host');

      // 等待一段时间，确认房主侧未收到 URL_CHANGED
      await new Promise(resolve => setTimeout(resolve, 2000));
      const urlChangedMessage = hostMessages.find(
        (msg: any) => msg.type === 'URL_CHANGED' && msg.data.url === testUrl
      );
      expect(urlChangedMessage).toBeUndefined();

      hostWs.close();
      user1Ws.close();
    });
  });
});
