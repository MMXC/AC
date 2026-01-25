/**
 * WebSocket Mock - 独立的 WebSocket 模拟器
 * 可以用于不需要完整服务器的场景（如单元测试）
 */

const EventEmitter = require('events');

/**
 * MockWebSocket - 模拟 WebSocket 客户端
 * 用于测试和开发环境
 */
class MockWebSocket extends EventEmitter {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url) {
    super();
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.messageQueue = [];
    
    // 模拟连接延迟
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.emit('open');
      this.onopen && this.onopen();
    }, 50);
  }

  send(data) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.messageQueue.push(data);
    this.emit('send', data);
  }

  close(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      this.emit('close', { code, reason });
      this.onclose && this.onclose({ code, reason });
    }, 10);
  }

  // 模拟接收消息
  simulateMessage(data) {
    const event = { data: typeof data === 'string' ? data : JSON.stringify(data) };
    this.emit('message', event);
    this.onmessage && this.onmessage(event);
  }

  // 模拟错误
  simulateError(error) {
    this.emit('error', error);
    this.onerror && this.onerror(error);
  }
}

/**
 * MockWebSocketServer - 模拟 WebSocket 服务器
 * 用于测试场景
 */
class MockWebSocketServer extends EventEmitter {
  constructor() {
    super();
    this.clients = new Set();
    this.rooms = new Map(); // roomId -> Set<client>
  }

  /**
   * 模拟客户端连接
   */
  simulateConnection(roomId, userId) {
    const client = {
      id: userId,
      roomId: roomId,
      readyState: 1, // OPEN
      send: (data) => {
        client.lastMessage = data;
        this.emit('clientMessage', { client, data });
      },
      close: () => {
        this.clients.delete(client);
        const roomClients = this.rooms.get(roomId);
        if (roomClients) {
          roomClients.delete(client);
        }
        this.emit('clientDisconnect', client);
      }
    };

    this.clients.add(client);
    
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId).add(client);

    this.emit('connection', client);
    return client;
  }

  /**
   * 广播消息到房间
   */
  broadcastToRoom(roomId, message) {
    const clients = this.rooms.get(roomId);
    if (clients) {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(messageStr);
        }
      });
    }
  }

  /**
   * 发送成员加入事件
   */
  emitMemberJoined(roomId, member) {
    this.broadcastToRoom(roomId, {
      type: 'MEMBER_JOINED',
      data: {
        userId: member.id,
        nickname: member.nickname,
        joinedAt: new Date().toISOString()
      }
    });
  }

  /**
   * 发送成员离开事件
   */
  emitMemberLeft(roomId, member) {
    this.broadcastToRoom(roomId, {
      type: 'MEMBER_LEFT',
      data: {
        userId: member.id,
        nickname: member.nickname
      }
    });
  }

  /**
   * 发送聊天消息
   */
  emitChatMessage(roomId, message) {
    this.broadcastToRoom(roomId, {
      type: 'CHAT_MESSAGE',
      data: {
        id: `msg-${Date.now()}`,
        userId: message.userId,
        nickname: message.nickname,
        content: message.content,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * 发送 URL 变化事件
   */
  emitUrlChanged(roomId, url, changedBy) {
    this.broadcastToRoom(roomId, {
      type: 'URL_CHANGED',
      data: {
        url: url,
        changedBy: changedBy
      }
    });
  }

  /**
   * 发送同步状态
   */
  emitSyncState(roomId, state) {
    this.broadcastToRoom(roomId, {
      type: 'SYNC_STATE',
      data: state
    });
  }
}

/**
 * 创建 Mock WebSocket 连接的工厂函数
 * 用于替代真实 WebSocket 进行测试
 */
function createMockConnection(roomId, userId, options = {}) {
  const ws = new MockWebSocket(`ws://localhost:3001?roomId=${roomId}&userId=${userId}`);
  
  // 模拟初始状态同步
  if (options.autoSync !== false) {
    setTimeout(() => {
      ws.simulateMessage({
        type: 'SYNC_STATE',
        data: {
          currentUrl: options.initialUrl || '',
          members: options.members || [],
          messages: options.messages || []
        }
      });
    }, 100);
  }
  
  return ws;
}

module.exports = {
  MockWebSocket,
  MockWebSocketServer,
  createMockConnection
};
