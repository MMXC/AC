# 修复房间页面功能问题与错误 - 任务分解

基于 `newneed.md` 需求的正交分解结果。

## 分解原则

- **正交性**：任务之间相互独立，可并行执行
- **原子性**：每个任务不可再分，有明确的完成标准
- **可测试性**：每个任务都有明确的测试命令和验收条件

---

### 任务 1: 修复 API_BASE 变量重复声明错误
- **ID**: frontend-fix-001
- **描述**: 修复 `operation-source.js` 和 `room.js` 中 `API_BASE` 变量重复声明导致的语法错误。统一使用 `window.API_BASE` 作为全局变量，各文件检查并设置，避免重复声明。
- **测试命令**: `cd watch-together && npm test -- operation-source`
- **成功标准**:
  1. [ ] `operation-source.js` 中不再使用 `let API_BASE` 声明，改为使用 `window.API_BASE`
  2. [ ] `room.js` 中统一使用 `window.API_BASE` 或检查是否已定义
  3. [ ] 浏览器控制台无 `Identifier 'API_BASE' has already been declared` 错误
  4. [ ] 两个文件都能正确访问 API_BASE 变量
  5. [ ] API 请求功能正常工作
- **依赖**: 无
- **测试用例**:
  - **测试数据**: 
    - 输入: 打开房间页面，加载所有 JavaScript 文件
    - 预期输出: 控制台无重复声明错误，API 请求正常
  - **测试场景**:
    1. 打开房间页面，检查浏览器控制台应无 `API_BASE` 重复声明错误
    2. 验证 API 请求功能正常（如获取房间信息）
    3. 验证操作来源相关 API 调用正常
  - **断言示例**:
    ```javascript
    expect(typeof window.API_BASE).toBe('string')
    expect(() => { const test = window.API_BASE }).not.toThrow()
    ```

### 任务 2: 修复 WebSocket 消息 JSON 解析错误
- **ID**: frontend-fix-002
- **描述**: 修复 `screen-streaming.js` 中 WebSocket 消息解析错误。`chat.js` 已经解析了 `event.data` 为对象，但 `screen-streaming.js` 再次尝试 `JSON.parse` 导致错误。需要检查 `event.data` 类型，如果已是对象则直接使用。
- **测试命令**: `cd watch-together && npm test -- screen-streaming`
- **成功标准**:
  1. [ ] `screen-streaming.js` 的 `handleWebSocketMessage` 函数检查 `event.data` 类型
  2. [ ] 如果 `event.data` 是字符串，使用 `JSON.parse` 解析
  3. [ ] 如果 `event.data` 已经是对象，直接使用
  4. [ ] 浏览器控制台无 `"[object Object]" is not valid JSON` 错误
  5. [ ] 画面流功能正常工作
- **依赖**: 无
- **测试用例**:
  - **测试数据**: 
    - 输入: WebSocket 消息（字符串或对象格式）
    - 预期输出: 消息正确解析，无 JSON 解析错误
  - **测试场景**:
    1. 接收字符串格式的 WebSocket 消息应正确解析
    2. 接收对象格式的 WebSocket 消息应直接使用
    3. 画面流相关消息应正确处理
  - **断言示例**:
    ```javascript
    expect(() => handleWebSocketMessage({data: '{"type":"test"}'})).not.toThrow()
    expect(() => handleWebSocketMessage({data: {type: 'test'}})).not.toThrow()
    ```

### 任务 3: 修复房主跳转和分享房间链接功能
- **ID**: frontend-fix-003
- **描述**: 修复创建房间后房主未自动跳转的问题，确保创建成功后正确跳转到 `/room/:roomId` 页面。在房间页面添加分享房间链接按钮，房主可见。
- **测试命令**: `cd watch-together && npm test -- create-room-ui`
- **成功标准**:
  1. [ ] 创建房间成功后，房主自动跳转到 `/room/:roomId` 页面
  2. [ ] 跳转逻辑正确执行，无错误阻止跳转
  3. [ ] 房间页面显示分享房间链接按钮（仅房主可见）
  4. [ ] 点击分享按钮可以复制房间链接
  5. [ ] 普通成员不显示分享按钮
- **依赖**: 无
- **测试用例**:
  - **测试数据**: 
    - 输入: 创建房间表单提交
    - 预期输出: 自动跳转到房间页面，显示分享按钮
  - **测试场景**:
    1. 创建房间后应自动跳转到房间页面
    2. 房主进入房间后应看到分享链接按钮
    3. 普通成员进入房间后不应看到分享按钮
    4. 点击分享按钮应复制房间链接到剪贴板
  - **断言示例**:
    ```javascript
    expect(window.location.pathname).toBe(`/room/${roomId}`)
    expect(document.getElementById('shareRoomButton')).not.toBeNull()
    ```

