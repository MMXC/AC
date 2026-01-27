---
id: TASK-15
title: 成员管理 API - 加入房间
status: Done
assignee: []
created_date: '2026-01-26 06:37'
updated_date: '2026-01-26 14:39'
labels: []
dependencies: []
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 POST /api/v1/rooms/:roomId/join 接口，允许用户加入房间

**Test Command**: `npm test -- --testNamePattern='加入房间'`

**测试用例**:

**测试数据**:
1. 输入: ``{nickname: "新成员"}``
   预期输出: ``{success: true, data: {userId: "user-xxx", roomId: "...", ...}}``

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
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 POST 请求可以成功加入房间
- [ ] #2 返回新创建的用户 ID 和房间信息
- [ ] #3 成员记录正确保存到数据库
- [ ] #4 如果房间不存在返回 404
- [ ] #5 如果房间已满返回 400（如果设置了限制）
<!-- AC:END -->
