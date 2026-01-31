---
id: TASK-49
title: 'PUT /api/v1/rooms/:roomId/url 更新房间 URL 接口'
status: To Do
assignee: []
created_date: '2026-01-31 05:41'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 PUT /api/v1/rooms/:roomId/url，接收 { url, userId }，校验 userId 为房主后更新 room.currentUrl，返回 { success }。

**Test Command**: `cd watch-together-server && npm run test:api:url`

**Test Command**: `cd watch-together-server && npm run test:api:url`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 接口路径为 /api/v1/rooms/:roomId/url
- [ ] #2 仅房主可更新，非房主返回 403
- [ ] #3 更新后 GET 房间能拿到最新 currentUrl
- [ ] #4 url 需为合法 http/https
<!-- AC:END -->
