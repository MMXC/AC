# Watch Together 后端服务 - 任务分解

基于 `BACKEND_REQUIREMENTS.md` 和 `BACKEND_QUICK_REFERENCE.md` 的正交分解结果。

## 分解原则

- **正交性**：任务之间相互独立，可并行执行
- **原子性**：每个任务不可再分，有明确的完成标准
- **可测试性**：每个任务都有明确的测试命令和验收条件

---

## 阶段 1：项目基础搭建（2-3 周）

### 任务 1: 项目初始化和 TypeScript 配置
- **ID**: backend-001
- **描述**: 初始化 Node.js + TypeScript 项目，配置开发环境和构建工具
- **测试命令**: `npm run build && npm run type-check`
- **成功标准**:
  1. [ ] 项目目录结构创建完成（src/, tests/, prisma/ 等）
  2. [ ] package.json 配置正确，包含所有必需依赖
  3. [ ] TypeScript 配置文件（tsconfig.json）正确设置
  4. [ ] 代码可以成功编译（无类型错误）
  5. [ ] ESLint 和 Prettier 配置完成
- **依赖**: 无
- **测试用例**:
  - **测试数据**: 
    - 输入: `npm install` 安装依赖
    - 预期输出: 所有依赖安装成功，无错误
  - **测试场景**:
    1. 运行 `npm run build` 应该成功编译 TypeScript
    2. 运行 `npm run type-check` 应该无类型错误
    3. 运行 `npm run lint` 应该通过代码检查
  - **断言示例**:
    ```typescript
    expect(fs.existsSync('tsconfig.json')).toBe(true)
    expect(fs.existsSync('dist/')).toBe(true)
    expect(process.exitCode).toBe(0)
    ```

### 任务 2: 数据库 Schema 设计和 Prisma 配置
- **ID**: backend-002
- **描述**: 使用 Prisma 设计数据库模型（rooms, room_members, messages, room_events），创建迁移文件
- **测试命令**: `npx prisma migrate dev --name init && npx prisma generate`
- **成功标准**:
  1. [ ] Prisma schema 文件创建完成（prisma/schema.prisma）
  2. [ ] 定义了 4 个数据模型：Room, RoomMember, Message, RoomEvent
  3. [ ] 所有字段类型和约束正确（主键、外键、索引等）
  4. [ ] 迁移文件生成成功
  5. [ ] Prisma Client 生成成功，可以导入使用
- **依赖**: 无
- **测试用例**:
  - **测试数据**: 
    - 输入: Prisma schema 定义
    - 预期输出: 数据库表创建成功
  - **测试场景**:
    1. 运行迁移后，PostgreSQL 中应该存在 4 张表
    2. 表结构应该符合设计文档要求
    3. 索引和外键约束应该正确创建
  - **断言示例**:
    ```typescript
    const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    expect(tables).toContainEqual({table_name: 'Room'})
    expect(tables).toContainEqual({table_name: 'RoomMember'})
    expect(tables).toContainEqual({table_name: 'Message'})
    ```

### 任务 3: Express 服务器基础框架
- **ID**: backend-003
- **描述**: 创建 Express 应用，配置中间件（CORS、JSON 解析、错误处理），设置路由结构
- **测试命令**: `npm test -- express-server.test.ts`
- **成功标准**:
  1. [ ] Express 应用可以启动（监听指定端口）
  2. [ ] CORS 中间件配置正确
  3. [ ] JSON 解析中间件工作正常
  4. [ ] 错误处理中间件可以捕获并格式化错误
  5. [ ] 健康检查端点 `/health` 返回 200
- **依赖**: 任务 1
- **测试用例**:
  - **测试数据**: 
    - 输入: HTTP GET 请求到 `/health`
    - 预期输出: `{status: 'ok', timestamp: '...'}`
  - **测试场景**:
    1. 服务器启动后，健康检查端点应该响应
    2. 发送无效 JSON 请求应该返回 400 错误
    3. 未处理的错误应该返回 500 错误
  - **断言示例**:
    ```typescript
    const response = await request(app).get('/health')
    expect(response.status).toBe(200)
    expect(response.body.status).toBe('ok')
    ```

