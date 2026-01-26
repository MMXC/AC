---
id: TASK-21
title: WebSocket 消息处理 - 状态同步
status: To Do
assignee: []
created_date: '2026-01-26 06:37'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 SYNC_STATE 消息类型，连接时自动发送房间状态

**Test Command**: `npm test -- --testNamePattern='状态同步'`

**测试用例**:

**测试数据**:
1. 输入: `WebSocket 连接建立`
   预期输出: `收到 SYNC_STATE 消息，包含完整房间状态`

**测试场景**:
1. 连接时应该立即收到 SYNC_STATE
2. 发送 SYNC_REQUEST 应该收到 SYNC_STATE 响应
3. 状态应该包含所有必需字段

**断言示例**:
1. `ws.on('message', (data) => {`
2. `const message = JSON.parse(data.toString())`
3. `if (message.type === 'SYNC_STATE') {`
4. `expect(message.data.currentUrl).toBeDefined()`
5. `expect(message.data.members).toBeArray()`
6. `expect(message.data.recentMessages).toBeArray()`
7. `}`
8. `})`

**Test Command**: `npm test -- --testNamePattern='状态同步'`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 连接建立时自动发送 SYNC_STATE 消息
- [ ] #2 消息包含当前 URL、成员列表、最近消息
- [ ] #3 客户端发送 SYNC_REQUEST 时响应 SYNC_STATE
- [ ] #4 消息格式符合 WebSocket 协议规范
- [ ] #5 状态数据从数据库和 Redis 正确获取
<!-- AC:END -->
