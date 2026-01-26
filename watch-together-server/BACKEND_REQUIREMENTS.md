# Watch Together 后端服务 - 项目需求文档

## 1. 项目概述

### 1.1 项目背景
Watch Together 是一个网页版"一起看"功能，支持多人同时观看任意网页并实时聊天。当前已有完整的前端实现和 Mock 服务器，需要开发生产级后端服务以支持实际部署。

### 1.2 项目目标
- 提供稳定、高性能的 REST API 服务
- 实现实时 WebSocket 通信
- 支持房间管理、成员管理、消息同步
- 具备良好的扩展性和可维护性
- 支持高并发和水平扩展

### 1.3 核心功能
1. **房间管理**：创建、查询、删除房间
2. **成员管理**：加入、离开房间，成员列表维护
3. **实时聊天**：WebSocket 实时消息推送
4. **URL 同步**：共享浏览区域的 URL 实时同步
5. **状态同步**：播放状态、成员状态等实时同步

---

## 2. 技术栈推荐

### 2.1 后端框架（推荐方案）

#### 方案 A：Node.js + Express + TypeScript（推荐）
**优势：**
- 与前端技术栈一致，团队技能复用
- 异步 I/O 性能优秀，适合实时应用
- 丰富的 WebSocket 库支持
- TypeScript 提供类型安全

**技术选型：**
- **运行时**：Node.js 18+ LTS
- **框架**：Express 4.x
- **语言**：TypeScript 5.x
- **WebSocket**：ws 或 Socket.io
- **ORM/数据库**：Prisma + PostgreSQL
- **验证**：Joi 或 Zod
- **日志**：Winston 或 Pino
- **测试**：Jest + Supertest

#### 方案 B：Go + Gin（高性能方案）
**优势：**
- 极高的并发性能
- 低内存占用
- 编译型语言，部署简单

**技术选型：**
- **语言**：Go 1.21+
- **框架**：Gin
- **WebSocket**：gorilla/websocket
- **数据库**：GORM + PostgreSQL
- **验证**：validator
- **日志**：logrus 或 zap

#### 方案 C：Python + FastAPI（快速开发）
**优势：**
- 开发速度快
- 自动生成 API 文档
- 丰富的异步支持

**技术选型：**
- **语言**：Python 3.11+
- **框架**：FastAPI
- **WebSocket**：FastAPI WebSocket
- **数据库**：SQLAlchemy + PostgreSQL
- **验证**：Pydantic
- **日志**：structlog

### 2.2 数据库（推荐）

#### 主数据库：PostgreSQL 15+
**选择理由：**
- 成熟稳定，功能强大
- 优秀的 JSON 支持（存储消息、状态等）
- 支持全文搜索（未来扩展）
- 良好的并发性能

#### 缓存：Redis 7+
**用途：**
- WebSocket 连接管理
- 房间状态缓存
- 消息队列（可选）
- 限流和防刷

### 2.3 消息队列（可选，用于扩展）

**推荐：Redis Streams 或 RabbitMQ**
- 处理高并发消息
- 解耦服务
- 支持消息持久化

### 2.4 部署和运维

- **容器化**：Docker + Docker Compose
- **编排**：Kubernetes（生产环境）
- **反向代理**：Nginx 或 Traefik
- **监控**：Prometheus + Grafana
- **日志**：ELK Stack 或 Loki
- **CI/CD**：GitHub Actions 或 GitLab CI

### 2.5 推荐技术栈（最终方案）

基于项目特点和团队效率，**推荐使用方案 A：Node.js + Express + TypeScript**

```
后端技术栈：
├── 运行时：Node.js 18+ LTS
├── 语言：TypeScript 5.x
├── 框架：Express 4.x
├── WebSocket：ws 8.x（轻量级）或 Socket.io 4.x（功能丰富）
├── 数据库：PostgreSQL 15+ + Prisma ORM
├── 缓存：Redis 7+
├── 验证：Zod
├── 日志：Pino
├── 测试：Jest + Supertest
└── 部署：Docker + Kubernetes
```

---

## 3. API 设计规范

### 3.1 基础规范

- **协议**：HTTP/1.1 或 HTTP/2
- **数据格式**：JSON
- **字符编码**：UTF-8
- **时区**：UTC（前端显示时转换）
- **版本控制**：URL 路径版本（`/api/v1/...`）

