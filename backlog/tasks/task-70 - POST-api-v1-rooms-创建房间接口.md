---
id: TASK-70
title: POST /api/v1/rooms 创建房间接口
status: To Do
assignee: []
created_date: '2026-01-31 10:13'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在 watch-together-server 中实现 POST /api/v1/rooms，接收 { name?, hostNickname?, url }，创建 Room 与房主 RoomMember，返回 { success, data: { roomId, hostId, hostUserId, currentUrl, name, inviteLink, members } }，与 create-room.js 期望格式一致。

**Test Command**: `docker compose up -d && cd watch-together-server && npm run test:api:create`

**Test Command**: `docker compose up -d && cd watch-together-server && npm run test:api:create`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 接口路径为 /api/v1/rooms，方法 POST
- [ ] #2 接收 name、hostNickname、url（url 必填且为合法 http/https）
- [ ] #3 返回 201 与 JSON，含 success、data.roomId、data.hostUserId、data.currentUrl 等
- [ ] #4 数据库正确插入 Room 和 RoomMember 记录
<!-- AC:END -->
