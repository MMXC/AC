---
backlog_id: backlog-50
task: 修复消息显示问题
test_command: "cd watch-together && npm test -- 实时聊天
cd watch-together && npm test -- 实时聊天"
---

# Task: 修复消息显示问题

## Description

修复聊天消息显示问题，确保自己和其它成员发送的消息都能正确显示，包括消息历史同步。检查 `handleWebSocketMessage` 中的 `CHAT_MESSAGE` 处理逻辑，检查 `SYNC_STATE` 中的消息历史加载逻辑，确保 `renderMessage` 和 `renderMessages` 正确渲染所有消息。

**Test Command**: `cd watch-together && npm test -- 实时聊天`

**测试用例**:

**测试数据**:
1. 输入: `发送聊天消息和接收消息`
   预期输出: `所有消息正确显示在聊天区域`

**测试场景**:
1. 发送消息后应立即显示在聊天区域
2. 接收其他成员消息应正确显示
3. 连接 WebSocket 后应加载消息历史
4. 消息历史应正确渲染
5. 消息格式正确（发送者、时间、内容）

**断言示例**:
1. `expect(messageHistory.length).toBeGreaterThan(0)`
2. `expect(document.querySelectorAll('.chat-message').length).toBe(messageHistory.length)`
3. `expect(messageHistory.find(m => m.userId === currentUserId)).toBeDefined()`

**Test Command**: `cd watch-together && npm test -- 实时聊天`

## Success Criteria

- [ ] `CHAT_MESSAGE` 消息正确处理并添加到历史记录
- [ ] `SYNC_STATE` 消息历史正确加载
- [ ] `renderMessage` 正确渲染单条消息
- [ ] `renderMessages` 正确渲染所有消息历史
- [ ] 自己发送的消息正确显示
- [ ] 其他成员发送的消息正确显示
- [ ] 消息发送后立即显示在聊天区域
