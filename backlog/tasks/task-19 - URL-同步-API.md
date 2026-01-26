---
id: TASK-19
title: URL 同步 API
status: In Progress
assignee: []
created_date: '2026-01-26 06:37'
updated_date: '2026-01-26 15:31'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 PUT /api/v1/rooms/:roomId/url 接口，更新房间共享 URL

**Test Command**: `npm test -- --testNamePattern='URL同步'`

**测试用例**:

**测试数据**:
1. 输入: ``{url: "https://www.bilibili.com/video/xxx", userId: "user-xxx"}``
   预期输出: `URL 更新成功，返回更新信息`

**测试场景**:
1. 更新有效 URL 应该成功
2. 更新无效 URL 应该返回 400
3. 数据库应该保存新 URL

**断言示例**:
1. `const response = await request(app).put(`/api/v1/rooms/${roomId}/url`).send({url: 'https://example.com', userId})`
2. `expect(response.status).toBe(200)`
3. `const room = await prisma.room.findUnique({where: {id: roomId}})`
4. `expect(room.currentUrl).toBe('https://example.com')`

**Test Command**: `npm test -- --testNamePattern='URL同步'`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 PUT 请求可以更新房间 URL
- [ ] #2 URL 格式验证（必须是有效的 HTTP/HTTPS URL）
- [ ] #3 数据库记录正确更新
- [ ] #4 返回更新后的 URL 信息
- [ ] #5 如果房间不存在返回 404
<!-- AC:END -->