### 任务 4: 数据库连接和 Prisma Client 集成
- **ID**: backend-004
- **描述**: 配置数据库连接，创建 Prisma Client 单例，实现连接池管理
- **测试命令**: `npm test -- database-connection.test.ts`
- **成功标准**:
  1. [ ] 可以从环境变量读取 DATABASE_URL
  2. [ ] Prisma Client 可以成功连接数据库
  3. [ ] 连接池配置正确（最大连接数、超时等）
  4. [ ] 数据库连接错误可以正确处理
  5. [ ] 应用关闭时正确断开数据库连接
- **依赖**: 任务 2
- **测试用例**:
  - **测试数据**: 
    - 输入: 有效的 DATABASE_URL
    - 预期输出: 数据库连接成功
  - **测试场景**:
    1. 使用有效连接字符串应该成功连接
    2. 使用无效连接字符串应该抛出错误
    3. 连接池应该限制最大连接数
  - **断言示例**:
    ```typescript
    await expect(prisma.$connect()).resolves.not.toThrow()
    const result = await prisma.$queryRaw`SELECT 1 as test`
    expect(result[0].test).toBe(1)
    ```

### 任务 5: Redis 连接和缓存服务
- **ID**: backend-005
- **描述**: 配置 Redis 连接，创建缓存服务封装（房间状态缓存、WebSocket 连接管理）
- **测试命令**: `npm test -- redis-service.test.ts`
- **成功标准**:
  1. [ ] Redis 客户端可以成功连接
  2. [ ] 可以实现基本的 SET/GET 操作
  3. [ ] 可以实现 Set 操作（用于连接管理）
  4. [ ] TTL 设置和自动过期工作正常
  5. [ ] 连接错误可以正确处理和重试
- **依赖**: 无
- **测试用例**:
  - **测试数据**: 
    - 输入: `SET room:123:state '{"url": "https://example.com"}' EX 3600`
    - 预期输出: 值成功存储，1 小时后过期
  - **测试场景**:
    1. 存储房间状态应该成功
    2. 获取房间状态应该返回正确值
    3. TTL 过期后应该自动删除
  - **断言示例**:
    ```typescript
    await redis.set('test:key', 'value', 'EX', 60)
    const value = await redis.get('test:key')
    expect(value).toBe('value')
    const ttl = await redis.ttl('test:key')
    expect(ttl).toBeGreaterThan(0)
    ```

---

## 阶段 2：REST API 实现（1-2 周）

### 任务 6: 房间管理 API - 创建房间
- **ID**: backend-006
- **描述**: 实现 POST /api/v1/rooms 接口，创建房间并返回房间信息
- **测试命令**: `npm test -- --testNamePattern='创建房间'`
- **成功标准**:
  1. [ ] POST 请求可以成功创建房间
  2. [ ] 返回的房间 ID 格式正确（如 room-abc12345）
  3. [ ] 自动创建房主成员记录
  4. [ ] 返回的响应格式符合 API 规范
  5. [ ] 房间信息正确保存到数据库
- **依赖**: 任务 3, 任务 4
- **测试用例**:
  - **测试数据**: 
    - 输入: `{name: "我的房间", hostNickname: "房主"}`
    - 预期输出: `{success: true, data: {id: "room-xxx", name: "我的房间", ...}}`
  - **测试场景**:
    1. 创建房间应该返回 201 状态码
    2. 房间 ID 应该是唯一的
    3. 房主应该自动添加到成员列表
    4. 数据库应该保存房间记录
  - **断言示例**:
    ```typescript
    const response = await request(app).post('/api/v1/rooms').send({name: 'Test Room'})
    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
    expect(response.body.data.id).toMatch(/^room-[a-z0-9]+$/)
    const room = await prisma.room.findUnique({where: {id: response.body.data.id}})
    expect(room).toBeDefined()
    ```

### 任务 7: 房间管理 API - 获取房间信息
- **ID**: backend-007
- **描述**: 实现 GET /api/v1/rooms/:roomId 接口，返回房间详细信息
- **测试命令**: `npm test -- --testNamePattern='获取房间信息'`
- **成功标准**:
  1. [ ] GET 请求可以成功获取存在的房间
  2. [ ] 返回 404 当房间不存在时
  3. [ ] 返回的房间信息包含所有必需字段
  4. [ ] 成员列表正确包含在响应中
  5. [ ] 响应格式符合 API 规范