### 任务 4: 修复房主昵称自动读取功能
- **ID**: frontend-fix-004
- **描述**: 房主创建房间时填写的昵称应在跳转后自动读取，无需重新输入。在 `create-room.js` 中将 `hostNickname` 保存到 localStorage，在 `room.js` 的 `init()` 函数中检查是否为房主，如果是则从 localStorage 读取昵称并自动加入房间。
- **测试命令**: `cd watch-together && npm test -- room-init`
- **成功标准**:
  1. [ ] `create-room.js` 创建房间成功后保存 `hostNickname` 到 localStorage
  2. [ ] `room.js` 的 `init()` 函数检查 localStorage 中的 `isHost` 标识
  3. [ ] 如果是房主，从 localStorage 读取昵称
  4. [ ] 房主跳过昵称输入界面，直接调用 `joinRoomWithNickname`
  5. [ ] 普通成员仍显示昵称输入框，功能正常
- **依赖**: 任务 3
- **测试用例**:
  - **测试数据**: 
    - 输入: 创建房间时填写昵称 "房主A"
    - 预期输出: 跳转后自动使用 "房主A" 作为昵称加入房间
  - **测试场景**:
    1. 房主创建房间后跳转，应自动使用创建时的昵称
    2. 房主不应看到昵称输入界面
    3. 普通成员进入房间应看到昵称输入界面
    4. localStorage 中正确保存房主信息
  - **断言示例**:
    ```javascript
    expect(localStorage.getItem('watch-together.hostNickname')).toBe('房主A')
    expect(localStorage.getItem('watch-together.isHost')).toBe('true')
    expect(document.getElementById('nicknameInputContainer').style.display).toBe('none')
    ```

### 任务 5: 修复成员列表显示问题
- **ID**: frontend-fix-005
- **描述**: 修复成员列表显示问题，确保相同房间内所有成员都能完整显示，包括同 IP 打开多个标签页的情况。检查 WebSocket 消息中的成员列表同步逻辑，确保 `MEMBER_JOINED` 事件正确触发并更新成员列表。
- **测试命令**: `cd watch-together && npm test -- room-init`
- **成功标准**:
  1. [ ] WebSocket `MEMBER_JOINED` 事件正确触发
  2. [ ] 成员列表正确更新，显示所有已加入的成员
  3. [ ] 同 IP 多个标签页的成员都能正确显示
  4. [ ] 成员离开时正确从列表移除
  5. [ ] 成员列表 UI 正确渲染
- **依赖**: 无
- **测试用例**:
  - **测试数据**: 
    - 输入: 多个用户（包括同 IP）加入同一房间
    - 预期输出: 成员列表显示所有成员
  - **测试场景**:
    1. 打开多个标签页加入同一房间，所有成员应显示在列表中
    2. 成员加入时应触发 `MEMBER_JOINED` 事件
    3. 成员离开时应从列表中移除
    4. 成员列表应实时更新
  - **断言示例**:
    ```javascript
    expect(membersList.length).toBeGreaterThan(0)
    expect(membersList.find(m => m.id === userId)).toBeDefined()
    ```

### 任务 6: 修复消息显示问题
- **ID**: frontend-fix-006
- **描述**: 修复聊天消息显示问题，确保自己和其它成员发送的消息都能正确显示，包括消息历史同步。检查 `handleWebSocketMessage` 中的 `CHAT_MESSAGE` 处理逻辑，检查 `SYNC_STATE` 中的消息历史加载逻辑，确保 `renderMessage` 和 `renderMessages` 正确渲染所有消息。
- **测试命令**: `cd watch-together && npm test -- 实时聊天`
- **成功标准**:
  1. [ ] `CHAT_MESSAGE` 消息正确处理并添加到历史记录
  2. [ ] `SYNC_STATE` 消息历史正确加载
  3. [ ] `renderMessage` 正确渲染单条消息
  4. [ ] `renderMessages` 正确渲染所有消息历史
  5. [ ] 自己发送的消息正确显示
  6. [ ] 其他成员发送的消息正确显示
  7. [ ] 消息发送后立即显示在聊天区域
- **依赖**: 无
- **测试用例**:
  - **测试数据**: 
    - 输入: 发送聊天消息和接收消息
    - 预期输出: 所有消息正确显示在聊天区域
  - **测试场景**:
    1. 发送消息后应立即显示在聊天区域
    2. 接收其他成员消息应正确显示
    3. 连接 WebSocket 后应加载消息历史
    4. 消息历史应正确渲染
    5. 消息格式正确（发送者、时间、内容）
  - **断言示例**:
    ```javascript
    expect(messageHistory.length).toBeGreaterThan(0)
    expect(document.querySelectorAll('.chat-message').length).toBe(messageHistory.length)
    expect(messageHistory.find(m => m.userId === currentUserId)).toBeDefined()
    ```