### 3.2 响应格式

#### 成功响应
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

#### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": { ... }
  }
}
```

### 3.3 HTTP 状态码

- `200 OK`：成功
- `201 Created`：创建成功
- `400 Bad Request`：请求参数错误
- `401 Unauthorized`：未认证
- `403 Forbidden`：无权限
- `404 Not Found`：资源不存在
- `429 Too Many Requests`：请求过于频繁
- `500 Internal Server Error`：服务器错误

---

## 4. REST API 接口设计

### 4.1 房间管理

#### 4.1.1 创建房间
```
POST /api/v1/rooms
Content-Type: application/json

Request Body:
{
  "name": "我的房间",           // 可选，默认"未命名房间"
  "hostNickname": "房主"        // 可选，默认"房主"
}

Response 201:
{
  "success": true,
  "data": {
    "id": "room-abc12345",
    "name": "我的房间",
    "hostId": "user-xyz67890",
    "currentUrl": "",
    "createdAt": "2026-01-26T10:00:00Z",
    "inviteLink": "https://watch-together.app/room/room-abc12345",
    "members": [
      {
        "id": "user-xyz67890",
        "nickname": "房主",
        "isHost": true,
        "joinedAt": "2026-01-26T10:00:00Z"
      }
    ],
    "messageCount": 0
  },
  "message": "房间创建成功"
}
```

#### 4.1.2 获取房间信息
```
GET /api/v1/rooms/:roomId

Response 200:
{
  "success": true,
  "data": {
    "id": "room-abc12345",
    "name": "我的房间",
    "hostId": "user-xyz67890",
    "currentUrl": "https://example.com",
    "createdAt": "2026-01-26T10:00:00Z",
    "members": [ ... ],
    "messageCount": 10
  }
}

Error 404:
{
  "success": false,
  "error": {
    "code": "ROOM_NOT_FOUND",
    "message": "房间不存在或已关闭"
  }
}
```

#### 4.1.3 更新房间信息
```
PUT /api/v1/rooms/:roomId
Content-Type: application/json

Request Body:
{
  "name": "新房间名"  // 可选
}

Response 200:
{
  "success": true,
  "data": { ... },
  "message": "房间信息更新成功"
}
```

#### 4.1.4 删除/关闭房间
```
DELETE /api/v1/rooms/:roomId

Response 200:
{
  "success": true,
  "message": "房间已关闭"
}
```

### 4.2 成员管理

#### 4.2.1 加入房间
```
POST /api/v1/rooms/:roomId/join
Content-Type: application/json

Request Body:
{
  "nickname": "新成员"  // 可选，默认"访客N"
}

Response 200:
{
  "success": true,
  "data": {
    "roomId": "room-abc12345",
    "userId": "user-new12345",
    "nickname": "新成员",
    "room": { ... }
  },
  "message": "加入房间成功"
}

Error 404:
{
  "success": false,
  "error": {
    "code": "ROOM_NOT_FOUND",
    "message": "房间不存在或已关闭"
  }
}

Error 400:
{
  "success": false,
  "error": {
    "code": "ROOM_FULL",
    "message": "房间已满（如果设置了人数限制）"
  }
}
```

#### 4.2.2 离开房间
```
POST /api/v1/rooms/:roomId/leave
Content-Type: application/json

Request Body:
{
  "userId": "user-xyz67890"
}

Response 200:
{
  "success": true,
  "message": "已离开房间"
}
```

#### 4.2.3 获取成员列表
```
GET /api/v1/rooms/:roomId/members

Response 200:
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "user-xyz67890",
        "nickname": "房主",
        "isHost": true,
        "joinedAt": "2026-01-26T10:00:00Z",
        "lastActiveAt": "2026-01-26T10:05:00Z"
      },
      ...
    ],
    "total": 5
  }
}
```

### 4.3 消息管理

#### 4.3.1 发送消息（REST API，WebSocket 优先）
```
POST /api/v1/rooms/:roomId/messages
Content-Type: application/json

Request Body:
{
  "userId": "user-xyz67890",
  "content": "大家好！"
}