- **依赖**: 任务 6
- **测试用例**:
  - **测试数据**: 
    - 输入: 有效的 roomId
    - 预期输出: 完整的房间信息对象
  - **测试场景**:
    1. 获取存在的房间应该返回 200
    2. 获取不存在的房间应该返回 404
    3. 响应应该包含成员列表和消息数量
  - **断言示例**:
    ```typescript
    const response = await request(app).get(`/api/v1/rooms/${roomId}`)
    expect(response.status).toBe(200)
    expect(response.body.data.members).toBeArray()
    expect(response.body.data.memberCount).toBeGreaterThanOrEqual(0)
    ```

### 任务 8: 房间管理 API - 更新和删除房间
- **ID**: backend-008
- **描述**: 实现 PUT /api/v1/rooms/:roomId 和 DELETE /api/v1/rooms/:roomId 接口
- **测试命令**: `npm test -- --testNamePattern='更新删除房间'`
- **成功标准**:
  1. [ ] PUT 请求可以更新房间名称
  2. [ ] DELETE 请求可以软删除房间（设置 deleted_at）
  3. [ ] 删除后的房间无法通过 GET 获取
  4. [ ] 返回正确的 HTTP 状态码
  5. [ ] 数据库记录正确更新
- **依赖**: 任务 7
- **测试用例**:
  - **测试数据**: 
    - 输入: `{name: "新房间名"}`
    - 预期输出: 房间名称更新成功
  - **测试场景**:
    1. 更新房间名称应该成功
    2. 删除房间应该设置 deleted_at
    3. 删除后的房间查询应该返回 404
  - **断言示例**:
    ```typescript
    await request(app).put(`/api/v1/rooms/${roomId}`).send({name: 'New Name'})
    const room = await prisma.room.findUnique({where: {id: roomId}})
    expect(room.name).toBe('New Name')
    ```

### 任务 9: 成员管理 API - 加入房间
- **ID**: backend-009
- **描述**: 实现 POST /api/v1/rooms/:roomId/join 接口，允许用户加入房间
- **测试命令**: `npm test -- --testNamePattern='加入房间'`
- **成功标准**:
  1. [ ] POST 请求可以成功加入房间
  2. [ ] 返回新创建的用户 ID 和房间信息
  3. [ ] 成员记录正确保存到数据库
  4. [ ] 如果房间不存在返回 404
  5. [ ] 如果房间已满返回 400（如果设置了限制）
- **依赖**: 任务 7
- **测试用例**:
  - **测试数据**: 
    - 输入: `{nickname: "新成员"}`
    - 预期输出: `{success: true, data: {userId: "user-xxx", roomId: "...", ...}}`
  - **测试场景**:
    1. 加入存在的房间应该成功
    2. 加入不存在的房间应该返回 404
    3. 成员应该添加到数据库
  - **断言示例**:
    ```typescript
    const response = await request(app).post(`/api/v1/rooms/${roomId}/join`).send({nickname: 'New User'})
    expect(response.status).toBe(200)
    expect(response.body.data.userId).toMatch(/^user-[a-z0-9]+$/)
    const member = await prisma.roomMember.findFirst({where: {roomId, userId: response.body.data.userId}})
    expect(member).toBeDefined()
    ```

### 任务 10: 成员管理 API - 离开房间和获取成员列表
- **ID**: backend-010
- **描述**: 实现 POST /api/v1/rooms/:roomId/leave 和 GET /api/v1/rooms/:roomId/members 接口
- **测试命令**: `npm test -- --testNamePattern='成员管理'`
- **成功标准**:
  1. [ ] POST leave 可以成功移除成员
  2. [ ] GET members 返回房间所有成员列表
  3. [ ] 成员离开后数据库记录正确更新（设置 left_at）
  4. [ ] 成员列表按加入时间排序
  5. [ ] 返回格式符合 API 规范
- **依赖**: 任务 9
- **测试用例**:
  - **测试数据**: 
    - 输入: `{userId: "user-xxx"}`
    - 预期输出: 成员成功离开，left_at 字段设置
  - **测试场景**:
    1. 离开房间应该更新 left_at 字段
    2. 获取成员列表应该只返回未离开的成员
    3. 成员列表应该包含所有必需字段
  - **断言示例**:
    ```typescript
    await request(app).post(`/api/v1/rooms/${roomId}/leave`).send({userId})
    const member = await prisma.roomMember.findFirst({where: {roomId, userId}})
    expect(member.leftAt).not.toBeNull()
    ```

