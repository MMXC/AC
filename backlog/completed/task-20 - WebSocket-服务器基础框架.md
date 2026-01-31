---
id: TASK-20
title: WebSocket 服务器基础框架
status: Done
assignee: []
created_date: '2026-01-26 06:37'
updated_date: '2026-01-26 16:12'
labels: []
dependencies: []
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
使用 ws 库创建 WebSocket 服务器，实现连接管理和基础消息处理

**Test Command**: `npm test -- --testNamePattern='WebSocket服务器'`

**测试用例**:

**测试数据**:
1. 输入: `WebSocket 连接 `ws://localhost:3001/ws?roomId=room-123&userId=user-456``
   预期输出: `连接成功，加入房间`

**测试场景**:
1. 使用有效 roomId 和 userId 应该连接成功
2. 使用无效 roomId 应该拒绝连接
3. 连接应该存储到 Redis

**断言示例**:
1. `const ws = new WebSocket('ws://localhost:3001/ws?roomId=valid-room&userId=valid-user')`
2. `await new Promise((resolve) => ws.on('open', resolve))`
3. `expect(ws.readyState).toBe(WebSocket.OPEN)`
4. `const connections = await redis.smembers(`ws:room:valid-room:connections`)`
5. `expect(connections).toContain('valid-user')`

**Test Command**: `npm test -- --testNamePattern='WebSocket服务器'`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WebSocket 服务器可以启动
- [ ] #2 客户端可以成功连接（通过 roomId 和 userId 参数）
- [ ] #3 连接时验证 roomId 和 userId 的有效性
- [ ] #4 连接信息存储到 Redis（用于多实例支持）
- [ ] #5 连接断开时正确清理资源
<!-- AC:END -->
