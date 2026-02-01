---
id: TASK-115
title: 修复 webrtcState 重复声明导致的 SyntaxError
status: To Do
assignee: []
created_date: '2026-02-01 06:22'
labels: []
dependencies: []
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
