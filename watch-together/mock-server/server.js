/**
 * Watch Together Mock Server
 * 提供 REST API Mock 和 WebSocket Mock 功能
 */

const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// 静态文件服务 - 提供 HTML、JS、CSS 等文件
const staticPath = path.join(__dirname, '..');
app.use(express.static(staticPath));

// 获取 API 基础 URL（从环境变量或使用默认值）
// 在 Docker 环境中，应该连接到后端 API 服务器（端口 3000）
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
// WebSocket 基础 URL（默认与 API_BASE_URL 相同，但可以单独配置）
const WS_BASE_URL = process.env.WS_BASE_URL || API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');

// 路由处理
// 首页路由 /
app.get('/', (req, res) => {
  let html = fs.readFileSync(path.join(staticPath, 'index.html'), 'utf-8');
  // 注入 API_BASE_URL 和 WS_BASE_URL 配置
  html = html.replace('</head>', `<script>window.API_BASE_URL = '${API_BASE_URL}'; window.WS_BASE_URL = '${WS_BASE_URL}';</script></head>`);
  res.send(html);
});

// 房间路由 /room/:roomId
app.get('/room/:roomId', (req, res) => {
  let html = fs.readFileSync(path.join(staticPath, 'join.html'), 'utf-8');
  // 注入 API_BASE_URL 和 WS_BASE_URL 配置
  html = html.replace('</head>', `<script>window.API_BASE_URL = '${API_BASE_URL}'; window.WS_BASE_URL = '${WS_BASE_URL}';</script></head>`);
  res.send(html);
});

// 加载 mock 数据
const mockDataPath = path.join(__dirname, '../mock/rooms.json');
let mockData = { rooms: [] };

try {
  mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf-8'));
} catch (err) {
  console.log('Mock 数据文件不存在，使用空数据');
}

// 存储运行时房间数据
const rooms = new Map();
mockData.rooms.forEach(room => {
  rooms.set(room.id, { ...room });
});

// ============ REST API Mock ============

/**
 * POST /api/rooms - 创建房间
 */
app.post('/api/rooms', (req, res) => {
  const { name, hostNickname } = req.body;
  
  const roomId = `room-${uuidv4().slice(0, 8)}`;
  const hostId = `user-${uuidv4().slice(0, 8)}`;
  
  const newRoom = {
    id: roomId,
    name: name || '未命名房间',
    hostId: hostId,
    currentUrl: '',
    createdAt: new Date().toISOString(),
    inviteLink: `http://localhost:3000/room/${roomId}`,
    members: [
      {
        id: hostId,
        nickname: hostNickname || '房主',
        isHost: true,
        joinedAt: new Date().toISOString()
      }
    ],
    messages: []
  };
  
  rooms.set(roomId, newRoom);
  
  res.status(201).json({
    success: true,
    data: newRoom,
    message: '房间创建成功'
  });
});

/**
 * GET /api/rooms/:roomId - 获取房间信息
 */
app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'ROOM_NOT_FOUND',
        message: '房间不存在或已关闭'
      }
    });
  }
  
  res.json({
    success: true,
    data: room
  });
});

/**
 * POST /api/rooms/:roomId/join - 加入房间
 */
app.post('/api/rooms/:roomId/join', (req, res) => {
  const { roomId } = req.params;
  const { nickname } = req.body;
  
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'ROOM_NOT_FOUND',
        message: '房间不存在或已关闭'
      }
    });
  }
  
  const userId = `user-${uuidv4().slice(0, 8)}`;
  const newMember = {
    id: userId,
    nickname: nickname || `访客${room.members.length + 1}`,
    isHost: false,
    joinedAt: new Date().toISOString()
  };
  
  room.members.push(newMember);
  
  // 广播成员加入事件
  broadcastToRoom(roomId, {
    type: 'MEMBER_JOINED',
    data: newMember
  });
  
  res.json({
    success: true,
    data: {
      roomId: roomId,
      userId: userId,
      nickname: newMember.nickname,
      room: room
    },
    message: '加入房间成功'
  });
});

/**
 * POST /api/rooms/:roomId/messages - 发送消息
 */
app.post('/api/rooms/:roomId/messages', (req, res) => {
  const { roomId } = req.params;
  const { userId, content } = req.body;
  
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'ROOM_NOT_FOUND',
        message: '房间不存在'
      }
    });
  }
  
  const member = room.members.find(m => m.id === userId);
  
  const message = {
    id: `msg-${uuidv4().slice(0, 8)}`,
    userId: userId,
    nickname: member ? member.nickname : '未知用户',
    content: content,
    timestamp: new Date().toISOString()
  };
  
  room.messages.push(message);
  
  // 广播消息
  broadcastToRoom(roomId, {
    type: 'CHAT_MESSAGE',
    data: message
  });
  
  res.json({
    success: true,
    data: message
  });
});

