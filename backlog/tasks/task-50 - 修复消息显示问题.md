---
id: TASK-50
title: 修复消息显示问题
status: To Do
assignee: []
created_date: '2026-01-27 15:49'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
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
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `CHAT_MESSAGE` 消息正确处理并添加到历史记录
- [ ] #2 `SYNC_STATE` 消息历史正确加载
- [ ] #3 `renderMessage` 正确渲染单条消息
- [ ] #4 `renderMessages` 正确渲染所有消息历史
- [ ] #5 自己发送的消息正确显示
- [ ] #6 其他成员发送的消息正确显示
- [ ] #7 消息发送后立即显示在聊天区域
<!-- AC:END -->