### 任务 11: 消息管理 API - 发送消息
- **ID**: backend-011
- **描述**: 实现 POST /api/v1/rooms/:roomId/messages 接口，保存消息到数据库
- **测试命令**: `npm test -- --testNamePattern='发送消息'`
- **成功标准**:
  1. [ ] POST 请求可以成功发送消息
  2. [ ] 消息正确保存到数据库
  3. [ ] 返回的消息包含所有必需字段（id, userId, nickname, content, timestamp）
  4. [ ] 消息内容长度验证（最大 1000 字符）
  5. [ ] 如果房间不存在返回 404
- **依赖**: 任务 9
- **测试用例**:
  - **测试数据**: 
    - 输入: `{userId: "user-xxx", content: "Hello!"}`
    - 预期输出: `{success: true, data: {id: "msg-xxx", content: "Hello!", ...}}`
  - **测试场景**:
    1. 发送消息应该返回 201
    2. 消息应该保存到数据库
    3. 超过 1000 字符的消息应该返回 400
  - **断言示例**:
    ```typescript
    const response = await request(app).post(`/api/v1/rooms/${roomId}/messages`).send({userId, content: 'Hello'})
    expect(response.status).toBe(201)
    expect(response.body.data.content).toBe('Hello')
    const message = await prisma.message.findUnique({where: {id: response.body.data.id}})
    expect(message).toBeDefined()
    ```

### 任务 12: 消息管理 API - 获取消息历史
- **ID**: backend-012
- **描述**: 实现 GET /api/v1/rooms/:roomId/messages 接口，支持分页查询
- **测试命令**: `npm test -- --testNamePattern='消息历史'`
- **成功标准**:
  1. [ ] GET 请求可以获取消息列表
  2. [ ] 支持 limit 和 offset 参数
  3. [ ] 返回分页信息（total, limit, offset, hasMore）
  4. [ ] 消息按时间倒序排列（最新的在前）
  5. [ ] limit 最大值为 100
- **依赖**: 任务 11
- **测试用例**:
  - **测试数据**: 
    - 输入: `?limit=50&offset=0`
    - 预期输出: 最多 50 条消息，包含分页信息
  - **测试场景**:
    1. 获取消息应该返回正确数量
    2. 分页参数应该正确应用
    3. hasMore 应该正确计算
  - **断言示例**:
    ```typescript
    const response = await request(app).get(`/api/v1/rooms/${roomId}/messages?limit=10`)
    expect(response.body.data.messages.length).toBeLessThanOrEqual(10)
    expect(response.body.data.pagination).toBeDefined()
    expect(response.body.data.pagination.hasMore).toBeBoolean()
    ```

### 任务 13: URL 同步 API
- **ID**: backend-013
- **描述**: 实现 PUT /api/v1/rooms/:roomId/url 接口，更新房间共享 URL
- **测试命令**: `npm test -- --testNamePattern='URL同步'`
- **成功标准**:
  1. [ ] PUT 请求可以更新房间 URL
  2. [ ] URL 格式验证（必须是有效的 HTTP/HTTPS URL）
  3. [ ] 数据库记录正确更新
  4. [ ] 返回更新后的 URL 信息
  5. [ ] 如果房间不存在返回 404
- **依赖**: 任务 7
- **测试用例**:
  - **测试数据**: 
    - 输入: `{url: "https://www.bilibili.com/video/xxx", userId: "user-xxx"}`
    - 预期输出: URL 更新成功，返回更新信息
  - **测试场景**:
    1. 更新有效 URL 应该成功
    2. 更新无效 URL 应该返回 400
    3. 数据库应该保存新 URL
  - **断言示例**:
    ```typescript
    const response = await request(app).put(`/api/v1/rooms/${roomId}/url`).send({url: 'https://example.com', userId})
    expect(response.status).toBe(200)
    const room = await prisma.room.findUnique({where: {id: roomId}})
    expect(room.currentUrl).toBe('https://example.com')
    ```

---

## 阶段 3：WebSocket 实时通信（1-2 周）