/**
 * PUT /api/rooms/:roomId/url - 更新共享 URL
 */
app.put('/api/rooms/:roomId/url', (req, res) => {
  const { roomId } = req.params;
  const { url, userId } = req.body;
  
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'ROOM_NOT_FOUND',
        message: '房间不存在'
      }
    });
  }
  
  room.currentUrl = url;
  
  // 广播 URL 变化
  broadcastToRoom(roomId, {
    type: 'URL_CHANGED',
    data: {
      url: url,
      changedBy: userId
    }
  });
  
  res.json({
    success: true,
    data: { url: url },
    message: 'URL 更新成功'
  });
});

// ============ WebSocket Mock ============

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// 存储 WebSocket 连接
const wsConnections = new Map(); // roomId -> Set<ws>

function broadcastToRoom(roomId, message) {
  const connections = wsConnections.get(roomId);
  if (connections) {
    const messageStr = JSON.stringify(message);
    connections.forEach(ws => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(messageStr);
      }
    });
  }
}

wss.on('connection', (ws, req) => {
  // 从 URL 中获取房间 ID
  const url = new URL(req.url, 'http://localhost');
  const roomId = url.searchParams.get('roomId');
  const userId = url.searchParams.get('userId');
  
  console.log(`WebSocket 连接: roomId=${roomId}, userId=${userId}`);
  
  if (roomId) {
    // 将连接添加到房间
    if (!wsConnections.has(roomId)) {
      wsConnections.set(roomId, new Set());
    }
    wsConnections.get(roomId).add(ws);
    
    // 发送当前房间状态
    const room = rooms.get(roomId);
    if (room) {
      ws.send(JSON.stringify({
        type: 'SYNC_STATE',
        data: {
          currentUrl: room.currentUrl,
          members: room.members,
          messages: room.messages.slice(-50) // 最近50条消息
        }
      }));
    }
  }
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('收到消息:', message);
      
      switch (message.type) {
        case 'CHAT_MESSAGE':
          // 处理聊天消息
          if (roomId) {
            const room = rooms.get(roomId);
            if (room) {
              const chatMessage = {
                id: `msg-${uuidv4().slice(0, 8)}`,
                userId: message.userId,
                nickname: message.nickname || '未知用户',
                content: message.content,
                timestamp: new Date().toISOString()
              };
              room.messages.push(chatMessage);
              broadcastToRoom(roomId, {
                type: 'CHAT_MESSAGE',
                data: chatMessage
              });
            }
          }
          break;
          
        case 'URL_CHANGE':
          // 处理 URL 变化
          if (roomId) {
            const room = rooms.get(roomId);
            if (room) {
              room.currentUrl = message.url;
              broadcastToRoom(roomId, {
                type: 'URL_CHANGED',
                data: {
                  url: message.url,
                  changedBy: message.userId
                }
              });
            }
          }
          break;
          
        case 'SYNC_REQUEST':
          // 发送同步状态
          if (roomId) {
            const room = rooms.get(roomId);
            if (room) {
              ws.send(JSON.stringify({
                type: 'SYNC_STATE',
                data: {
                  currentUrl: room.currentUrl,
                  members: room.members,
                  playState: message.playState
                }
              }));
            }
          }
          break;
      }
    } catch (err) {
      console.error('消息解析错误:', err);
    }
  });
  
  ws.on('close', () => {
    console.log(`WebSocket 断开: roomId=${roomId}, userId=${userId}`);
    
    if (roomId) {
      const connections = wsConnections.get(roomId);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          wsConnections.delete(roomId);
        }
      }
      
      // 广播成员离开
      const room = rooms.get(roomId);
      if (room && userId) {
        const memberIndex = room.members.findIndex(m => m.id === userId);
        if (memberIndex !== -1) {
          const member = room.members[memberIndex];
          room.members.splice(memberIndex, 1);
          broadcastToRoom(roomId, {
            type: 'MEMBER_LEFT',
            data: {
              userId: member.id,
              nickname: member.nickname
            }
          });
        }
      }
    }
  });
});

// 启动服务器
const PORT = process.env.PORT || 3001;

// 只在直接运行时启动服务器
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Mock 服务器运行在 http://localhost:${PORT}`);
    console.log(`WebSocket 地址: ws://localhost:${PORT}?roomId=xxx&userId=xxx`);
  });
}

module.exports = { app, server, rooms, broadcastToRoom };
