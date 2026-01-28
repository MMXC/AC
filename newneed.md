# 修复房主跳转后以普通成员身份加入房间的问题 - 任务分解

基于控制台日志分析的问题分解结果。

## 问题分析

### 问题现象
从控制台日志可以看到：
1. `room.js:840 检测到房主身份，自动使用昵称加入房间: alex` - 前端正确检测到房主身份
2. `room.js:417 加入房间成功，服务器返回的 userId: user-8z8eh2gf` - 服务器返回了新的 userId（不是创建房间时的 hostUserId）
3. `room.js:469 普通成员进入房间，显示画面容器占位` - 最终被识别为普通成员

### 根本原因
1. **后端接口设计问题**：`POST /api/v1/rooms/:roomId/join` 接口设计为只创建普通成员，始终生成新的 `userId`，`isHost` 始终为 `false`（见 `watch-together-server/src/routes/rooms.ts:518-520`）
2. **房主加入逻辑缺失**：房主创建房间时已有 `hostUserId`，但跳转后使用 `/join` 接口时，服务器会忽略传入的 `userId`，生成新的 `userId`，导致房主身份丢失
3. **前端判断逻辑问题**：前端在 `room.js:415` 通过 `serverUserId === roomHostId` 判断是否为房主，但由于服务器返回的是新生成的 `userId`，判断结果始终为 `false`

### 解决方案
根据 `room-roles-and-state-model.md` 文档，房主应该使用 `hostId` 重新连接，而不是创建新成员。需要：
1. 修改 `/join` 接口支持可选的 `userId` 参数，如果传入的 `userId` 等于 `Room.hostId`，则识别为房主并复用现有 RoomMember 记录
2. 或者创建新的接口 `/api/v1/rooms/:roomId/host-join` 专门处理房主加入
3. 前端在检测到房主身份时，使用正确的接口和参数

## 分解原则

- **正交性**：任务之间相互独立，可并行执行
- **原子性**：每个任务不可再分，有明确的完成标准
- **可测试性**：每个任务都有明确的测试命令和验收条件

---

### 任务 1: 修改加入房间接口支持房主身份识别
- **ID**: backend-fix-001
- **描述**: 修改 `POST /api/v1/rooms/:roomId/join` 接口，支持可选的 `userId` 参数。如果请求中传入 `userId` 且该 `userId` 等于 `Room.hostId`，则识别为房主，复用现有的 RoomMember 记录（更新 `leftAt` 为 null，`lastActiveAt` 为当前时间），返回 `isHost: true`。如果 `userId` 不等于 `hostId` 或未传入，则按现有逻辑创建新成员。
- **测试命令**: `cd watch-together-server && npm test -- rooms-join`
- **成功标准**:
  1. [ ] `/join` 接口支持可选的 `userId` 请求参数
  2. [ ] 当传入的 `userId` 等于 `Room.hostId` 时，识别为房主
  3. [ ] 房主加入时复用现有 RoomMember 记录，更新 `leftAt` 为 null
  4. [ ] 房主加入时返回 `isHost: true`
  5. [ ] 普通成员加入时仍生成新的 `userId`，返回 `isHost: false`
  6. [ ] 传入无效的 `userId`（不等于 hostId）时，仍创建新成员
  7. [ ] 接口向后兼容，不传 `userId` 时行为不变
- **依赖**: 无
- **测试用例**:
  - **测试数据**: 
    - 输入1: `{ nickname: "房主", userId: "user-abc123" }` (userId = Room.hostId)
    - 预期输出1: `{ userId: "user-abc123", isHost: true }`，复用现有 RoomMember
    - 输入2: `{ nickname: "成员" }` (不传 userId)
    - 预期输出2: `{ userId: "user-new123", isHost: false }`，创建新成员
  - **测试场景**:
    1. 房主使用 hostUserId 加入房间应识别为房主
    2. 普通成员加入房间应创建新成员
    3. 传入无效 userId 应创建新成员
    4. 不传 userId 应保持向后兼容
  - **断言示例**:
    ```typescript
    expect(response.body.data.isHost).toBe(true)
    expect(response.body.data.userId).toBe(hostUserId)
    const member = await prisma.roomMember.findUnique({ where: { userId: hostUserId } })
    expect(member.leftAt).toBeNull()
    ```

