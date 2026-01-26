# Watch Together 后端服务 - 快速参考

## 推荐技术栈

```
Node.js 18+ + Express 4.x + TypeScript 5.x
PostgreSQL 15+ + Prisma ORM
Redis 7+
Docker + Kubernetes
```

## 核心 API 端点

### 房间管理
- `POST /api/v1/rooms` - 创建房间
- `GET /api/v1/rooms/:roomId` - 获取房间信息
- `PUT /api/v1/rooms/:roomId` - 更新房间
- `DELETE /api/v1/rooms/:roomId` - 删除房间

### 成员管理
- `POST /api/v1/rooms/:roomId/join` - 加入房间
- `POST /api/v1/rooms/:roomId/leave` - 离开房间
- `GET /api/v1/rooms/:roomId/members` - 获取成员列表

### 消息管理
- `POST /api/v1/rooms/:roomId/messages` - 发送消息
- `GET /api/v1/rooms/:roomId/messages` - 获取消息历史

### URL 同步
- `PUT /api/v1/rooms/:roomId/url` - 更新共享 URL

## WebSocket 消息类型

### 服务器 → 客户端
- `SYNC_STATE` - 状态同步
- `MEMBER_JOINED` - 成员加入
- `MEMBER_LEFT` - 成员离开
- `CHAT_MESSAGE` - 聊天消息
- `URL_CHANGED` - URL 变化

### 客户端 → 服务器
- `CHAT_MESSAGE` - 发送聊天消息
- `URL_CHANGE` - 请求更改 URL
- `SYNC_REQUEST` - 请求状态同步

## 数据库表

1. **rooms** - 房间表
2. **room_members** - 房间成员表
3. **messages** - 消息表
4. **room_events** - 房间事件表（可选）

## 性能目标

- REST API P95: < 200ms
- WebSocket 延迟 P95: < 50ms
- 支持 10,000+ 并发连接
- 支持 1,000+ QPS

## 快速开始命令

```bash
# 初始化项目
npm init -y
npm install express ws typescript @types/node @types/express @types/ws
npm install -D ts-node nodemon

# 安装数据库相关
npm install prisma @prisma/client
npm install redis ioredis

# 安装工具库
npm install zod uuid
npm install winston pino

# 初始化 Prisma
npx prisma init
```

## 项目结构建议

```
backend/
├── src/
│   ├── controllers/     # 控制器
│   ├── services/        # 业务逻辑
│   ├── models/         # 数据模型
│   ├── routes/         # 路由定义
│   ├── websocket/      # WebSocket 处理
│   ├── middleware/     # 中间件
│   ├── utils/          # 工具函数
│   └── types/          # TypeScript 类型
├── prisma/
│   └── schema.prisma   # 数据库模型
├── tests/              # 测试文件
├── docker/             # Docker 配置
└── docs/               # 文档
```

## 关键依赖版本

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.16.0",
    "@prisma/client": "^5.7.0",
    "ioredis": "^5.3.2",
    "zod": "^3.22.4",
    "uuid": "^9.0.1",
    "pino": "^8.16.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/node": "^20.10.0",
    "@types/express": "^4.17.21",
    "@types/ws": "^8.5.10",
    "prisma": "^5.7.0",
    "jest": "^29.7.0",
    "ts-node": "^10.9.2"
  }
}
```

## 环境变量

```env
# 服务器
PORT=3001
NODE_ENV=production

# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/watchtogether

# Redis
REDIS_URL=redis://localhost:6379

# 其他
LOG_LEVEL=info
MAX_ROOM_SIZE=50
MESSAGE_HISTORY_LIMIT=1000
```

## 下一步行动

1. ✅ 阅读完整需求文档：`BACKEND_REQUIREMENTS.md`
2. ⬜ 搭建项目框架
3. ⬜ 设计数据库 Schema
4. ⬜ 实现 REST API
5. ⬜ 实现 WebSocket
6. ⬜ 编写测试
7. ⬜ 部署上线
