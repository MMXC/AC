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

- [ ] #1 接口路径为 /api/v1/rooms，方法 POST
- [ ] #2 接收 name、hostNickname、url（url 必填且为合法 http/https）
- [ ] #3 返回 201 与 JSON，含 success、data.roomId、data.hostUserId、data.currentUrl 等
- [ ] #4 数据库正确插入 Room 和 RoomMember 记录

## Implementation Steps

<!-- 细化约定时填写：步骤 + 每步验收，例如 -->
<!-- 1.1 加路由 — done when: GET /api/v1/rooms 返回 200 -->
<!-- 1.2 写 handler — done when: POST 入参校验失败返回 400 -->
