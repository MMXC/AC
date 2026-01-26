---
id: TASK-16
title: 成员管理 API - 离开房间和获取成员列表
status: To Do
assignee: []
created_date: '2026-01-26 06:37'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 POST /api/v1/rooms/:roomId/leave 和 GET /api/v1/rooms/:roomId/members 接口

**Test Command**: `npm test -- --testNamePattern='成员管理'`

**测试用例**:

**测试数据**:
1. 输入: ``{userId: "user-xxx"}``
   预期输出: `成员成功离开，left_at 字段设置`

**测试场景**:
1. 离开房间应该更新 left_at 字段
2. 获取成员列表应该只返回未离开的成员
3. 成员列表应该包含所有必需字段

**断言示例**:
1. `await request(app).post(`/api/v1/rooms/${roomId}/leave`).send({userId})`
2. `const member = await prisma.roomMember.findFirst({where: {roomId, userId}})`
3. `expect(member.leftAt).not.toBeNull()`

**Test Command**: `npm test -- --testNamePattern='成员管理'`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 POST leave 可以成功移除成员
- [ ] #2 GET members 返回房间所有成员列表
- [ ] #3 成员离开后数据库记录正确更新（设置 left_at）
- [ ] #4 成员列表按加入时间排序
- [ ] #5 返回格式符合 API 规范
<!-- AC:END -->
