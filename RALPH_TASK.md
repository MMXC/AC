---
backlog_id: backlog-94
task: POST /api/v1/rooms 创建房间接口
test_command: "docker compose up -d && cd watch-together-server && npm run test:api:create"
---

# Task: POST /api/v1/rooms 创建房间接口

## Description

在 watch-together-server 中实现 POST /api/v1/rooms，接收 { name?, hostNickname?, url }，创建 Room 与房主 RoomMember，返回 { success, data: { roomId, hostId, hostUserId, currentUrl, name, inviteLink, members } }，与 create-room.js 期望格式一致。

**Test Command**: `docker compose up -d && cd watch-together-server && npm run test:api:create`

**Test Command**: `docker compose up -d && cd watch-together-server && npm run test:api:create`

## Success Criteria

- [x] #1 接口路径为 /api/v1/rooms，方法 POST
- [x] #2 接收 name、hostNickname、url（url 必填且为合法 http/https）
- [x] #3 返回 201 与 JSON，含 success、data.roomId、data.hostUserId、data.currentUrl 等
- [x] #4 数据库正确插入 Room 和 RoomMember 记录
