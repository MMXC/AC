---
id: TASK-27
title: 限流和防刷
status: In Progress
assignee: []
created_date: '2026-01-26 06:38'
updated_date: '2026-01-26 18:07'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 API 限流中间件（IP 限流、用户限流），WebSocket 连接数限制

**Test Command**: `npm test -- --testNamePattern='限流防刷'`

**测试用例**:

**测试数据**:
1. 输入: `短时间内发送 101 个请求`
   预期输出: `第 101 个请求返回 429`

**测试场景**:
1. 超过 IP 限流应该返回 429
2. 超过用户限流应该返回 429
3. 限流计数器应该正确重置

**断言示例**:
1. `for (let i = 0; i < 101; i++) {`
2. `await request(app).get('/api/v1/rooms/room-123')`
3. `}`
4. `const response = await request(app).get('/api/v1/rooms/room-123')`
5. `expect(response.status).toBe(429)`

**Test Command**: `npm test -- --testNamePattern='限流防刷'`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 IP 限流：100 请求/分钟
- [ ] #2 用户限流：1000 请求/小时
- [ ] #3 超过限制返回 429 错误
- [ ] #4 WebSocket 连接数限制：每 IP 最多 10 个
- [ ] #5 限流使用 Redis 实现（支持多实例）
<!-- AC:END -->
