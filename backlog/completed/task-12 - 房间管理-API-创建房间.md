---
id: TASK-12
title: 房间管理 API - 创建房间
status: Done
assignee: []
created_date: '2026-01-26 06:36'
updated_date: '2026-01-26 14:18'
labels: []
dependencies: []
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 POST /api/v1/rooms 接口，创建房间并返回房间信息

**Test Command**: `npm test -- --testNamePattern='创建房间'`

**测试用例**:

**测试数据**:
1. 输入: ``{name: "我的房间", hostNickname: "房主"}``
   预期输出: ``{success: true, data: {id: "room-xxx", name: "我的房间", ...}}``

**测试场景**:
1. 创建房间应该返回 201 状态码
2. 房间 ID 应该是唯一的
3. 房主应该自动添加到成员列表
4. 数据库应该保存房间记录

**断言示例**:
1. `const response = await request(app).post('/api/v1/rooms').send({name: 'Test Room'})`
2. `expect(response.status).toBe(201)`
3. `expect(response.body.success).toBe(true)`
4. `expect(response.body.data.id).toMatch(/^room-[a-z0-9]+$/)`
5. `const room = await prisma.room.findUnique({where: {id: response.body.data.id}})`
6. `expect(room).toBeDefined()`

**Test Command**: `npm test -- --testNamePattern='创建房间'`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 POST 请求可以成功创建房间
- [ ] #2 返回的房间 ID 格式正确（如 room-abc12345）
- [ ] #3 自动创建房主成员记录
- [ ] #4 返回的响应格式符合 API 规范
- [ ] #5 房间信息正确保存到数据库
<!-- AC:END -->
