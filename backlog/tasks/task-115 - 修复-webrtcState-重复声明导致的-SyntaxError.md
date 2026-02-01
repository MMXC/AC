---
id: TASK-115
title: 修复 webrtcState 重复声明导致的 SyntaxError
status: Done
assignee: []
created_date: '2026-02-01 06:22'
updated_date: '2026-02-01 07:50'
labels: []
dependencies: []
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
webrtc-manager.js 与 screen-streaming.js 均声明顶层变量 `webrtcState`，在同一页面加载时触发 `Identifier 'webrtcState' has already been declared`。需统一状态管理：或将 webrtc-manager 整合进 screen-streaming，或改用不同变量名/命名空间，避免重复声明。

**Test Command**: `docker compose up -d && .cursor/skills/watch-together-webapp-testing/run-test.sh fix-frontend`

**Test Command**: `docker compose up -d && .cursor/skills/watch-together-webapp-testing/run-test.sh fix-frontend`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 页面中仅有一处 `webrtcState` 或等效状态的顶层声明
- [ ] #2 控制台无 "webrtcState has already been declared" 错误
- [ ] #3 屏幕共享与 WebRTC 连接逻辑仍可正常工作
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-02-01 14:50:29 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-115
task: 修复 webrtcState 重复声明导致的 SyntaxError
test_command: "docker compose up -d && .cursor/skills/watch-together-webapp-testing/run-test.sh fix-frontend"
---

# Task: 修复 webrtcState 重复声明导致的 SyntaxError

## Description

webrtc-manager.js 与 screen-streaming.js 均声明顶层变量 `webrtcState`，在同一页面加载时触发 `Identifier 'webrtcState' has already been declared`。需统一状态管理：或将 webrtc-manager 整合进 screen-streaming，或改用不同变量名/命名空间，避免重复声明。

**Test Command**: `docker compose up -d && .cursor/skills/watch-together-webapp-testing/run-test.sh fix-frontend`

**Test Command**: `docker compose up -d && .cursor/skills/watch-together-webapp-testing/run-test.sh fix-frontend`

## Success Criteria

- [x] #1 页面中仅有一处 `webrtcState` 或等效状态的顶层声明
- [x] #2 控制台无 "webrtcState has already been declared" 错误
- [x] #3 屏幕共享与 WebRTC 连接逻辑仍可正常工作

## Implementation Steps

1. **1.1 统一 webrtcState 顶层声明** — done when: 全仓库仅 screen-streaming.js 一处顶层 `webrtcState`，webrtc-manager.js 使用独立命名（如 webrtcManagerState）不冲突。
2. **1.2 验证无重复声明错误** — done when: 打开 join/room 页面，控制台无 "webrtcState has already been declared"。
3. **1.3 验证功能** — done when: 运行 `docker compose up -d && .cursor/skills/watch-together-webapp-testing/run-test.sh fix-frontend` 通过；watch-together 单元测试 webrtc-signaling + screen-streaming 仍通过。
```
<!-- SECTION:NOTES:END -->
