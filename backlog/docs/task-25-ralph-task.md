---
backlog_id: backlog-25
task: WebSocket 心跳和连接管理
test_command: "npm test -- --testNamePattern='心跳连接管理'
npm test -- --testNamePattern='心跳连接管理'"
---

# Task: WebSocket 心跳和连接管理

## Description

实现心跳机制（ping/pong），连接超时处理，自动清理断开的连接

**Test Command**: `npm test -- --testNamePattern='心跳连接管理'`

**测试用例**:

**测试数据**:
1. 输入: `WebSocket 连接，5 分钟无活动`
   预期输出: `连接自动断开，资源清理`

**测试场景**:
1. ping/pong 应该正常工作
2. 超时连接应该自动断开
3. Redis 连接记录应该清理

**断言示例**:
1. `// 模拟 5 分钟无活动`
2. `jest.advanceTimersByTime(5 * 60 * 1000)`
3. `expect(ws.readyState).toBe(WebSocket.CLOSED)`
4. `const connections = await redis.smembers(`ws:room:${roomId}:connections`)`
5. `expect(connections).not.toContain(userId)`

**Test Command**: `npm test -- --testNamePattern='心跳连接管理'`

## Success Criteria

- [x] 服务器定期发送 ping，客户端响应 pong
- [x] 无响应 5 分钟后自动断开连接
- [x] 断开连接时清理 Redis 中的连接记录
- [x] 断开连接时更新成员 last_active_at
- [x] 连接数限制（每 IP 最多 10 个连接）
