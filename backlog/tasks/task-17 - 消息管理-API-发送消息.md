---
id: TASK-17
title: 消息管理 API - 发送消息
status: In Progress
assignee: []
created_date: '2026-01-26 06:37'
updated_date: '2026-01-26 15:00'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 POST /api/v1/rooms/:roomId/messages 接口，保存消息到数据库

**Test Command**: `npm test -- --testNamePattern='发送消息'`

**测试用例**:

**测试数据**:
1. 输入: ``{userId: "user-xxx", content: "Hello!"}``
   预期输出: ``{success: true, data: {id: "msg-xxx", content: "Hello!", ...}}``

**测试场景**:
1. 发送消息应该返回 201
2. 消息应该保存到数据库
3. 超过 1000 字符的消息应该返回 400

**断言示例**:
1. `const response = await request(app).post(`/api/v1/rooms/${roomId}/messages`).send({userId, content: 'Hello'})`
2. `expect(response.status).toBe(201)`
3. `expect(response.body.data.content).toBe('Hello')`
4. `const message = await prisma.message.findUnique({where: {id: response.body.data.id}})`
5. `expect(message).toBeDefined()`

**Test Command**: `npm test -- --testNamePattern='发送消息'`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 POST 请求可以成功发送消息
- [ ] #2 消息正确保存到数据库
- [ ] #3 返回的消息包含所有必需字段（id, userId, nickname, content, timestamp）
- [ ] #4 消息内容长度验证（最大 1000 字符）
- [ ] #5 如果房间不存在返回 404
<!-- AC:END -->
