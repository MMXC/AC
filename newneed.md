# 新需求：升级 watch-together 为 WebRTC 实时「房主共享画面」

目标：把「房主 iframe 内容 → 其他成员看到」升级为基于 WebRTC 的实时视频流，由房主共享屏幕/标签页，房间内其他成员实时观看。

**前置条件**：API 测试需 `docker compose up -d` 后运行；测试脚本（如 `test-rooms-api.sh`）会先轮询 `$BASE/health` 等待 API 就绪再发请求，无需在命令中额外等待。E2E 测试由 `skill:watch-together-webapp-testing ${TASK_ID}` 执行（`${TASK_ID}` 在运行时替换为 backlog 分配的任务 ID，避免写死）。

---

## 一、后端接口（watch-together-server）

前端 create-room.js、room.js 依赖 watch-together-server 的 REST API（端口 3000）。当前仅 /health 可用，需实现完整房间接口。以下 API 任务（api-a2～api-a7）的测试脚本（test-rooms-api.sh）会先轮询 `$BASE/health` 等待 API 就绪再发请求。

---

### 任务 api-db1: PostgreSQL 容器与初始化脚本

- **ID**: api-db1
- **描述**: 确保 watch-together 的 PostgreSQL 容器（docker-compose postgres 服务）可正确启动，包含：1) Dockerfile.postgres 或使用 postgres 官方镜像；2) 环境变量 POSTGRES_USER、POSTGRES_PASSWORD、POSTGRES_DB 配置；3) 可选 init SQL 脚本；4) 健康检查 pg_isready。
- **测试命令**: `docker compose up -d postgres && docker compose exec postgres pg_isready -U watchtogether`
- **成功标准**:
  1. [ ] docker compose up postgres 能成功启动
  2. [ ] 健康检查通过，pg_isready 返回 0
  3. [ ] 可通过 DATABASE_URL=postgresql://watchtogether:watchtogether123@localhost:5432/watchtogether 连接
  4. [ ] 重启容器后数据持久化（volumes 配置正确）
- **依赖**: 无

---

### 任务 api-db2: Prisma 迁移脚本与 deploy 流程

- **ID**: api-db2
- **描述**: 在 watch-together-server 中建立 Prisma 迁移脚本流程：1) 创建 migrations 目录与初始迁移；2) 在 package.json 配置 migrate:deploy、migrate:dev；3) CI/启动前可执行 migrate deploy；4) 文档化迁移流程。
- **测试命令**: `docker compose up -d postgres watch-together-server && docker compose exec watch-together-server npm run migrate:deploy`
- **成功标准**:
  1. [ ] prisma/migrations 目录存在且包含迁移文件
  2. [ ] npm run migrate:deploy 能成功执行
  3. [ ] package.json 中有 migrate:deploy、migrate:dev 等 scripts
  4. [ ] README 或 docs 说明迁移流程
- **依赖**: api-db1

---

### 任务 api-db3: 数据库种子脚本（可选）

- **ID**: api-db3
- **描述**: 在 watch-together-server 中提供数据库种子脚本（prisma/seed.ts 或 scripts/seed.js），用于开发/测试环境初始化示例数据。配置 prisma seed 命令，支持 npx prisma db seed。
- **测试命令**: `docker compose up -d postgres watch-together-server && docker compose exec watch-together-server npx prisma db seed`
- **成功标准**:
  1. [ ] prisma/seed.ts 或 scripts/seed.js 存在
  2. [ ] schema.prisma 中配置 generator 的 seed 指向
  3. [ ] npx prisma db seed 能成功执行
  4. [ ] 种子数据可用于本地开发或 E2E 测试
- **依赖**: api-a1
- **备注**: 可选，仅当需要开发/测试初始数据时实现

---

### 任务 api-a1: watch-together-server 数据模型与 Prisma Schema

- **ID**: api-a1
- **描述**: 在 watch-together-server 中定义 Prisma 数据模型：Room（id、name、hostId、currentUrl、inviteLink、createdAt）、RoomMember（id、roomId、userId、nickname、isHost、joinedAt）、Message 等，并配置 DATABASE_URL，运行 prisma migrate deploy。
- **测试命令**: `docker compose up -d postgres watch-together-server && docker compose exec watch-together-server npx prisma validate && docker compose exec watch-together-server npx prisma migrate deploy`
- **成功标准**:
  1. [ ] prisma/schema.prisma 定义 Room、RoomMember、Message 等模型
  2. [ ] 模型字段与前端期望的 roomId、hostId、currentUrl、members 等对应
  3. [ ] prisma migrate deploy 能成功执行
  4. [ ] prisma generate 能生成 Prisma Client
