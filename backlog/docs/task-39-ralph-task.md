---
backlog_id: backlog-39
task: 加入房间接口与 URL 权限控制（仅房主可改 URL）
test_command: "cd watch-together-server && npm test -- rooms-join-url
cd watch-together-server && npm test -- rooms-join-url"
---

# Task: 加入房间接口与 URL 权限控制（仅房主可改 URL）

## Description

调整 `POST /api/v1/rooms/:roomId/join` 逻辑：每次 join 都生成新的 RoomMember(userId = generateUserId, isHost = false)，不再在 join 里重新判定房主。响应体中保留 room.hostId、room.currentUrl 与当前成员 isHost（永远为 false）。同时完善 `PUT /api/v1/rooms/:roomId/url` 接口：仅当 userId === room.hostId 时允许更新 currentUrl，其它请求返回 403。成功更新后通过 WebSocket 广播 URL_CHANGED 消息。确保后端对 WebSocket 的 URL_CHANGE 消息也做同样的房主权限校验。

**Test Command**: `cd watch-together-server && npm test -- rooms-join-url`

**Test Command**: `cd watch-together-server && npm test -- rooms-join-url`

## Success Criteria

- [x] 同一房间多次 join 会创建多个非房主成员记录，且 hostId 始终指向唯一房主。
- [x] 非房主调用 URL 更新接口得到 403，房主调用成功并更新 Room.currentUrl。
- [x] 成功更新 URL 后，WebSocket 有 URL_CHANGED 广播，payload 中包含新的 URL。
- [x] 对恶意构造的 WebSocket URL_CHANGE 消息，非房主连接被拒绝或返回 ERROR。