### 任务 14: WebSocket 服务器基础框架
- **ID**: backend-014
- **描述**: 使用 ws 库创建 WebSocket 服务器，实现连接管理和基础消息处理
- **测试命令**: `npm test -- --testNamePattern='WebSocket服务器'`
- **成功标准**:
  1. [ ] WebSocket 服务器可以启动
  2. [ ] 客户端可以成功连接（通过 roomId 和 userId 参数）
  3. [ ] 连接时验证 roomId 和 userId 的有效性
  4. [ ] 连接信息存储到 Redis（用于多实例支持）
  5. [ ] 连接断开时正确清理资源
- **依赖**: 任务 5, 任务 7
- **测试用例**:
  - **测试数据**: 
    - 输入: WebSocket 连接 `ws://localhost:3001/ws?roomId=room-123&userId=user-456`
    - 预期输出: 连接成功，加入房间
  - **测试场景**:
    1. 使用有效 roomId 和 userId 应该连接成功
    2. 使用无效 roomId 应该拒绝连接
    3. 连接应该存储到 Redis
  - **断言示例**:
    ```typescript
    const ws = new WebSocket('ws://localhost:3001/ws?roomId=valid-room&userId=valid-user')
    await new Promise((resolve) => ws.on('open', resolve))
    expect(ws.readyState).toBe(WebSocket.OPEN)
    const connections = await redis.smembers(`ws:room:valid-room:connections`)
    expect(connections).toContain('valid-user')
    ```

### 任务 15: WebSocket 消息处理 - 状态同步
- **ID**: backend-015
- **描述**: 实现 SYNC_STATE 消息类型，连接时自动发送房间状态
- **测试命令**: `npm test -- --testNamePattern='状态同步'`
- **成功标准**:
  1. [ ] 连接建立时自动发送 SYNC_STATE 消息
  2. [ ] 消息包含当前 URL、成员列表、最近消息
  3. [ ] 客户端发送 SYNC_REQUEST 时响应 SYNC_STATE
  4. [ ] 消息格式符合 WebSocket 协议规范
  5. [ ] 状态数据从数据库和 Redis 正确获取
- **依赖**: 任务 14
- **测试用例**:
  - **测试数据**: 
    - 输入: WebSocket 连接建立
    - 预期输出: 收到 SYNC_STATE 消息，包含完整房间状态
  - **测试场景**:
    1. 连接时应该立即收到 SYNC_STATE
    2. 发送 SYNC_REQUEST 应该收到 SYNC_STATE 响应
    3. 状态应该包含所有必需字段
  - **断言示例**:
    ```typescript
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString())
      if (message.type === 'SYNC_STATE') {
        expect(message.data.currentUrl).toBeDefined()
        expect(message.data.members).toBeArray()
        expect(message.data.recentMessages).toBeArray()
      }
    })
    ```

### 任务 16: WebSocket 消息处理 - 成员加入和离开
- **ID**: backend-016
- **描述**: 实现 MEMBER_JOINED 和 MEMBER_LEFT 消息广播
- **测试命令**: `npm test -- --testNamePattern='成员加入离开'`
- **成功标准**:
  1. [ ] 新成员加入时广播 MEMBER_JOINED 消息
  2. [ ] 成员离开时广播 MEMBER_LEFT 消息
  3. [ ] 消息只发送给同一房间的其他成员
  4. [ ] 成员列表正确更新
  5. [ ] 断开连接时自动触发 MEMBER_LEFT
- **依赖**: 任务 15
- **测试用例**:
  - **测试数据**: 
    - 输入: 新成员加入房间
    - 预期输出: 所有现有成员收到 MEMBER_JOINED 消息
  - **测试场景**:
    1. 新成员加入应该触发广播
    2. 成员离开应该触发广播
    3. 只有房间内其他成员收到消息
  - **断言示例**:
    ```typescript
    const member2Ws = new WebSocket('ws://localhost:3001/ws?roomId=room-123&userId=user-2')
    member2Ws.on('message', (data) => {
      const msg = JSON.parse(data.toString())
      if (msg.type === 'MEMBER_JOINED') {
        expect(msg.data.userId).toBe('user-2')
      }
    })
    ```