- **依赖**: api-db1, api-db2

---

### 任务 api-a2: POST /api/v1/rooms 创建房间接口

- **ID**: api-a2
- **描述**: 在 watch-together-server 中实现 POST /api/v1/rooms，接收 { name?, hostNickname?, url }，创建 Room 与房主 RoomMember，返回 { success, data: { roomId, hostId, hostUserId, currentUrl, name, inviteLink, members } }，与 create-room.js 期望格式一致。
- **测试命令**: `docker compose up -d && cd watch-together-server && npm run test:api:create`
- **成功标准**:
  1. [ ] 接口路径为 /api/v1/rooms，方法 POST
  2. [ ] 接收 name、hostNickname、url（url 必填且为合法 http/https）
  3. [ ] 返回 201 与 JSON，含 success、data.roomId、data.hostUserId、data.currentUrl 等
  4. [ ] 数据库正确插入 Room 和 RoomMember 记录
- **依赖**: api-a1

---

### 任务 api-a3: GET /api/v1/rooms/:roomId 获取房间接口

- **ID**: api-a3
- **描述**: 实现 GET /api/v1/rooms/:roomId，根据 roomId 查询房间及成员，返回 { success, data: room }，供 room.js validateRoom 使用。
- **测试命令**: `docker compose up -d && cd watch-together-server && npm run test:api:get`
- **成功标准**:
  1. [ ] 接口路径为 /api/v1/rooms/:roomId
  2. [ ] 房间存在时返回 200 与 room 数据（含 members、currentUrl、hostId）
  3. [ ] 房间不存在时返回 404 或 400，含 error 信息
  4. [ ] room 结构与 room.js 预期一致
- **依赖**: api-a1, api-a2

---

### 任务 api-a4: POST /api/v1/rooms/:roomId/join 加入房间接口

- **ID**: api-a4
- **描述**: 实现 POST /api/v1/rooms/:roomId/join，接收 { nickname, userId? }，房主首次加入时传入 userId 以关联，新成员由服务端生成 userId。返回 { success, data: { userId, nickname, room, isHost } }。
- **测试命令**: `docker compose up -d && cd watch-together-server && npm run test:api:join`
- **成功标准**:
  1. [ ] 接口路径为 /api/v1/rooms/:roomId/join
  2. [ ] 房主传入 userId 时正确关联已有房间
  3. [ ] 新成员不传 userId 时服务端生成并返回
  4. [ ] 返回的 room 含最新 members 列表
- **依赖**: api-a3

---

### 任务 api-a5: PUT /api/v1/rooms/:roomId/url 更新房间 URL 接口

- **ID**: api-a5
- **描述**: 实现 PUT /api/v1/rooms/:roomId/url，接收 { url, userId }，校验 userId 为房主后更新 room.currentUrl，返回 { success }。
- **测试命令**: `docker compose up -d && cd watch-together-server && npm run test:api:url`
- **成功标准**:
  1. [ ] 接口路径为 /api/v1/rooms/:roomId/url
  2. [ ] 仅房主可更新，非房主返回 403
  3. [ ] 更新后 GET 房间能拿到最新 currentUrl
  4. [ ] url 需为合法 http/https
- **依赖**: api-a4

---

### 任务 api-a6: POST /api/v1/rooms/:roomId/leave 离开房间接口

- **ID**: api-a6
- **描述**: 实现 POST /api/v1/rooms/:roomId/leave，接收 { userId }，从 RoomMember 中移除该成员或标记离开，返回 { success }。
- **测试命令**: `docker compose up -d && cd watch-together-server && npm run test:api:leave`
- **成功标准**:
  1. [ ] 接口路径为 /api/v1/rooms/:roomId/leave
  2. [ ] 能从房间成员列表中移除或标记该用户
  3. [ ] 返回 200 与 success
  4. [ ] 房间无成员时可选择保留或清理房间
- **依赖**: api-a4

---

### 任务 api-a7: watch-together-server 后端接口汇总（E2E）

- **ID**: api-a7
- **描述**: 汇总 api-a1～api-a6，使 watch-together-server 提供完整 REST 房间接口。前端 create-room、room 等页面可正常调用 localhost:3000，创建房间、加入房间、获取房间、更新 URL、离开房间流程可端到端跑通。
- **测试命令**: `docker compose up -d && cd watch-together-server && npm run test:api`
- **成功标准**:
  1. [ ] POST /api/v1/rooms 创建房间成功
  2. [ ] GET /api/v1/rooms/:roomId 获取房间成功
  3. [ ] POST join、PUT url、POST leave 均能正常执行
  4. [ ] 前端创建房间后能跳转到 /room/:roomId 并加载房间内容
