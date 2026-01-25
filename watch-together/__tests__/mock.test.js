/**
 * Mock 数据和 API 测试
 */

const fs = require('fs');
const path = require('path');
const { MockWebSocket, MockWebSocketServer, createMockConnection } = require('../mock-server/websocket-mock');

// Mock 数据测试
describe('Mock数据', () => {
  describe('房间数据结构', () => {
    let mockData;

    beforeAll(() => {
      const dataPath = path.join(__dirname, '../mock/rooms.json');
      mockData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    });

    test('Mock 数据文件存在且有效', () => {
      expect(mockData).toBeDefined();
      expect(mockData.rooms).toBeDefined();
      expect(Array.isArray(mockData.rooms)).toBe(true);
    });

    test('至少有 2 个示例房间', () => {
      expect(mockData.rooms.length).toBeGreaterThanOrEqual(2);
    });

    test('房间数据结构正确', () => {
      const room = mockData.rooms[0];
      expect(room).toHaveProperty('id');
      expect(room).toHaveProperty('name');
      expect(room).toHaveProperty('hostId');
      expect(room).toHaveProperty('currentUrl');
      expect(room).toHaveProperty('createdAt');
      expect(room).toHaveProperty('members');
      expect(Array.isArray(room.members)).toBe(true);
    });

    test('成员数据结构正确', () => {
      const room = mockData.rooms[0];
      expect(room.members.length).toBeGreaterThan(0);
      
      const member = room.members[0];
      expect(member).toHaveProperty('id');
      expect(member).toHaveProperty('nickname');
      expect(member).toHaveProperty('isHost');
      expect(member).toHaveProperty('joinedAt');
    });

    test('房间有房主', () => {
      mockData.rooms.forEach(room => {
        const host = room.members.find(m => m.isHost === true);
        expect(host).toBeDefined();
        expect(host.id).toBe(room.hostId);
      });
    });
  });

  describe('API 响应格式', () => {
    let apiResponses;

    beforeAll(() => {
      const dataPath = path.join(__dirname, '../mock/api-responses.json');
      apiResponses = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    });

    test('API 响应数据文件存在', () => {
      expect(apiResponses).toBeDefined();
    });

    test('创建房间响应格式正确', () => {
      expect(apiResponses.createRoom).toBeDefined();
      expect(apiResponses.createRoom.success).toHaveProperty('success', true);
      expect(apiResponses.createRoom.success).toHaveProperty('data');
      expect(apiResponses.createRoom.success).toHaveProperty('message');
      
      expect(apiResponses.createRoom.error).toHaveProperty('success', false);
      expect(apiResponses.createRoom.error).toHaveProperty('error');
    });

    test('获取房间响应格式正确', () => {
      expect(apiResponses.getRoom).toBeDefined();
      expect(apiResponses.getRoom.success).toHaveProperty('success', true);
      expect(apiResponses.getRoom.notFound).toHaveProperty('success', false);
    });

    test('WebSocket 消息格式正确', () => {
      expect(apiResponses.websocket).toBeDefined();
      expect(apiResponses.websocket.memberJoined).toHaveProperty('type', 'MEMBER_JOINED');
      expect(apiResponses.websocket.memberLeft).toHaveProperty('type', 'MEMBER_LEFT');
      expect(apiResponses.websocket.chatMessage).toHaveProperty('type', 'CHAT_MESSAGE');
      expect(apiResponses.websocket.urlChanged).toHaveProperty('type', 'URL_CHANGED');
      expect(apiResponses.websocket.syncState).toHaveProperty('type', 'SYNC_STATE');
    });
  });
});

// WebSocket Mock 测试
describe('WebSocket Mock', () => {
  describe('MockWebSocket 客户端', () => {
    test('创建连接并触发 open 事件', (done) => {
      const ws = new MockWebSocket('ws://localhost:3001?roomId=test');
      
      ws.onopen = () => {
        expect(ws.readyState).toBe(MockWebSocket.OPEN);
        done();
      };
    });

    test('可以发送消息', (done) => {
      const ws = new MockWebSocket('ws://localhost:3001?roomId=test');
      
      ws.onopen = () => {
        expect(() => {
          ws.send(JSON.stringify({ type: 'TEST' }));
        }).not.toThrow();
        
        expect(ws.messageQueue.length).toBe(1);
        done();
      };
    });

    test('可以模拟接收消息', (done) => {
      const ws = new MockWebSocket('ws://localhost:3001?roomId=test');
      
      ws.onopen = () => {
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          expect(data.type).toBe('TEST_MESSAGE');
          done();
        };
        
        ws.simulateMessage({ type: 'TEST_MESSAGE' });
      };
    });

    test('关闭连接', (done) => {
      const ws = new MockWebSocket('ws://localhost:3001?roomId=test');
      
      ws.onopen = () => {
        ws.onclose = (event) => {
          expect(ws.readyState).toBe(MockWebSocket.CLOSED);
          expect(event.code).toBe(1000);
          done();
        };
        
        ws.close();
      };
    });
  });

  describe('MockWebSocketServer', () => {
    let server;

    beforeEach(() => {
      server = new MockWebSocketServer();
    });

    test('可以模拟客户端连接', () => {
      const client = server.simulateConnection('room-001', 'user-001');
      
      expect(server.clients.size).toBe(1);
      expect(server.rooms.has('room-001')).toBe(true);
      expect(client.roomId).toBe('room-001');
    });

    test('可以广播消息到房间', () => {
      const client1 = server.simulateConnection('room-001', 'user-001');
      const client2 = server.simulateConnection('room-001', 'user-002');
      const client3 = server.simulateConnection('room-002', 'user-003');
      
      server.broadcastToRoom('room-001', { type: 'TEST' });
      
      expect(client1.lastMessage).toBe(JSON.stringify({ type: 'TEST' }));
      expect(client2.lastMessage).toBe(JSON.stringify({ type: 'TEST' }));
      expect(client3.lastMessage).toBeUndefined();
    });

    test('发送成员加入事件', () => {
      const client = server.simulateConnection('room-001', 'user-001');
      
      server.emitMemberJoined('room-001', { id: 'user-002', nickname: '新成员' });
      
      const message = JSON.parse(client.lastMessage);
      expect(message.type).toBe('MEMBER_JOINED');
      expect(message.data.nickname).toBe('新成员');
    });

    test('发送聊天消息', () => {
      const client = server.simulateConnection('room-001', 'user-001');
      
      server.emitChatMessage('room-001', {
        userId: 'user-002',
        nickname: '测试用户',
        content: 'Hello World!'
      });
      
      const message = JSON.parse(client.lastMessage);
      expect(message.type).toBe('CHAT_MESSAGE');
      expect(message.data.content).toBe('Hello World!');
    });

    test('发送 URL 变化事件', () => {
      const client = server.simulateConnection('room-001', 'user-001');
      
      server.emitUrlChanged('room-001', 'https://example.com', 'user-002');
      
      const message = JSON.parse(client.lastMessage);
      expect(message.type).toBe('URL_CHANGED');
      expect(message.data.url).toBe('https://example.com');
    });
  });

  describe('createMockConnection 工厂函数', () => {
    test('创建带自动同步的连接', (done) => {
      const ws = createMockConnection('room-001', 'user-001', {
        initialUrl: 'https://test.com',
        members: [{ id: 'user-001', nickname: '测试' }]
      });
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'SYNC_STATE') {
          expect(data.data.currentUrl).toBe('https://test.com');
          expect(data.data.members.length).toBe(1);
          done();
        }
      };
    });
  });
});
