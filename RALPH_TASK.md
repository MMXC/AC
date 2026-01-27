---
backlog_id: backlog-38
task: 创建房间接口改造（POST /api/v1/rooms，创建即指定 URL 且确定房主）
test_command: "cd watch-together-server && npm test -- rooms-create
cd watch-together-server && npm test -- rooms-create"
---

# Task: 创建房间接口改造（POST /api/v1/rooms，创建即指定 URL 且确定房主）

## Description

改造 `POST /api/v1/rooms` 接口，使其在创建房间时必须提供目标网页 URL（或 initialUrl），并在后端进行 http/https 校验。创建 Room 时设置 currentUrl = url，hostId = 新生成的 hostUserId，同时在事务内创建房主 RoomMember 记录（userId = hostUserId, isHost = true）。接口响应中返回 roomId、hostUserId、currentUrl、inviteLink 等信息，供前端直接跳转到房主房间页面使用。

**Test Command**: `cd watch-together-server && npm test -- rooms-create`

**Test Command**: `cd watch-together-server && npm test -- rooms-create`

## Success Criteria

- [x] 不提供 URL 或 URL 非 http/https 时，接口返回 400 且错误信息清晰。
- [x] 提供合法 URL 时，Room 记录中 currentUrl 与 hostId 正确写入。
- [x] 同一事务内成功创建房间与房主成员记录，失败时不留下部分脏数据。
- [x] 接口响应体包含 roomId、hostUserId、currentUrl、inviteLink 字段，并通过已有集成测试校验。