- **依赖**: api-a2, api-a3, api-a4, api-a5, api-a6

---

## 二、前端与 WebRTC

---

### 任务 webrtc-a1: 房主端实现屏幕/标签页采集预览（getDisplayMedia）

- **ID**: webrtc-a1
- **描述**: 在房主房间页面实现「开始共享 / 停止共享」按钮，通过 navigator.mediaDevices.getDisplayMedia 采集屏幕或浏览器标签页，并在本地 <video> 元素中预览。确保点击停止后正确关闭 MediaStream 轨道并清理预览。
- **测试命令**: `skill:watch-together-webapp-testing ${TASK_ID}`
- **成功标准**:
  1. [ ] 点击「开始共享」后浏览器弹出屏幕/标签页选择对话框，用户可成功选择内容
  2. [ ] 选择内容后，本地预览 <video> 可实时显示采集画面
  3. [ ] 点击「停止共享」后，预览停止且 MediaStream 轨道已关闭
  4. [ ] 多次开始/停止共享不会造成异常
- **依赖**: 无

---

### 任务 webrtc-a2: 成员端实现可附加 MediaStream 的视频播放器组件

- **ID**: webrtc-a2
- **描述**: 在成员房间页面实现 VideoPlayer 组件，对外暴露 attachStream(MediaStream) 和 detachStream()，用于播放远端 MediaStream（先用 getUserMedia 模拟）。组件不关心 WebRTC 细节，只关心 MediaStream。
- **测试命令**: `skill:watch-together-webapp-testing ${TASK_ID}`
- **成功标准**:
  1. [ ] VideoPlayer 可多次 attachStream / detachStream 而无内存泄漏或挂死
  2. [ ] 附加合法 MediaStream 时，成员端 <video> 能正常播放画面和（可选）音频
  3. [ ] detachStream 后，视频区域清空或显示「等待流」状态
  4. [ ] 组件不依赖 WebRTC 细节，只关心 MediaStream 对象
- **依赖**: 无

---

### 任务 webrtc-b1: 设计 WebRTC 信令消息协议（基于现有 WebSocket）

- **ID**: webrtc-b1
- **描述**: 基于现有房间 WebSocket/sync 通道，定义 WebRTC 信令消息格式：WEBRTC_OFFER、WEBRTC_ANSWER、WEBRTC_ICE_CANDIDATE 等，以及字段 roomId、fromUserId、toUserId、sdp、candidate。用文档或 TS 类型固化结构。
- **测试命令**: `cd watch-together && npm test -- webrtc-signaling`
- **成功标准**:
  1. [ ] 有文档或 TS 类型清晰列出所有 WebRTC 信令消息的 JSON 结构
  2. [ ] 每个字段有明确含义说明
  3. [ ] 前端信令发送/接收层统一使用这些类型
  4. [ ] 为未来扩展预留扩展点或版本化策略
- **依赖**: 无

---

### 任务 webrtc-b2: 服务器端实现 WebRTC 信令转发（透明路由）

- **ID**: webrtc-b2
- **描述**: 在现有 WebSocket 服务中增加 WebRTC 信令路由：根据 roomId / toUserId 将 WEBRTC_OFFER / WEBRTC_ANSWER / WEBRTC_ICE_CANDIDATE 转发给目标连接，不解析 SDP/ICE 内容。
- **测试命令**: `skill:watch-together-webapp-testing ${TASK_ID}`
- **成功标准**:
  1. [ ] 服务器能识别并转发 WebRTC 信令到正确的目标连接
  2. [ ] 不对 SDP/ICE 做任何修改，仅透明转发
  3. [ ] 目标用户不在线时，有合理警告日志而不会崩溃
  4. [ ] WebRTC 信令不会干扰现有聊天/操作同步消息流
- **依赖**: 无

---

### 任务 webrtc-c1: 单页面内完成 WebRTC Loopback Demo（无服务器）

