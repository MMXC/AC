---
backlog_id: backlog-18
task: 消息管理 API - 获取消息历史
test_command: "npm test -- --testNamePattern='消息历史'
npm test -- --testNamePattern='消息历史'"
---

# Task: 消息管理 API - 获取消息历史

## Description

实现 GET /api/v1/rooms/:roomId/messages 接口，支持分页查询

**Test Command**: `npm test -- --testNamePattern='消息历史'`

**测试用例**:

**测试数据**:
1. 输入: ``?limit=50&offset=0``
   预期输出: `最多 50 条消息，包含分页信息`

**测试场景**:
1. 获取消息应该返回正确数量
2. 分页参数应该正确应用
3. hasMore 应该正确计算

**断言示例**:
1. `const response = await request(app).get(`/api/v1/rooms/${roomId}/messages?limit=10`)`
2. `expect(response.body.data.messages.length).toBeLessThanOrEqual(10)`
3. `expect(response.body.data.pagination).toBeDefined()`
4. `expect(response.body.data.pagination.hasMore).toBeBoolean()`

**Test Command**: `npm test -- --testNamePattern='消息历史'`

## Success Criteria

- [ ] GET 请求可以获取消息列表
- [ ] 支持 limit 和 offset 参数
- [ ] 返回分页信息（total, limit, offset, hasMore）
- [ ] 消息按时间倒序排列（最新的在前）
- [ ] limit 最大值为 100
