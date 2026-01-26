---
backlog_id: backlog-14
task: 房间管理 API - 更新和删除房间
test_command: "npm test -- --testNamePattern='更新删除房间'
npm test -- --testNamePattern='更新删除房间'"
---

# Task: 房间管理 API - 更新和删除房间

## Description

实现 PUT /api/v1/rooms/:roomId 和 DELETE /api/v1/rooms/:roomId 接口

**Test Command**: `npm test -- --testNamePattern='更新删除房间'`

**测试用例**:

**测试数据**:
1. 输入: ``{name: "新房间名"}``
   预期输出: `房间名称更新成功`

**测试场景**:
1. 更新房间名称应该成功
2. 删除房间应该设置 deleted_at
3. 删除后的房间查询应该返回 404

**断言示例**:
1. `await request(app).put(`/api/v1/rooms/${roomId}`).send({name: 'New Name'})`
2. `const room = await prisma.room.findUnique({where: {id: roomId}})`
3. `expect(room.name).toBe('New Name')`

**Test Command**: `npm test -- --testNamePattern='更新删除房间'`

## Success Criteria

- [ ] PUT 请求可以更新房间名称
- [ ] DELETE 请求可以软删除房间（设置 deleted_at）
- [ ] 删除后的房间无法通过 GET 获取
- [ ] 返回正确的 HTTP 状态码
- [ ] 数据库记录正确更新
