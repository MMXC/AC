---
backlog_id: backlog-95
task: GET /api/v1/rooms/:roomId 获取房间接口
test_command: "docker compose up -d && cd watch-together-server && npm run test:api:get"
---

# Task: GET /api/v1/rooms/:roomId 获取房间接口

## Description

实现 GET /api/v1/rooms/:roomId，根据 roomId 查询房间及成员，返回 { success, data: room }，供 room.js validateRoom 使用。

**Test Command**: `docker compose up -d && cd watch-together-server && npm run test:api:get`（脚本会先轮询 /health 等待 API 就绪。）

## Success Criteria

- [ ] #1 接口路径为 /api/v1/rooms/:roomId
- [ ] #2 房间存在时返回 200 与 room 数据（含 members、currentUrl、hostId）
- [ ] #3 房间不存在时返回 404 或 400，含 error 信息
- [ ] #4 room 结构与 room.js 预期一致

## Implementation Steps

<!-- 细化约定时填写：步骤 + 每步验收，例如 -->
<!-- 1.1 加路由 — done when: GET /api/v1/rooms 返回 200 -->
<!-- 1.2 写 handler — done when: POST 入参校验失败返回 400 -->
