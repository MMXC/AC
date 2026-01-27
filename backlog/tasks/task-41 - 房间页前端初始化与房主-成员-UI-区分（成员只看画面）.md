---
id: TASK-41
title: 房间页前端初始化与房主/成员 UI 区分（成员只看画面）
status: Done
assignee: []
created_date: '2026-01-27 09:43'
updated_date: '2026-01-27 14:14'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
改造 `watch-together/js/room.js`：去掉对 `?url=` 查询参数的依赖。在调用 `/join` 成功后，从 `joinData.data.room.currentUrl` 中获取 URL 并（仅在房主端）通过 iframe 加载真实网页。普通成员端不再直接创建 iframe 指向真实网页，而是预留一个“画面容器”（如 video/canvas），用于后续接收房主画面流。UI 上，房主看到 URL 修改入口（调用 PUT /rooms/:roomId/url），普通成员不显示 URL 或相关输入框。

**Test Command**: `cd watch-together && npm test -- room-init`

**Test Command**: `cd watch-together && npm test -- room-init`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 房主首次进入房间时，真实 iframe 自动加载 currentUrl，且有“修改 URL”按钮。
- [ ] #2 普通成员进入时，看不到任何 URL/输入框，只显示一个“画面区域”占位（后续用于接入画面流）。
- [ ] #3 房主修改 URL 后，本地 iframe 立即更新，其它成员不会再单独加载 iframe，而只是等待画面流更新（可先用占位图/文案验证逻辑）。
- [ ] #4 所有变更在主流浏览器中无前端报错。
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-01-27 22:14:43 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-41
task: 房间页前端初始化与房主/成员 UI 区分（成员只看画面）
test_command: "cd watch-together && npm test -- room-init
cd watch-together && npm test -- room-init"
---

# Task: 房间页前端初始化与房主/成员 UI 区分（成员只看画面）

## Description

改造 `watch-together/js/room.js`：去掉对 `?url=` 查询参数的依赖。在调用 `/join` 成功后，从 `joinData.data.room.currentUrl` 中获取 URL 并（仅在房主端）通过 iframe 加载真实网页。普通成员端不再直接创建 iframe 指向真实网页，而是预留一个“画面容器”（如 video/canvas），用于后续接收房主画面流。UI 上，房主看到 URL 修改入口（调用 PUT /rooms/:roomId/url），普通成员不显示 URL 或相关输入框。

**Test Command**: `cd watch-together && npm test -- room-init`

**Test Command**: `cd watch-together && npm test -- room-init`

## Success Criteria

- [x] 房主首次进入房间时，真实 iframe 自动加载 currentUrl，且有“修改 URL”按钮。
- [x] 普通成员进入时，看不到任何 URL/输入框，只显示一个“画面区域”占位（后续用于接入画面流）。
- [x] 房主修改 URL 后，本地 iframe 立即更新，其它成员不会再单独加载 iframe，而只是等待画面流更新（可先用占位图/文案验证逻辑）。
- [x] 所有变更在主流浏览器中无前端报错。
```
<!-- SECTION:NOTES:END -->
