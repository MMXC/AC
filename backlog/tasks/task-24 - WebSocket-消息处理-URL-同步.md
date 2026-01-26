---
id: TASK-24
title: WebSocket 消息处理 - URL 同步
status: In Progress
assignee: []
created_date: '2026-01-26 06:37'
updated_date: '2026-01-26 17:36'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 URL_CHANGE 消息处理，更新房间 URL 并广播 URL_CHANGED

**Test Command**: `npm test -- --testNamePattern='URL同步'`

**测试用例**:

**测试数据**:
1. 输入: ``{type: "URL_CHANGE", userId: "user-1", url: "https://example.com"}``
   预期输出: `房间 URL 更新，所有成员收到 URL_CHANGED 消息`

**测试场景**:
1. 更改 URL 应该更新数据库
2. 所有成员应该收到 URL_CHANGED 消息
3. 无效 URL 应该返回错误

**断言示例**:
1. `ws.send(JSON.stringify({type: 'URL_CHANGE', userId: 'user-1', url: 'https://example.com'}))`
2. `const room = await prisma.room.findUnique({where: {id: roomId}})`
3. `expect(room.currentUrl).toBe('https://example.com')`

**Test Command**: `npm test -- --testNamePattern='URL同步'`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 客户端发送 URL_CHANGE 可以成功接收
- [ ] #2 URL 更新到数据库
- [ ] #3 URL_CHANGED 消息广播给所有成员
- [ ] #4 URL 格式验证
- [ ] #5 消息包含 changedBy 字段
<!-- AC:END -->
