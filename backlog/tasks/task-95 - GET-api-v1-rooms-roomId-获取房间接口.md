---
id: TASK-95
title: 'GET /api/v1/rooms/:roomId 获取房间接口'
status: Done
assignee: []
created_date: '2026-01-31 11:15'
updated_date: '2026-02-01 05:45'
labels: []
dependencies: []
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 GET /api/v1/rooms/:roomId，根据 roomId 查询房间及成员，返回 { success, data: room }，供 room.js validateRoom 使用。

**Test Command**: `docker compose up -d && cd watch-together-server && npm run test:api:get`（脚本会先轮询 /health 等待 API 就绪。）
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 接口路径为 /api/v1/rooms/:roomId
- [ ] #2 房间存在时返回 200 与 room 数据（含 members、currentUrl、hostId）
- [ ] #3 房间不存在时返回 404 或 400，含 error 信息
- [ ] #4 room 结构与 room.js 预期一致
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-02-01 13:45:53 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
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

- [x] #1 接口路径为 /api/v1/rooms/:roomId
- [x] #2 房间存在时返回 200 与 room 数据（含 members、currentUrl、hostId）
- [x] #3 房间不存在时返回 404 或 400，含 error 信息
- [x] #4 room 结构与 room.js 预期一致

## Implementation Steps

1. **1.1 确认/补充 GET 路由与 handler** — done when: GET /api/v1/rooms/:roomId 存在且返回 200 时 body 含 success、data（含 roomId、name、members、currentUrl、hostId）
2. **1.2 房间不存在时返回 404** — done when: GET 不存在的 roomId 返回 404 且 body 含 success: false、error
3. **1.3 room 含 hostId 与 room.js 一致** — done when: buildRoomPayload 或 GET 返回的 data 含 hostId（房主 userId，即 roomId+'-host'）
4. **2.1 运行测试** — done when: `docker compose up -d && cd watch-together-server && npm run test:api:get` 通过
```
<!-- SECTION:NOTES:END -->