Response 201:
{
  "success": true,
  "data": {
    "id": "msg-abc12345",
    "userId": "user-xyz67890",
    "nickname": "房主",
    "content": "大家好！",
    "timestamp": "2026-01-26T10:00:00Z"
  }
}
```

#### 4.3.2 获取消息历史
```
GET /api/v1/rooms/:roomId/messages?limit=50&offset=0

Query Parameters:
- limit: 每页数量（默认 50，最大 100）
- offset: 偏移量（默认 0）
- before: 获取指定时间之前的消息（ISO 8601）

Response 200:
{
  "success": true,
  "data": {
    "messages": [ ... ],
    "pagination": {
      "total": 150,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### 4.4 URL 同步

#### 4.4.1 更新共享 URL
```
PUT /api/v1/rooms/:roomId/url
Content-Type: application/json

Request Body:
{
  "url": "https://www.bilibili.com/video/xxx",
  "userId": "user-xyz67890"
}

Response 200:
{
  "success": true,
  "data": {
    "url": "https://www.bilibili.com/video/xxx",
    "updatedAt": "2026-01-26T10:00:00Z",
    "updatedBy": "user-xyz67890"
  },
  "message": "URL 更新成功"
}
```

---

## 5. WebSocket 接口设计

### 5.1 连接方式

```
ws://api.watch-together.app/ws?roomId=room-abc12345&userId=user-xyz67890
wss://api.watch-together.app/ws?roomId=room-abc12345&userId=user-xyz67890  // 生产环境
```

**连接参数：**
- `roomId`（必需）：房间 ID
- `userId`（必需）：用户 ID
- `token`（可选）：认证令牌（未来扩展）

### 5.2 消息格式

所有消息均为 JSON 格式：

```json
{
  "type": "MESSAGE_TYPE",
  "data": { ... },
  "timestamp": "2026-01-26T10:00:00Z"
}
```

### 5.3 服务器发送的消息

#### 5.3.1 SYNC_STATE - 状态同步
连接建立时自动发送，或客户端请求时发送。

```json
{
  "type": "SYNC_STATE",
  "data": {
    "currentUrl": "https://example.com",
    "members": [
      {
        "id": "user-xyz67890",
        "nickname": "房主",
        "isHost": true,
        "joinedAt": "2026-01-26T10:00:00Z",
        "isOnline": true
      }
    ],
    "playState": {
      "isPlaying": false,
      "currentTime": 0
    },
    "recentMessages": [ ... ]  // 最近 50 条消息
  },
  "timestamp": "2026-01-26T10:00:00Z"
}
```

#### 5.3.2 MEMBER_JOINED - 成员加入
```json
{
  "type": "MEMBER_JOINED",
  "data": {
    "userId": "user-new12345",
    "nickname": "新成员",
    "joinedAt": "2026-01-26T10:00:00Z"
  },
  "timestamp": "2026-01-26T10:00:00Z"
}
```

#### 5.3.3 MEMBER_LEFT - 成员离开
```json
{
  "type": "MEMBER_LEFT",
  "data": {
    "userId": "user-xyz67890",
    "nickname": "房主"
  },
  "timestamp": "2026-01-26T10:00:00Z"
}
```

#### 5.3.4 CHAT_MESSAGE - 聊天消息
```json
{
  "type": "CHAT_MESSAGE",
  "data": {
    "id": "msg-abc12345",
    "userId": "user-xyz67890",
    "nickname": "房主",
    "content": "大家好！",
    "timestamp": "2026-01-26T10:00:00Z"
  },
  "timestamp": "2026-01-26T10:00:00Z"
}
```

#### 5.3.5 URL_CHANGED - URL 变化
```json
{
  "type": "URL_CHANGED",
  "data": {
    "url": "https://www.bilibili.com/video/xxx",
    "changedBy": "user-xyz67890",
    "changedAt": "2026-01-26T10:00:00Z"
  },
  "timestamp": "2026-01-26T10:00:00Z"
}
```

#### 5.3.6 PLAY_STATE_CHANGED - 播放状态变化（未来扩展）
```json
{
  "type": "PLAY_STATE_CHANGED",
  "data": {
    "isPlaying": true,
    "currentTime": 120,
    "changedBy": "user-xyz67890"
  },
  "timestamp": "2026-01-26T10:00:00Z"
}
```

#### 5.3.7 ERROR - 错误消息
```json
{
  "type": "ERROR",
  "data": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  },
  "timestamp": "2026-01-26T10:00:00Z"
}
```

### 5.4 客户端发送的消息

#### 5.4.1 CHAT_MESSAGE - 发送聊天消息
```json
{
  "type": "CHAT_MESSAGE",
  "userId": "user-xyz67890",
  "nickname": "房主",
  "content": "大家好！"
}
```

#### 5.4.2 URL_CHANGE - 请求更改 URL
```json
{
  "type": "URL_CHANGE",
  "userId": "user-xyz67890",
  "url": "https://www.bilibili.com/video/xxx"
}
```

#### 5.4.3 SYNC_REQUEST - 请求状态同步
```json
{
  "type": "SYNC_REQUEST",
  "userId": "user-xyz67890"
}
```

#### 5.4.4 PLAY_STATE_CHANGE - 播放状态变化（未来扩展）
```json
{
  "type": "PLAY_STATE_CHANGE",
  "userId": "user-xyz67890",
  "playState": {
    "isPlaying": true,
    "currentTime": 120
  }
}
```

### 5.5 连接管理

- **心跳机制**：客户端每 30 秒发送 ping，服务器响应 pong
- **自动重连**：客户端实现指数退避重连
- **连接超时**：无活动 5 分钟后自动断开
- **房间验证**：连接时验证 roomId 和 userId 的有效性

---

## 6. 数据库设计

### 6.1 表结构

#### 6.1.1 rooms（房间表）
```sql
CREATE TABLE rooms (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(255) NOT NULL DEFAULT '未命名房间',
  host_id VARCHAR(32) NOT NULL,
  current_url TEXT,
  invite_link VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  settings JSONB,  -- 房间设置（如最大人数、是否公开等）
  INDEX idx_host_id (host_id),
  INDEX idx_created_at (created_at),
  INDEX idx_deleted_at (deleted_at)
);
```

#### 6.1.2 room_members（房间成员表）
```sql
CREATE TABLE room_members (
  id BIGSERIAL PRIMARY KEY,
  room_id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  nickname VARCHAR(100) NOT NULL,
  is_host BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP,
  last_active_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, user_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  INDEX idx_room_id (room_id),
  INDEX idx_user_id (user_id),
  INDEX idx_last_active_at (last_active_at)
);
```

#### 6.1.3 messages（消息表）
```sql
CREATE TABLE messages (
  id VARCHAR(32) PRIMARY KEY,
  room_id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  nickname VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  INDEX idx_room_id_created_at (room_id, created_at DESC),
  INDEX idx_user_id (user_id)
);
```

#### 6.1.4 room_events（房间事件表，可选，用于审计）
```sql
CREATE TABLE room_events (
  id BIGSERIAL PRIMARY KEY,
  room_id VARCHAR(32) NOT NULL,
  event_type VARCHAR(50) NOT NULL,  -- URL_CHANGED, MEMBER_JOINED, etc.
  user_id VARCHAR(32),
  event_data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_room_id_created_at (room_id, created_at DESC),
  INDEX idx_event_type (event_type)
);
```

### 6.2 Redis 数据结构

#### 6.2.1 WebSocket 连接管理
```
Key: ws:room:{roomId}:connections
Type: Set
Value: {userId1, userId2, ...}
TTL: 5 分钟（自动续期）
```

#### 6.2.2 房间状态缓存
```
Key: room:{roomId}:state
Type: Hash
Fields:
  - currentUrl: string
  - memberCount: number
  - lastActivity: timestamp
TTL: 1 小时
```

#### 6.2.3 用户会话
```
Key: user:{userId}:session
Type: Hash
Fields:
  - roomId: string
  - nickname: string
  - connectedAt: timestamp
TTL: 30 分钟
```

---

## 7. 性能要求

### 7.1 响应时间
- REST API：P95 < 200ms
- WebSocket 消息延迟：P95 < 50ms
- 数据库查询：P95 < 100ms

### 7.2 并发能力
- 支持 10,000+ 并发 WebSocket 连接（单实例）
- 支持 1,000+ QPS（REST API）
- 支持水平扩展（多实例）

### 7.3 可用性
- 服务可用性：99.9%（月度）
- 自动故障恢复：< 30 秒
- 数据持久化：所有关键数据写入数据库

---

## 8. 安全要求

### 8.1 认证和授权（未来扩展）
- JWT Token 认证
- 房间访问权限控制
- 房主权限管理

### 8.2 数据安全
- SQL 注入防护（使用 ORM/参数化查询）
- XSS 防护（输入验证和转义）
- CSRF 防护（REST API）

### 8.3 限流和防刷
- IP 限流：100 请求/分钟
- 用户限流：1000 请求/小时
- WebSocket 连接数限制：每 IP 最多 10 个连接

### 8.4 输入验证
- 所有输入参数验证
- URL 格式验证
- 消息内容长度限制（最大 1000 字符）
- 昵称长度限制（最大 50 字符）

---

## 9. 监控和日志

### 9.1 日志要求
- 结构化日志（JSON 格式）
- 日志级别：DEBUG, INFO, WARN, ERROR
- 关键操作审计日志
- 日志保留：30 天

### 9.2 监控指标
- API 请求量和响应时间
- WebSocket 连接数和消息量
- 数据库连接池状态
- Redis 连接状态
- 错误率和异常统计

### 9.3 告警
- 错误率 > 1%
- 响应时间 P95 > 500ms
- 数据库连接池耗尽
- 服务不可用

---

## 10. 部署方案

### 10.1 开发环境
- Docker Compose 本地部署
- 包含：API 服务、PostgreSQL、Redis

### 10.2 生产环境
- Kubernetes 集群部署
- 负载均衡（Nginx/Traefik）
- 数据库主从复制
- Redis 集群
- 自动扩缩容（HPA）

### 10.3 CI/CD
- 自动化测试
- 自动化构建 Docker 镜像
- 自动化部署（蓝绿部署或滚动更新）

---

## 11. 开发计划

### 阶段 1：基础功能（2-3 周）
- [ ] 项目初始化和技术栈搭建
- [ ] 数据库设计和迁移
- [ ] REST API 基础接口（房间、成员、消息）
- [ ] WebSocket 基础功能
- [ ] 单元测试和集成测试

### 阶段 2：完善功能（1-2 周）
- [ ] URL 同步功能
- [ ] 消息历史查询
- [ ] 房间状态管理
- [ ] 错误处理和日志

### 阶段 3：优化和部署（1-2 周）
- [ ] 性能优化
- [ ] 缓存策略
- [ ] 监控和告警
- [ ] 生产环境部署

---

## 12. 技术债务和未来扩展

### 12.1 当前版本不包含
- 用户认证系统
- 房间密码保护
- 房间人数限制
- 消息撤回和编辑
- 文件上传和分享
- 视频播放状态同步（播放/暂停/进度）

### 12.2 未来扩展方向
- 用户系统和好友功能
- 房间分类和搜索
- 消息推送通知
- 移动端支持
- 视频通话集成
- AI 内容推荐

---

## 附录 A：API 响应示例

### A.1 完整房间信息
```json
{
  "success": true,
  "data": {
    "id": "room-abc12345",
    "name": "我的房间",
    "hostId": "user-xyz67890",
    "currentUrl": "https://www.bilibili.com/video/xxx",
    "createdAt": "2026-01-26T10:00:00Z",
    "updatedAt": "2026-01-26T10:05:00Z",
    "inviteLink": "https://watch-together.app/room/room-abc12345",
    "members": [
      {
        "id": "user-xyz67890",
        "nickname": "房主",
        "isHost": true,
        "joinedAt": "2026-01-26T10:00:00Z",
        "lastActiveAt": "2026-01-26T10:05:00Z"
      }
    ],
    "memberCount": 1,
    "messageCount": 10
  }
}
```

### A.2 错误响应示例
```json
{
  "success": false,
  "error": {
    "code": "ROOM_NOT_FOUND",
    "message": "房间不存在或已关闭",
    "details": {
      "roomId": "room-abc12345"
    }
  }
}
```

---

## 附录 B：技术栈对比

| 特性 | Node.js + Express | Go + Gin | Python + FastAPI |
|------|------------------|----------|------------------|
| 开发速度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| 性能 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 并发能力 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 生态丰富度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| 学习曲线 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| 团队技能匹配 | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |

**推荐：Node.js + Express + TypeScript**（与前端技术栈一致，开发效率高）

---

**文档版本**：v1.0  
**最后更新**：2026-01-26  
**维护者**：开发团队