### 任务 17: WebSocket 消息处理 - 聊天消息
- **ID**: backend-017
- **描述**: 实现 CHAT_MESSAGE 消息处理，接收客户端消息并广播给房间所有成员
- **测试命令**: `npm test -- --testNamePattern='聊天消息'`
- **成功标准**:
  1. [ ] 客户端发送 CHAT_MESSAGE 可以成功接收
  2. [ ] 消息保存到数据库
  3. [ ] 消息广播给房间内所有成员
  4. [ ] 消息格式验证（内容长度、必需字段）
  5. [ ] 消息包含时间戳和唯一 ID
- **依赖**: 任务 16
- **测试用例**:
  - **测试数据**: 
    - 输入: `{type: "CHAT_MESSAGE", userId: "user-1", nickname: "Alice", content: "Hello"}`
    - 预期输出: 所有成员收到包含消息 ID 和时间戳的 CHAT_MESSAGE
  - **测试场景**:
    1. 发送消息应该保存到数据库
    2. 所有房间成员应该收到消息
    3. 消息应该包含正确的字段
  - **断言示例**:
    ```typescript
    ws.send(JSON.stringify({type: 'CHAT_MESSAGE', userId: 'user-1', nickname: 'Alice', content: 'Hello'}))
    // 等待消息处理
    const message = await prisma.message.findFirst({where: {content: 'Hello'}})
    expect(message).toBeDefined()
    expect(message.userId).toBe('user-1')
    ```

### 任务 18: WebSocket 消息处理 - URL 同步
- **ID**: backend-018
- **描述**: 实现 URL_CHANGE 消息处理，更新房间 URL 并广播 URL_CHANGED
- **测试命令**: `npm test -- --testNamePattern='URL同步'`
- **成功标准**:
  1. [ ] 客户端发送 URL_CHANGE 可以成功接收
  2. [ ] URL 更新到数据库
  3. [ ] URL_CHANGED 消息广播给所有成员
  4. [ ] URL 格式验证
  5. [ ] 消息包含 changedBy 字段
- **依赖**: 任务 17
- **测试用例**:
  - **测试数据**: 
    - 输入: `{type: "URL_CHANGE", userId: "user-1", url: "https://example.com"}`
    - 预期输出: 房间 URL 更新，所有成员收到 URL_CHANGED 消息
  - **测试场景**:
    1. 更改 URL 应该更新数据库
    2. 所有成员应该收到 URL_CHANGED 消息
    3. 无效 URL 应该返回错误
  - **断言示例**:
    ```typescript
    ws.send(JSON.stringify({type: 'URL_CHANGE', userId: 'user-1', url: 'https://example.com'}))
    const room = await prisma.room.findUnique({where: {id: roomId}})
    expect(room.currentUrl).toBe('https://example.com')
    ```

### 任务 19: WebSocket 心跳和连接管理
- **ID**: backend-019
- **描述**: 实现心跳机制（ping/pong），连接超时处理，自动清理断开的连接
- **测试命令**: `npm test -- --testNamePattern='心跳连接管理'`
- **成功标准**:
  1. [ ] 服务器定期发送 ping，客户端响应 pong
  2. [ ] 无响应 5 分钟后自动断开连接
  3. [ ] 断开连接时清理 Redis 中的连接记录
  4. [ ] 断开连接时更新成员 last_active_at
  5. [ ] 连接数限制（每 IP 最多 10 个连接）
- **依赖**: 任务 18
- **测试用例**:
  - **测试数据**: 
    - 输入: WebSocket 连接，5 分钟无活动
    - 预期输出: 连接自动断开，资源清理
  - **测试场景**:
    1. ping/pong 应该正常工作
    2. 超时连接应该自动断开
    3. Redis 连接记录应该清理
  - **断言示例**:
    ```typescript
    // 模拟 5 分钟无活动
    jest.advanceTimersByTime(5 * 60 * 1000)
    expect(ws.readyState).toBe(WebSocket.CLOSED)
    const connections = await redis.smembers(`ws:room:${roomId}:connections`)
    expect(connections).not.toContain(userId)
    ```

---

## 阶段 4：优化和部署（1-2 周）

### 任务 20: 输入验证和错误处理
- **ID**: backend-020
- **描述**: 使用 Zod 实现所有 API 输入验证，统一错误处理中间件
- **测试命令**: `npm test -- --testNamePattern='输入验证'`
- **成功标准**:
  1. [ ] 所有 API 端点都有输入验证 Schema
  2. [ ] 无效输入返回 400 错误，格式符合规范
  3. [ ] 错误响应包含错误代码和描述
  4. [ ] 数据库错误正确捕获和转换
  5. [ ] 日志记录所有错误
