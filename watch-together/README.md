# Watch Together - 网页版一起看

一起看功能的 Mock 数据和 API 模拟服务，用于前端开发阶段独立开发，无需等待后端 API 完成。

## 功能概述

- **Mock 数据**: 预定义的房间数据和 API 响应格式
- **REST API Mock**: 模拟创建房间、获取房间信息等 API
- **WebSocket Mock**: 模拟实时消息（成员加入、聊天消息、URL 同步等）

## 快速开始

### 安装依赖

```bash
npm install
```

### 构建（静态校验，无 bundler）

```bash
npm run build
```

用于 CI/验收：检查入口与架构约定所需文件存在，通过则退出 0。

### 本地启动

**方式一：Mock 服务器（仅前端）**

```bash
npm start
# 或
npm run mock
```

服务器将运行在 `http://localhost:3001`，访问 `/` 为创建房间页（占位首页）。

**方式二：与真实后端一起运行（推荐）**

在仓库根目录：

```bash
docker compose up -d watch-together watch-together-server
```

- 前端：`http://localhost:3001`（创建房间、加入房间、房间内页）
- 后端 API：`http://localhost:3000`
- WebSocket：`ws://localhost:3000`（由环境变量 `WS_BASE_URL` / `API_BASE_URL` 注入，见 `docker-compose.yml`）

与后端/WS 的对接约定（REST + 双 WebSocket、数据获取策略）见 **`docs/architecture-decisions.md`**。

### 运行测试

```bash
npm test
```

## API 接口

### REST API

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/rooms` | 创建房间 |
| GET | `/api/rooms/:roomId` | 获取房间信息 |
| POST | `/api/rooms/:roomId/join` | 加入房间 |
| POST | `/api/rooms/:roomId/messages` | 发送消息 |
| PUT | `/api/rooms/:roomId/url` | 更新共享 URL |

### 创建房间

```bash
curl -X POST http://localhost:3001/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"name": "我的房间", "hostNickname": "房主"}'
```

响应示例：
```json
{
  "success": true,
  "data": {
    "id": "room-abc12345",
    "name": "我的房间",
    "hostId": "user-xyz67890",
    "inviteLink": "http://localhost:3000/join/room-abc12345",
    "members": [...]
  },
  "message": "房间创建成功"
}
```

### 获取房间信息

```bash
curl http://localhost:3001/api/rooms/room-001
```

### 加入房间

```bash
curl -X POST http://localhost:3001/api/rooms/room-001/join \
  -H "Content-Type: application/json" \
  -d '{"nickname": "新成员"}'
```

## WebSocket 连接

### 连接方式

```javascript
const ws = new WebSocket('ws://localhost:3001?roomId=room-001&userId=user-001');
```

### 消息类型

#### 服务器发送的消息

| 类型 | 描述 |
|------|------|
| `SYNC_STATE` | 同步房间状态（连接时发送） |
| `MEMBER_JOINED` | 新成员加入 |
| `MEMBER_LEFT` | 成员离开 |
| `CHAT_MESSAGE` | 聊天消息 |
| `URL_CHANGED` | 共享 URL 变化 |

#### 客户端可发送的消息

| 类型 | 描述 |
|------|------|
| `CHAT_MESSAGE` | 发送聊天消息 |
| `URL_CHANGE` | 请求更改 URL |
| `SYNC_REQUEST` | 请求状态同步 |

### 使用示例

```javascript
const ws = new WebSocket('ws://localhost:3001?roomId=room-001&userId=user-001');

ws.onopen = () => {
  console.log('已连接到房间');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'SYNC_STATE':
      console.log('同步状态:', message.data);
      break;
    case 'CHAT_MESSAGE':
      console.log('收到消息:', message.data.content);
      break;
    case 'MEMBER_JOINED':
      console.log('新成员加入:', message.data.nickname);
      break;
    case 'URL_CHANGED':
      console.log('URL 已更新:', message.data.url);
      break;
  }
};

// 发送聊天消息
ws.send(JSON.stringify({
  type: 'CHAT_MESSAGE',
  userId: 'user-001',
  nickname: '我的昵称',
  content: '大家好！'
}));

// 更改共享 URL
ws.send(JSON.stringify({
  type: 'URL_CHANGE',
  userId: 'user-001',
  url: 'https://www.bilibili.com/video/xxx'
}));
```

## Mock 数据文件

### mock/rooms.json

预定义的房间数据，包含示例房间、成员和消息。

### mock/api-responses.json

API 响应的标准格式，包括成功和错误响应示例。

## 在测试中使用 WebSocket Mock

对于单元测试，可以使用不需要实际服务器的 Mock：

```javascript
const { MockWebSocket, MockWebSocketServer, createMockConnection } = require('./mock-server/websocket-mock');

// 创建模拟连接
const ws = createMockConnection('room-001', 'user-001', {
  initialUrl: 'https://example.com',
  members: [{ id: 'user-001', nickname: '测试用户' }]
});

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // 处理消息...
};
```

## 切换到真实 API

当后端 API 完成后，只需修改 API 基础 URL：

```javascript
// 开发环境（Mock）
const API_BASE = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001';

// 生产环境（真实 API）
const API_BASE = 'https://api.watch-together.app';
const WS_URL = 'wss://api.watch-together.app';
```

## 目录结构

```
watch-together/
├── mock/                    # Mock 数据
│   ├── rooms.json          # 房间数据
│   └── api-responses.json  # API 响应格式
├── mock-server/             # Mock 服务器
│   ├── server.js           # Express + WebSocket 服务器
│   └── websocket-mock.js   # WebSocket Mock 工具
├── __tests__/               # 测试文件
│   └── mock.test.js        # Mock 功能测试
├── package.json
└── README.md
```

## License

MIT
