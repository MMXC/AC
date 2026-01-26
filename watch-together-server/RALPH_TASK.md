---
backlog_id: task-15
task: 成员管理 API - 加入房间
test_command: "npm test -- --testNamePattern='加入房间'"
---

# Task: 成员管理 API - 加入房间

## Description

实现 POST /api/v1/rooms/:roomId/join 接口，允许用户加入房间

**Test Command**: `npm test -- --testNamePattern='加入房间'`

**测试用例**:

**测试数据**:
1. 输入: `{nickname: "新成员"}`
   预期输出: `{success: true, data: {userId: "user-xxx", roomId: "...", ...}}`

**测试场景**:
1. 加入存在的房间应该成功
2. 加入不存在的房间应该返回 404
3. 成员应该添加到数据库

**断言示例**:
1. `const response = await request(app).post(`/api/v1/rooms/${roomId}/join`).send({nickname: 'New User'})`
2. `expect(response.status).toBe(200)`
3. `expect(response.body.data.userId).toMatch(/^user-[a-z0-9]+$/)`
4. `const member = await prisma.roomMember.findFirst({where: {roomId, userId: response.body.data.userId}})`
5. `expect(member).toBeDefined()`

**Test Command**: `npm test -- --testNamePattern='加入房间'`

## Success Criteria

- [x] POST 请求可以成功加入房间
- [x] 返回新创建的用户 ID 和房间信息
- [x] 成员记录正确保存到数据库
- [x] 如果房间不存在返回 404
- [x] 如果房间已满返回 400（如果设置了限制）
