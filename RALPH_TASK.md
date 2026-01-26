---
backlog_id: backlog-16
task: 成员管理 API - 离开房间和获取成员列表
test_command: "npm test -- --testNamePattern='成员管理'
npm test -- --testNamePattern='成员管理'"
---

# Task: 成员管理 API - 离开房间和获取成员列表

## Description

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

## Success Criteria

- [x] POST leave 可以成功移除成员
- [x] GET members 返回房间所有成员列表
- [x] 成员离开后数据库记录正确更新（设置 left_at）
- [x] 成员列表按加入时间排序
- [x] 返回格式符合 API 规范
