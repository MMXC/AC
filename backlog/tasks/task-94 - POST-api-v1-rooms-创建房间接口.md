---
id: TASK-94
title: POST /api/v1/rooms 创建房间接口
status: Done
assignee: []
created_date: '2026-01-31 11:14'
updated_date: '2026-02-02 19:00'
labels: []
dependencies: []
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在 watch-together-server 中实现 POST /api/v1/rooms，接收 { name?, hostNickname?, url }，创建 Room 与房主 RoomMember，返回 { success, data: { roomId, hostId, hostUserId, currentUrl, name, inviteLink, members } }，与 create-room.js 期望格式一致。

**Test Command**: `docker compose up -d && cd watch-together-server && npm run test:api:create`（脚本会先轮询 /health 等待 API 就绪。）
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 接口路径为 /api/v1/rooms，方法 POST
- [ ] #2 接收 name、hostNickname、url（url 必填且为合法 http/https）
- [ ] #3 返回 201 与 JSON，含 success、data.roomId、data.hostUserId、data.currentUrl 等
- [ ] #4 数据库正确插入 Room 和 RoomMember 记录
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-01-31 19:59:56 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-94
task: POST /api/v1/rooms 创建房间接口
test_command: "docker compose up -d && cd watch-together-server && npm run test:api:create"
---

# Task: POST /api/v1/rooms 创建房间接口

## Description

在 watch-together-server 中实现 POST /api/v1/rooms，接收 { name?, hostNickname?, url }，创建 Room 与房主 RoomMember，返回 { success, data: { roomId, hostId, hostUserId, currentUrl, name, inviteLink, members } }，与 create-room.js 期望格式一致。

**Test Command**: `docker compose up -d && cd watch-together-server && npm run test:api:create`（脚本会先轮询 /health 等待 API 就绪。）

## Success Criteria

- [x] #1 接口路径为 /api/v1/rooms，方法 POST
- [x] #2 接收 name、hostNickname、url（url 必填且为合法 http/https）
- [x] #3 返回 201 与 JSON，含 success、data.roomId、data.hostUserId、data.currentUrl 等
- [x] #4 数据库正确插入 Room 和 RoomMember 记录
```
<!-- SECTION:NOTES:END -->
