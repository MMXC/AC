### 任务 1: 明确角色与房间状态模型（房主 / 成员 + 仅房主持有真实网页）
- **ID**: backend-001
- **描述**: 设计并文档化新的角色与房间状态模型：房主是创建房间的人且唯一不可变更；普通成员只能通过分享链接加入，永远不是房主。房主浏览器内通过 iframe 打开真实网页，普通成员端不再直接嵌入 iframe，而是仅看到房主浏览器画面的实时画面（视频流或画布投影）。在数据模型层面明确 Room.currentUrl（真实网页 URL）、Room.hostId（房主 userId）、可选 Room.operationSourceUserId（被指定为“输入来源”的成员 userId），并给出状态流转说明（创建房间、房主刷新/重连、成员加入/离开）。
- **测试命令**: `cat watch-together-server/TASK_VERIFICATION.md | grep "角色与房间状态模型"`
- **成功标准**:
1. [ ] 有一份文档或者注释，清晰描述房主 / 普通成员的职责边界以及房主不可变更规则。
2. [ ] 数据模型中明确存在 hostId 与 currentUrl 字段，并说明它们的单一真源语义。
3. [ ] 文档中明确写出“普通成员只看到画面，不直接访问被嵌入网页 DOM”这一约束。
4. [ ] 描述清楚房主刷新或重进房间时如何保持房主身份的一致性。
- **依赖**: 无
- **测试用例**:
  - **测试场景**:
    1. 打开文档即可理解当前房间中谁是房主、谁是成员，以及他们分别能做什么。

### 任务 2: 后端数据模型调整（Room / RoomMember / 可选 operationSourceUserId）
- **ID**: backend-002
- **描述**: 基于任务 1 的模型设计，更新 Prisma schema 与数据库迁移：确保 Room 表中存在 hostId、currentUrl 字段；RoomMember 表中有 isHost 字段且仅在创建时设置，不允许后续随意修改。如需要支持“指定操作来源成员”，为 Room 增加 operationSourceUserId 字段（或单独状态表）。确保迁移脚本在现有数据上安全运行，同时更新 TypeScript 类型定义与相关服务（如 roomCacheService）。
- **测试命令**: `cd watch-together-server && npm test -- schema`
- **成功标准**:
1. [ ] Prisma schema 中 Room 与 RoomMember 结构与任务 1 的模型设计一致。
2. [ ] 运行数据库迁移脚本不会破坏已有数据，且新字段非空策略合理（必要时有默认值或可为空）。
3. [ ] TypeScript 代码中引用 Room / RoomMember 的地方都能正常编译通过（无类型错误）。
4. [ ] 获取房间详情接口返回的数据结构包括 hostId 与 currentUrl。
- **依赖**: backend-001

### 任务 3: 创建房间接口改造（POST /api/v1/rooms，创建即指定 URL 且确定房主）
- **ID**: backend-003
- **描述**: 改造 `POST /api/v1/rooms` 接口，使其在创建房间时必须提供目标网页 URL（或 initialUrl），并在后端进行 http/https 校验。创建 Room 时设置 currentUrl = url，hostId = 新生成的 hostUserId，同时在事务内创建房主 RoomMember 记录（userId = hostUserId, isHost = true）。接口响应中返回 roomId、hostUserId、currentUrl、inviteLink 等信息，供前端直接跳转到房主房间页面使用。
- **测试命令**: `cd watch-together-server && npm test -- rooms-create`
- **成功标准**:
1. [ ] 不提供 URL 或 URL 非 http/https 时，接口返回 400 且错误信息清晰。
2. [ ] 提供合法 URL 时，Room 记录中 currentUrl 与 hostId 正确写入。
3. [ ] 同一事务内成功创建房间与房主成员记录，失败时不留下部分脏数据。
4. [ ] 接口响应体包含 roomId、hostUserId、currentUrl、inviteLink 字段，并通过已有集成测试校验。
- **依赖**: backend-002

### 任务 4: 加入房间接口与 URL 权限控制（仅房主可改 URL）
- **ID**: backend-004
- **描述**: 调整 `POST /api/v1/rooms/:roomId/join` 逻辑：每次 join 都生成新的 RoomMember(userId = generateUserId, isHost = false)，不再在 join 里重新判定房主。响应体中保留 room.hostId、room.currentUrl 与当前成员 isHost（永远为 false）。同时完善 `PUT /api/v1/rooms/:roomId/url` 接口：仅当 userId === room.hostId 时允许更新 currentUrl，其它请求返回 403。成功更新后通过 WebSocket 广播 URL_CHANGED 消息。确保后端对 WebSocket 的 URL_CHANGE 消息也做同样的房主权限校验。
- **测试命令**: `cd watch-together-server && npm test -- rooms-join-url`
- **成功标准**:
1. [ ] 同一房间多次 join 会创建多个非房主成员记录，且 hostId 始终指向唯一房主。
2. [ ] 非房主调用 URL 更新接口得到 403，房主调用成功并更新 Room.currentUrl。
3. [ ] 成功更新 URL 后，WebSocket 有 URL_CHANGED 广播，payload 中包含新的 URL。
4. [ ] 对恶意构造的 WebSocket URL_CHANGE 消息，非房主连接被拒绝或返回 ERROR。
- **依赖**: backend-002, backend-003