- **ID**: webrtc-c1
- **描述**: 在单页面中创建 pc1/pc2，通过本地变量传递 offer/answer/ICE，将 getDisplayMedia 或 getUserMedia 得到的流从 pc1 发送到 pc2，展示「本地预览」和「远端播放」两个 <video>，验证 WebRTC API 使用是否正确。
- **测试命令**: `skill:watch-together-webapp-testing ${TASK_ID}`
- **成功标准**:
  1. [ ] pc1 能成功获取 MediaStream 并通过 addTrack 添加到 PeerConnection
  2. [ ] pc1 与 pc2 通过本地变量成功交换 offer/answer/ICE，建立 WebRTC 连接
  3. [ ] pc2 的 <video> 能正常播放从 pc1 发送的远端流
  4. [ ] 停止测试时能正确关闭 PeerConnection 和相关 MediaStream 轨道
- **依赖**: webrtc-a1, webrtc-a2

---

### 任务 webrtc-c2a: 房主端实现 offer 创建与 WEBRTC_OFFER 发送

- **ID**: webrtc-c2a
- **描述**: 在房主端点击「开始共享」时：1) 调用 getDisplayMedia 获取 MediaStream；2) 创建 RTCPeerConnection 并 addTrack；3) createOffer 生成 offer；4) 通过 WebSocket 向目标成员发送 WEBRTC_OFFER（含 roomId、fromUserId、toUserId、sdp）。
- **测试命令**: `skill:watch-together-webapp-testing ${TASK_ID}`
- **成功标准**:
  1. [ ] 点击开始共享后能成功获取 getDisplayMedia 流
  2. [ ] 能正确创建 RTCPeerConnection 并将流轨道添加进去
  3. [ ] createOffer 成功后能通过 WebSocket 发送格式正确的 WEBRTC_OFFER
  4. [ ] WEBRTC_OFFER 包含 toUserId 和 sdp 字段
- **依赖**: webrtc-a1, webrtc-b1, webrtc-b2, webrtc-c1

---

### 任务 webrtc-c2b: 成员端实现 WEBRTC_OFFER 接收与 WEBRTC_ANSWER 回传

- **ID**: webrtc-c2b
- **描述**: 在成员端监听 WebSocket 收到的 WEBRTC_OFFER；创建 RTCPeerConnection，setRemoteDescription(offer)，createAnswer，通过 WebSocket 向房主回传 WEBRTC_ANSWER（含 roomId、fromUserId、toUserId、sdp）。
- **测试命令**: `skill:watch-together-webapp-testing ${TASK_ID}`
- **成功标准**:
  1. [ ] 能正确解析并处理 WebSocket 收到的 WEBRTC_OFFER
  2. [ ] 能创建 RTCPeerConnection 并 setRemoteDescription(offer)
  3. [ ] createAnswer 成功后能通过 WebSocket 发送 WEBRTC_ANSWER
  4. [ ] WEBRTC_ANSWER 的 toUserId 指向房主
- **依赖**: webrtc-a2, webrtc-b1, webrtc-b2, webrtc-c2a

---

### 任务 webrtc-c2c: 双方实现 WEBRTC_ICE_CANDIDATE 收发与 addIceCandidate

- **ID**: webrtc-c2c
- **描述**: 在房主端与成员端的 RTCPeerConnection 上监听 onicecandidate，将候选通过 WebSocket 发送 WEBRTC_ICE_CANDIDATE；接收方解析后调用 addIceCandidate，直至连接建立。
- **测试命令**: `skill:watch-together-webapp-testing ${TASK_ID}`
- **成功标准**:
  1. [ ] 房主与成员端都能在 onicecandidate 中发送 WEBRTC_ICE_CANDIDATE
  2. [ ] 接收方能正确解析并调用 addIceCandidate
  3. [ ] ICE 候选能通过 WebSocket 正确路由到目标连接
  4. [ ] 双方 connectionState 能变为 connected
- **依赖**: webrtc-c2a, webrtc-c2b

---

### 任务 webrtc-c2d: 成员端实现 ontrack 回调并将远端 MediaStream 传给 VideoPlayer

- **ID**: webrtc-c2d
- **描述**: 在成员端 RTCPeerConnection 上设置 ontrack 回调，收到远端流时从 event.streams[0] 获取 MediaStream，调用 VideoPlayer.attachStream(stream)，使成员端 <video> 播放房主共享画面。
- **测试命令**: `skill:watch-together-webapp-testing ${TASK_ID}`
- **成功标准**:
  1. [ ] ontrack 回调能正确触发并获取 event.streams[0]
  2. [ ] 能调用 VideoPlayer.attachStream(stream) 将远端流传入
  3. [ ] 成员端 <video> 能实时播放房主共享画面
  4. [ ] 房主停止共享时，成员端能正确 detachStream 并更新 UI
- **依赖**: webrtc-a2, webrtc-c2b, webrtc-c2c

---

