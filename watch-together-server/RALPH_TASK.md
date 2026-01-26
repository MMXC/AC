---
backlog_id: task-23
task: WebSocket 消息处理 - 聊天消息
test_command: "npm test -- --testNamePattern='聊天消息'"
---

# Task: WebSocket 消息处理 - 聊天消息

## Description

实现 CHAT_MESSAGE 消息处理，接收客户端消息并广播给房间所有成员

**Test Command**: `npm test -- --testNamePattern='聊天消息'`

**测试用例**:

**测试数据**:
1. 输入: `{type: "CHAT_MESSAGE", userId: "user-1", nickname: "Alice", content: "Hello"}`
   预期输出: `所有成员收到包含消息 ID 和时间戳的 CHAT_MESSAGE`

**测试场景**:
1. 发送消息应该保存到数据库
2. 所有房间成员应该收到消息
3. 消息应该包含正确的字段

**断言示例**:
1. `ws.send(JSON.stringify({type: 'CHAT_MESSAGE', userId: 'user-1', nickname: 'Alice', content: 'Hello'}))`
2. `// 等待消息处理`
3. `const message = await prisma.message.findFirst({where: {content: 'Hello'}})`
4. `expect(message).toBeDefined()`
5. `expect(message.userId).toBe('user-1')`

**Test Command**: `npm test -- --testNamePattern='聊天消息'`

## Success Criteria

- [x] 客户端发送 CHAT_MESSAGE 可以成功接收
- [x] 消息保存到数据库
- [x] 消息广播给房间内所有成员
- [x] 消息格式验证（内容长度、必需字段）
- [x] 消息包含时间戳和唯一 ID
