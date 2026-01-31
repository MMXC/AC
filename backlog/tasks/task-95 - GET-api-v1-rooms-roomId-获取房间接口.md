---
id: TASK-95
title: 'GET /api/v1/rooms/:roomId 获取房间接口'
status: To Do
assignee: []
created_date: '2026-01-31 11:15'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 GET /api/v1/rooms/:roomId，根据 roomId 查询房间及成员，返回 { success, data: room }，供 room.js validateRoom 使用。

**Test Command**: `docker compose up -d && cd watch-together-server && npm run test:api:get`

**Test Command**: `docker compose up -d && cd watch-together-server && npm run test:api:get`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 接口路径为 /api/v1/rooms/:roomId
- [ ] #2 房间存在时返回 200 与 room 数据（含 members、currentUrl、hostId）
- [ ] #3 房间不存在时返回 404 或 400，含 error 信息
- [ ] #4 room 结构与 room.js 预期一致
<!-- AC:END -->
