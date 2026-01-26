---
id: TASK-18
title: 消息管理 API - 获取消息历史
status: In Progress
assignee: []
created_date: '2026-01-26 06:37'
updated_date: '2026-01-26 15:16'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
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
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GET 请求可以获取消息列表
- [ ] #2 支持 limit 和 offset 参数
- [ ] #3 返回分页信息（total, limit, offset, hasMore）
- [ ] #4 消息按时间倒序排列（最新的在前）
- [ ] #5 limit 最大值为 100
<!-- AC:END -->