### 任务 5: 创建房间前端页面改造（强制填写 URL 并作为房主进入房间）
- **ID**: backend-005
- **描述**: 更新 `watch-together/js/create-room.js` 与对应 HTML：在创建房间表单中增加“目标网址 URL”必填输入框（前端校验 http/https），请求体发送 { name?, hostNickname?, url } 给后端的创建房间接口。成功后，根据响应中的 roomId 和 hostUserId 直接跳转到房间页面（/room/:roomId），并在 URL 或本地存储中保存必要的标识以便房主端初始化使用。
- **测试命令**: `cd watch-together && npm test -- create-room-ui`
- **成功标准**:
1. [ ] 前端在 URL 为空或非法时阻止提交，并给出友好错误提示。
2. [ ] 正确填写时会调用新的创建房间接口并成功获取 roomId、currentUrl。
3. [ ] 创建完成后浏览器自动打开房主房间页面，且无需再额外手动拼接 ?url。
4. [ ] 浏览器控制台无新增报错，E2E 测试通过。
- **依赖**: backend-003

### 任务 6: 房间页前端初始化与房主/成员 UI 区分（成员只看画面）
- **ID**: backend-006
- **描述**: 改造 `watch-together/js/room.js`：去掉对 `?url=` 查询参数的依赖。在调用 `/join` 成功后，从 `joinData.data.room.currentUrl` 中获取 URL 并（仅在房主端）通过 iframe 加载真实网页。普通成员端不再直接创建 iframe 指向真实网页，而是预留一个“画面容器”（如 video/canvas），用于后续接收房主画面流。UI 上，房主看到 URL 修改入口（调用 PUT /rooms/:roomId/url），普通成员不显示 URL 或相关输入框。
- **测试命令**: `cd watch-together && npm test -- room-init`
- **成功标准**:
1. [ ] 房主首次进入房间时，真实 iframe 自动加载 currentUrl，且有“修改 URL”按钮。
2. [ ] 普通成员进入时，看不到任何 URL/输入框，只显示一个“画面区域”占位（后续用于接入画面流）。
3. [ ] 房主修改 URL 后，本地 iframe 立即更新，其它成员不会再单独加载 iframe，而只是等待画面流更新（可先用占位图/文案验证逻辑）。
4. [ ] 所有变更在主流浏览器中无前端报错。
- **依赖**: backend-004, backend-005

### 任务 7: 画面流/屏幕投影通路设计与最小实现（房主 → 普通成员）
- **ID**: backend-007
- **描述**: 设计并实现一条“房主浏览器画面 → 普通成员前端”的画面同步通路的最小可行版本，例如：房主端使用 getDisplayMedia 或 Canvas 截图+编码，将画面推送到服务器或直接通过 WebRTC/WebSocket 推送给普通成员；普通成员前端只负责在 video/canvas 容器中播放该画面。此任务重点是确定技术路线与基本 API 形态，代码可以先实现简单低帧率版本确认整体链路可行。
- **测试命令**: `cd watch-together && npm test -- screen-streaming-basic`
- **成功标准**:
1. [ ] 在开发环境中，房主端点击“开始共享画面”后，至少一名普通成员页面能看到房主浏览器的大致实时画面（允许有延迟与低帧率）。
2. [ ] 普通成员全程未直接访问被嵌入网页的 DOM，仅操作画面容器。
3. [ ] 房主停止共享或离开房间时，普通成员端能收到合理的停止提示或回退为占位画面。
4. [ ] 画面链路的错误情况（权限拒绝、浏览器不支持等）有日志或 UI 提示。
- **依赖**: backend-006

### 任务 8: “指定操作来源成员”与房主端执行逻辑（仅房主执行真实操作）
- **ID**: backend-008
- **描述**: 基于前述数据模型与画面流，完整实现“指定操作来源成员”的逻辑：在 Room 中维护 operationSourceUserId（或状态表），提供 `POST /api/v1/rooms/:roomId/operation-source` 接口（仅房主可调用）设置/清除操作来源。前端成员列表增加右键或菜单项“设为操作来源/取消”，房主可选择某成员。被指定成员端，仅在“画面层”监听点击/拖动等操作，将这些输入事件封装为 OP_SOURCE_OPERATION WebSocket 消息发给服务器，服务器仅转发给房主连接。房主端收到后，在本地真实 iframe 页面内模拟这些操作，最终效果通过画面流自然同步给所有成员。
- **测试命令**: `cd watch-together && npm test -- operation-source`
- **成功标准**:
1. [ ] 只有房主可以成功设置/取消 operationSourceUserId，普通成员调用返回 403 或 ERROR。
2. [ ] 被指定成员在画面上点击/拖动时，房主真实页面产生对应操作，其它成员只通过画面看到结果，无 DOM 级事件。
3. [ ] 未被指定成员在画面上点击不会触发任何远程执行。
4. [ ] 取消操作来源后，之前的成员再操作画面不会再触发房主端执行。
- **依赖**: backend-001, backend-002, backend-006, backend-007

### 任务 9: 权限、安全与连接稳定性校验
- **ID**: backend-009
- **描述**: 对整个系统的权限链路与连接策略做一次收尾检查：确保所有关键接口（创建房间、更新 URL、设置操作来源、画面流通路）在后端都有硬性权限校验，前端 UI 只是“提示”，不是安全边界。针对 WebSocket 连接数限制（如每 IP 最大 10 个）完善前端重连策略：在 1008 关闭码时停止重连并给出提示（如“连接过多，请关闭多余页面后刷新”），避免重连风暴。补充必要的日志与文档说明。
- **测试命令**: `cd watch-together-server && npm test -- security && cd ../watch-together && npm test -- ws-stability`
- **成功标准**:
1. [ ] 用 curl 或自制脚本伪造非房主请求关键接口均被拒绝（403 或 ERROR）。
2. [ ] WebSocket 在 1008 情况下不会无限重连，前端有清晰提示。
3. [ ] 多 tab / 多设备同时访问同一房间时，系统行为可预期且不会压垮后端。
4. [ ] TASK_VERIFICATION.md 中有对应验证步骤说明，便于回归测试。
- **依赖**: backend-003, backend-004, backend-008