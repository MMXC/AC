---
backlog_id: backlog-22
task: WebSocket 消息处理 - 成员加入和离开
test_command: "npm test -- --testNamePattern='成员加入离开'
npm test -- --testNamePattern='成员加入离开'"
---

# Task: WebSocket 消息处理 - 成员加入和离开

## Description

实现 MEMBER_JOINED 和 MEMBER_LEFT 消息广播

**Test Command**: `npm test -- --testNamePattern='成员加入离开'`

**测试用例**:

**测试数据**:
1. 输入: `新成员加入房间`
   预期输出: `所有现有成员收到 MEMBER_JOINED 消息`

**测试场景**:
1. 新成员加入应该触发广播
2. 成员离开应该触发广播
3. 只有房间内其他成员收到消息

**断言示例**:
1. `const member2Ws = new WebSocket('ws://localhost:3001/ws?roomId=room-123&userId=user-2')`
2. `member2Ws.on('message', (data) => {`
3. `const msg = JSON.parse(data.toString())`
4. `if (msg.type === 'MEMBER_JOINED') {`
5. `expect(msg.data.userId).toBe('user-2')`
6. `}`
7. `})`

**Test Command**: `npm test -- --testNamePattern='成员加入离开'`

## Success Criteria

- [x] 新成员加入时广播 MEMBER_JOINED 消息
- [x] 成员离开时广播 MEMBER_LEFT 消息
- [x] 消息只发送给同一房间的其他成员
- [x] 成员列表正确更新
- [x] 断开连接时自动触发 MEMBER_LEFT