- **依赖**: 任务 13
- **测试用例**:
  - **测试数据**: 
    - 输入: 无效的请求数据（缺少必需字段、类型错误等）
    - 预期输出: 400 错误，包含错误详情
  - **测试场景**:
    1. 缺少必需字段应该返回 400
    2. 类型错误应该返回 400
    3. 格式错误应该返回 400
  - **断言示例**:
    ```typescript
    const response = await request(app).post('/api/v1/rooms').send({})
    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
    expect(response.body.error.code).toBeDefined()
    ```

### 任务 21: 限流和防刷
- **ID**: backend-021
- **描述**: 实现 API 限流中间件（IP 限流、用户限流），WebSocket 连接数限制
- **测试命令**: `npm test -- --testNamePattern='限流防刷'`
- **成功标准**:
  1. [ ] IP 限流：100 请求/分钟
  2. [ ] 用户限流：1000 请求/小时
  3. [ ] 超过限制返回 429 错误
  4. [ ] WebSocket 连接数限制：每 IP 最多 10 个
  5. [ ] 限流使用 Redis 实现（支持多实例）
- **依赖**: 任务 5, 任务 20
- **测试用例**:
  - **测试数据**: 
    - 输入: 短时间内发送 101 个请求
    - 预期输出: 第 101 个请求返回 429
  - **测试场景**:
    1. 超过 IP 限流应该返回 429
    2. 超过用户限流应该返回 429
    3. 限流计数器应该正确重置
  - **断言示例**:
    ```typescript
    for (let i = 0; i < 101; i++) {
      await request(app).get('/api/v1/rooms/room-123')
    }
    const response = await request(app).get('/api/v1/rooms/room-123')
    expect(response.status).toBe(429)
    ```

### 任务 22: 日志系统
- **ID**: backend-022
- **描述**: 使用 Pino 实现结构化日志，记录所有关键操作和错误
- **测试命令**: `npm test -- --testNamePattern='日志系统'`
- **成功标准**:
  1. [ ] 所有日志使用 JSON 格式
  2. [ ] 日志级别正确（DEBUG, INFO, WARN, ERROR）
  3. [ ] API 请求和响应记录日志
  4. [ ] WebSocket 连接和消息记录日志
  5. [ ] 错误日志包含堆栈信息
- **依赖**: 任务 3
- **测试用例**:
  - **测试数据**: 
    - 输入: API 请求和错误
    - 预期输出: 日志文件包含结构化 JSON 日志
  - **测试场景**:
    1. API 请求应该记录日志
    2. 错误应该记录 ERROR 级别日志
    3. 日志应该包含时间戳和上下文
  - **断言示例**:
    ```typescript
    const logContent = fs.readFileSync('logs/app.log', 'utf-8')
    const logLines = logContent.split('\n').filter(Boolean)
    const lastLog = JSON.parse(logLines[logLines.length - 1])
    expect(lastLog.level).toBeDefined()
    expect(lastLog.time).toBeDefined()
    ```

### 任务 23: 缓存策略优化
- **ID**: backend-023
- **描述**: 实现房间状态缓存（Redis），减少数据库查询，提高性能
- **测试命令**: `npm test -- --testNamePattern='缓存优化'`
- **成功标准**:
  1. [ ] 房间信息缓存到 Redis（TTL 1 小时）
  2. [ ] 缓存命中时减少数据库查询
  3. [ ] 房间更新时自动失效缓存
  4. [ ] 缓存未命中时从数据库加载并缓存
  5. [ ] 性能提升：P95 响应时间 < 200ms
- **依赖**: 任务 5, 任务 7
- **测试用例**:
  - **测试数据**: 
    - 输入: 多次查询同一房间
    - 预期输出: 第一次查询数据库，后续查询缓存
  - **测试场景**:
    1. 首次查询应该查询数据库并缓存
    2. 后续查询应该使用缓存
    3. 更新房间应该失效缓存
  - **断言示例**:
    ```typescript
    const room1 = await getRoom(roomId) // 查询数据库
    const room2 = await getRoom(roomId) // 使用缓存
    expect(dbQueryCount).toBe(1) // 只查询一次数据库
    ```

