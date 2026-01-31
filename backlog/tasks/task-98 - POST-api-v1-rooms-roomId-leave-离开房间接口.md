---
id: TASK-98
title: 'POST /api/v1/rooms/:roomId/leave 离开房间接口'
status: To Do
assignee: []
created_date: '2026-01-31 11:15'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 POST /api/v1/rooms/:roomId/leave，接收 { userId }，从 RoomMember 中移除该成员或标记离开，返回 { success }。

**Test Command**: `docker compose up -d && cd watch-together-server && npm run test:api:leave`

**Test Command**: `docker compose up -d && cd watch-together-server && npm run test:api:leave`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 接口路径为 /api/v1/rooms/:roomId/leave
- [ ] #2 能从房间成员列表中移除或标记该用户
- [ ] #3 返回 200 与 success
- [ ] #4 房间无成员时可选择保留或清理房间
<!-- AC:END -->
