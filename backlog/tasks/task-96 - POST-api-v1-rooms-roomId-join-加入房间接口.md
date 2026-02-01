---
id: TASK-96
title: 'POST /api/v1/rooms/:roomId/join 加入房间接口'
status: Done
assignee: []
created_date: '2026-01-31 11:15'
updated_date: '2026-02-01 07:49'
labels: []
dependencies: []
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 POST /api/v1/rooms/:roomId/join，接收 { nickname, userId? }，房主首次加入时传入 userId 以关联，新成员由服务端生成 userId。返回 { success, data: { userId, nickname, room, isHost } }。

**Test Command**: `docker compose up -d && cd watch-together-server && npm run test:api:join`（脚本会先轮询 /health 等待 API 就绪。）
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 接口路径为 /api/v1/rooms/:roomId/join
- [ ] #2 房主传入 userId 时正确关联已有房间
- [ ] #3 新成员不传 userId 时服务端生成并返回
- [ ] #4 返回的 room 含最新 members 列表
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-02-01 01:23:40 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-96
task: POST /api/v1/rooms/:roomId/join 加入房间接口
test_command: "docker compose up -d && cd watch-together-server && npm run test:api:join"
---

# Task: POST /api/v1/rooms/:roomId/join 加入房间接口

## Description

实现 POST /api/v1/rooms/:roomId/join，接收 { nickname, userId? }，房主首次加入时传入 userId 以关联，新成员由服务端生成 userId。返回 { success, data: { userId, nickname, room, isHost } }。

**Test Command**: `docker compose up -d && cd watch-together-server && npm run test:api:join`（脚本会先轮询 /health 等待 API 就绪。）

## Success Criteria

- [x] #1 接口路径为 /api/v1/rooms/:roomId/join
- [x] #2 房主传入 userId 时正确关联已有房间
- [x] #3 新成员不传 userId 时服务端生成并返回
- [x] #4 返回的 room 含最新 members 列表
```
<!-- SECTION:NOTES:END -->