### 任务 24: 性能测试和优化
- **ID**: backend-024
- **描述**: 编写性能测试，优化数据库查询和 WebSocket 消息处理
- **测试命令**: `npm run test:performance`
- **成功标准**:
  1. [ ] REST API P95 响应时间 < 200ms
  2. [ ] WebSocket 消息延迟 P95 < 50ms
  3. [ ] 支持 10,000+ 并发 WebSocket 连接（单实例）
  4. [ ] 支持 1,000+ QPS（REST API）
  5. [ ] 数据库查询优化（索引、连接池）
- **依赖**: 任务 23
- **测试用例**:
  - **测试数据**: 
    - 输入: 1000 并发请求
    - 预期输出: P95 响应时间 < 200ms
  - **测试场景**:
    1. 并发请求应该快速响应
    2. WebSocket 消息应该低延迟
    3. 高并发不应该导致错误
  - **断言示例**:
    ```typescript
    const results = await Promise.all(Array(1000).fill(0).map(() => request(app).get(`/api/v1/rooms/${roomId}`)))
    const responseTimes = results.map(r => r.headers['x-response-time'])
    const p95 = calculatePercentile(responseTimes, 95)
    expect(p95).toBeLessThan(200)
    ```

### 任务 25: Docker 容器化
- **ID**: backend-025
- **描述**: 创建 Dockerfile 和 docker-compose.yml，支持本地开发和生产部署
- **测试命令**: `docker-compose up -d && docker-compose ps`
- **成功标准**:
  1. [ ] Dockerfile 可以成功构建镜像
  2. [ ] docker-compose.yml 包含所有服务（API、PostgreSQL、Redis）
  3. [ ] 容器可以正常启动和运行
  4. [ ] 环境变量正确配置
  5. [ ] 健康检查通过
- **依赖**: 任务 24
- **测试用例**:
  - **测试数据**: 
    - 输入: `docker-compose up -d`
    - 预期输出: 所有容器运行正常
  - **测试场景**:
    1. 构建镜像应该成功
    2. 容器启动应该成功
    3. 服务应该可以访问
  - **断言示例**:
    ```bash
    docker-compose ps
    # 所有容器状态应该是 "Up"
    curl http://localhost:3001/health
    # 应该返回 200
    ```

### 任务 26: 单元测试和集成测试
- **ID**: backend-026
- **描述**: 为所有 API 端点和 WebSocket 功能编写完整的测试用例，覆盖率 > 80%
- **测试命令**: `npm test -- --coverage`
- **成功标准**:
  1. [ ] 所有 API 端点都有测试用例
  2. [ ] WebSocket 功能有集成测试
  3. [ ] 测试覆盖率 > 80%
  4. [ ] 所有测试通过
  5. [ ] CI/CD 集成测试
- **依赖**: 任务 25
- **测试用例**:
  - **测试数据**: 
    - 输入: 运行测试套件
    - 预期输出: 所有测试通过，覆盖率报告
  - **测试场景**:
    1. 单元测试应该覆盖所有函数
    2. 集成测试应该覆盖所有 API
    3. 测试应该可以重复运行
  - **断言示例**:
    ```typescript
    npm test -- --coverage
    // 输出应该显示覆盖率 > 80%
    // 所有测试应该通过
    ```

---

## 总结

### 任务统计
- **总任务数**: 26 个
- **阶段 1（基础搭建）**: 5 个任务
- **阶段 2（REST API）**: 8 个任务
- **阶段 3（WebSocket）**: 6 个任务
- **阶段 4（优化部署）**: 7 个任务

### 依赖关系
- 阶段 1 任务可以并行执行（除了任务 3 依赖任务 1）
- 阶段 2 任务依赖阶段 1 完成
- 阶段 3 任务依赖阶段 2 完成
- 阶段 4 任务可以并行执行，但依赖前面阶段

### 预计时间
- **阶段 1**: 2-3 周
- **阶段 2**: 1-2 周
- **阶段 3**: 1-2 周
- **阶段 4**: 1-2 周
- **总计**: 5-9 周（取决于团队规模）

### 下一步
1. 确认任务分解是否合理
2. 使用 `requirement-workflow.sh` 创建 backlog 任务
3. 开始执行阶段 1 任务
