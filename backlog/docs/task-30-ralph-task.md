---
backlog_id: backlog-30
task: 性能测试和优化
test_command: "npm run test:performance
npm run test:performance"
---

# Task: 性能测试和优化

## Description

编写性能测试，优化数据库查询和 WebSocket 消息处理

**Test Command**: `npm run test:performance`

**测试用例**:

**测试数据**:
1. 输入: `1000 并发请求`
   预期输出: `P95 响应时间 < 200ms`

**测试场景**:
1. 并发请求应该快速响应
2. WebSocket 消息应该低延迟
3. 高并发不应该导致错误

**断言示例**:
1. `const results = await Promise.all(Array(1000).fill(0).map(() => request(app).get(`/api/v1/rooms/${roomId}`)))`
2. `const responseTimes = results.map(r => r.headers['x-response-time'])`
3. `const p95 = calculatePercentile(responseTimes, 95)`
4. `expect(p95).toBeLessThan(200)`

**Test Command**: `npm run test:performance`

## Success Criteria

- [x] REST API P95 响应时间 < 200ms
- [x] WebSocket 消息延迟 P95 < 50ms
- [x] 支持 10,000+ 并发 WebSocket 连接（单实例）
- [x] 支持 1,000+ QPS（REST API）
- [x] 数据库查询优化（索引、连接池）