### 任务 2: 更新前端房主加入逻辑
- **ID**: frontend-fix-007
- **描述**: 修改 `watch-together/js/room.js` 中的 `joinRoomWithNickname` 函数，当检测到房主身份时（通过 localStorage 中的 `isHost` 标识），在调用 `/join` 接口时传入 `userId` 参数（从 localStorage 读取的 `watch-together.userId`）。确保房主使用正确的 `hostUserId` 加入房间。
- **测试命令**: `cd watch-together && npm test -- room-init`
- **成功标准**:
  1. [ ] `joinRoomWithNickname` 函数检查是否为房主（通过 localStorage 或参数）
  2. [ ] 如果是房主，在 API 请求中传入 `userId` 参数
  3. [ ] 传入的 `userId` 来自 localStorage 中的 `watch-together.userId`
  4. [ ] 普通成员加入时不传 `userId` 参数
  5. [ ] 房主加入后正确识别为房主（`isHost: true`）
  6. [ ] 房主加入后显示房主界面（iframe、修改 URL 按钮等）
- **依赖**: 任务 1
- **测试用例**:
  - **测试数据**: 
    - 输入: localStorage 中有 `watch-together.isHost: 'true'` 和 `watch-together.userId: 'user-abc123'`
    - 预期输出: API 请求包含 `{ nickname: "alex", userId: "user-abc123" }`，返回 `isHost: true`
  - **测试场景**:
    1. 房主自动加入时应传入 hostUserId
    2. 普通成员加入时不应传入 userId
    3. 房主加入后应显示房主界面
    4. 普通成员加入后应显示成员界面
  - **断言示例**:
    ```javascript
    expect(requestBody.userId).toBe(hostUserId)
    expect(joinData.data.isHost).toBe(true)
    expect(window.isHost).toBe(true)
    ```

### 任务 3: 更新加入房间接口的请求验证 Schema
- **ID**: backend-fix-002
- **描述**: 更新 `watch-together-server/src/validation/schemas.ts` 中的 `joinRoomSchema`，添加可选的 `userId` 字段验证。确保 `userId` 格式正确（如果提供），并更新接口文档注释。
- **测试命令**: `cd watch-together-server && npm test -- validation`
- **成功标准**:
  1. [ ] `joinRoomSchema` 包含可选的 `userId` 字段
  2. [ ] `userId` 字段验证格式（如果提供）
  3. [ ] 接口文档注释更新，说明 `userId` 参数的用途
  4. [ ] 验证逻辑正确，无效 `userId` 格式返回 400
  5. [ ] 向后兼容，不传 `userId` 时验证通过
- **依赖**: 无
- **测试用例**:
  - **测试数据**: 
    - 输入1: `{ nickname: "test", userId: "user-abc123" }` (有效格式)
    - 预期输出1: 验证通过
    - 输入2: `{ nickname: "test", userId: "invalid" }` (无效格式)
    - 预期输出2: 返回 400 错误
  - **测试场景**:
    1. 有效的 userId 格式应通过验证
    2. 无效的 userId 格式应返回 400
    3. 不传 userId 应通过验证
  - **断言示例**:
    ```typescript
    expect(() => joinRoomSchema.parse({ nickname: "test", userId: "user-abc123" })).not.toThrow()
    expect(() => joinRoomSchema.parse({ nickname: "test", userId: "invalid" })).toThrow()
    ```

### 任务 4: 添加房主加入房间的集成测试
- **ID**: backend-fix-003
- **描述**: 在 `watch-together-server/tests/` 中添加或更新测试文件，测试房主使用 `hostUserId` 加入房间的场景。验证房主身份识别、RoomMember 记录复用、返回数据正确性。
- **测试命令**: `cd watch-together-server && npm test -- rooms-join-host`
- **成功标准**:
  1. [ ] 测试文件创建或更新完成
  2. [ ] 测试房主使用 hostUserId 加入房间的场景
  3. [ ] 验证返回的 `isHost` 为 `true`
  4. [ ] 验证 RoomMember 记录被正确复用（leftAt 为 null）
  5. [ ] 验证普通成员加入场景不受影响
  6. [ ] 所有测试用例通过
- **依赖**: 任务 1, 任务 3
- **测试用例**:
  - **测试数据**: 
    - 输入: 创建房间后，使用 hostUserId 调用 `/join` 接口
    - 预期输出: 返回 `isHost: true`，RoomMember 记录更新
  - **测试场景**:
    1. 房主首次加入房间（创建时已创建 RoomMember）
    2. 房主重新加入房间（RoomMember 的 leftAt 不为 null）
    3. 普通成员加入房间（不应受影响）
  - **断言示例**:
    ```typescript
    expect(response.body.data.isHost).toBe(true)
    expect(member.leftAt).toBeNull()
    expect(member.lastActiveAt).toBeDefined()
    ```
