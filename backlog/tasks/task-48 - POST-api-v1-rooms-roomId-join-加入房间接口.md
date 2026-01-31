---
id: TASK-48
title: 'POST /api/v1/rooms/:roomId/join 加入房间接口'
status: To Do
assignee: []
created_date: '2026-01-31 05:40'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 POST /api/v1/rooms/:roomId/join，接收 { nickname, userId? }，房主首次加入时传入 userId 以关联，新成员由服务端生成 userId。返回 { success, data: { userId, nickname, room, isHost } }。

**Test Command**: `cd watch-together-server && npm run test:api:join`

**Test Command**: `cd watch-together-server && npm run test:api:join`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 接口路径为 /api/v1/rooms/:roomId/join
- [ ] #2 房主传入 userId 时正确关联已有房间
- [ ] #3 新成员不传 userId 时服务端生成并返回
- [ ] #4 返回的 room 含最新 members 列表
<!-- AC:END -->