### 任务 webrtc-c2: 通过 WebSocket 信令在房主与单个成员之间建立 WebRTC 连接（汇总）

- **ID**: webrtc-c2
- **描述**: 基于 webrtc-c2a～c2d 完成「房主 ↔ 单一成员」的 WebRTC 媒体通路。房主作为 caller，成员作为 callee，通过 WebSocket 交换 offer/answer/ICE，将房主的 getDisplayMedia 流发送到成员端 VideoPlayer。
- **测试命令**: `skill:watch-together-webapp-testing ${TASK_ID}`
- **成功标准**:
  1. [ ] 房主点击开始共享能向目标成员发送 WEBRTC_OFFER
  2. [ ] 成员收到 WEBRTC_OFFER 后能创建 answer 并用 WEBRTC_ANSWER 回传
  3. [ ] 双方能正确处理 WEBRTC_ICE_CANDIDATE 直至连接建立
  4. [ ] 成员端 VideoPlayer 成功接收远端 MediaStream 并播放画面
- **依赖**: webrtc-c2a, webrtc-c2b, webrtc-c2c, webrtc-c2d

---

### 任务 webrtc-d1: 支持一个房主向所有成员建立 WebRTC 连接

- **ID**: webrtc-d1
- **描述**: 在房主端为房间内每个非房主用户维护独立 RTCPeerConnection，通过 WebSocket 信令为每个成员建立 WebRTC 媒体通路，让所有在线成员都能看到房主视频流。
- **测试命令**: `skill:watch-together-webapp-testing ${TASK_ID}`
- **成功标准**:
  1. [ ] 房主端为每个成员创建并跟踪独立的 PeerConnection（以 userId 为 key）
  2. [ ] 信令层能为每个成员正确路由 WebRTC 信令
  3. [ ] 新成员加入时可增量建立连接，不影响已有连接
  4. [ ] 成员离开时，房主端能关闭对应 PeerConnection 并释放资源
- **依赖**: webrtc-c2

---

### 任务 webrtc-e1: 仅向房主暴露开始/停止共享按钮并与权限系统集成

- **ID**: webrtc-e1
- **描述**: 仅当当前用户为房主时显示共享控制按钮；普通成员不显示或禁用。在后端/信令层增加校验，拒绝普通成员伪造发起共享的 WebRTC 信令，确保只有房主可作为媒体流发送方。
- **测试命令**: `skill:watch-together-webapp-testing ${TASK_ID}`
- **成功标准**:
  1. [ ] currentUser.isOwner === true 时显示共享按钮，否则不显示/禁用
  2. [ ] 普通成员伪造共享请求时，后端拒绝
  3. [ ] 房主停止共享后，按钮/文案状态能及时恢复
  4. [ ] 权限逻辑不影响普通成员正常观看已有 WebRTC 视频流
- **依赖**: webrtc-c2

---

### 任务 webrtc-e2: 成员端播放器 UI 集成与状态展示

- **ID**: webrtc-e2
- **描述**: 将 VideoPlayer 集成到真实房间页面，为成员端提供状态文案（等待房主开始共享 / 正在播放房主画面 / 房主已停止共享），并在 WebRTC 状态变化时正确更新。
- **测试命令**: `skill:watch-together-webapp-testing ${TASK_ID}`
- **成功标准**:
  1. [ ] 房主未开始共享时，成员端显示「等待房主开始共享...」
  2. [ ] WebRTC 建立并收到远端流时，显示视频和「正在播放房主画面」
  3. [ ] 房主停止共享或连接断开时，停止播放并显示「房主已停止共享」或错误提示
  4. [ ] 状态文案与实际连接状态一致
- **依赖**: webrtc-a2, webrtc-c2

---

### 任务 webrtc-f2: WebRTC 错误处理与重试策略

- **ID**: webrtc-f2
- **描述**: 为 getDisplayMedia、ICE 协商失败、信令中断等关键路径增加错误处理和有限重试，为房主/成员提供清晰错误提示，并在合理范围内自动重试或提示用户刷新/重进。
- **测试命令**: `skill:watch-together-webapp-testing ${TASK_ID}`
- **成功标准**:
  1. [ ] 房主拒绝 getDisplayMedia 权限时有明确错误提示
  2. [ ] ICE 长时间协商失败时能超时退出并提示用户检查网络
  3. [ ] WebSocket 信令中断时，前端能检测并停止共享/播放，提示错误
  4. [ ] 对可恢复错误在限制次数内尝试自动重连，失败后给出清晰说明
- **依赖**: webrtc-c2, webrtc-d1
