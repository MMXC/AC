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

- [ ] #1 页面中仅有一处 `webrtcState` 或等效状态的顶层声明
- [ ] #2 控制台无 "webrtcState has already been declared" 错误
- [ ] #3 屏幕共享与 WebRTC 连接逻辑仍可正常工作

## Implementation Steps

<!-- 细化约定时填写：步骤 + 每步验收，例如 -->
<!-- 1.1 加路由 — done when: GET /api/v1/rooms 返回 200 -->
<!-- 1.2 写 handler — done when: POST 入参校验失败返回 400 -->
