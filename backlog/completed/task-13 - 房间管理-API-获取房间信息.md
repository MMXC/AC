---
id: TASK-13
title: 房间管理 API - 获取房间信息
status: Done
assignee: []
created_date: '2026-01-26 06:36'
updated_date: '2026-01-26 14:18'
labels: []
dependencies: []
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 GET /api/v1/rooms/:roomId 接口，返回房间详细信息

**Test Command**: `npm test -- --testNamePattern='获取房间信息'`

**测试用例**:

**测试数据**:
1. 输入: `有效的 roomId`
   预期输出: `完整的房间信息对象`

**测试场景**:
1. 获取存在的房间应该返回 200
2. 获取不存在的房间应该返回 404
3. 响应应该包含成员列表和消息数量

**断言示例**:
1. `const response = await request(app).get(`/api/v1/rooms/${roomId}`)`
2. `expect(response.status).toBe(200)`
3. `expect(response.body.data.members).toBeArray()`
4. `expect(response.body.data.memberCount).toBeGreaterThanOrEqual(0)`

**Test Command**: `npm test -- --testNamePattern='获取房间信息'`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GET 请求可以成功获取存在的房间
- [ ] #2 返回 404 当房间不存在时
- [ ] #3 返回的房间信息包含所有必需字段
- [ ] #4 成员列表正确包含在响应中
- [ ] #5 响应格式符合 API 规范
<!-- AC:END -->
