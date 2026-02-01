---
backlog_id: backlog-116
task: 修复 API_BASE 重复声明导致的 SyntaxError
test_command: "docker compose up -d && .cursor/skills/watch-together-webapp-testing/run-test.sh fix-frontend"
---

# Task: 修复 API_BASE 重复声明导致的 SyntaxError

## Description

room.js 与 operation-source.js 均在顶层声明 `const API_BASE`，在同一页面加载时触发 `Identifier 'API_BASE' has already been declared`。改为从 `window.API_BASE` 或统一配置模块读取，仅在一处完成初始化与声明。

**Test Command**: `docker compose up -d && .cursor/skills/watch-together-webapp-testing/run-test.sh fix-frontend`

**Test Command**: `docker compose up -d && .cursor/skills/watch-together-webapp-testing/run-test.sh fix-frontend`

## Success Criteria

- [ ] #1 顶层仅在一处声明或初始化 API_BASE
- [ ] #2 room.js 与 operation-source.js 均可正确获取 API 根地址
- [ ] #3 控制台无 "API_BASE has already been declared" 错误

## Implementation Steps

<!-- 细化约定时填写：步骤 + 每步验收，例如 -->
<!-- 1.1 加路由 — done when: GET /api/v1/rooms 返回 200 -->
<!-- 1.2 写 handler — done when: POST 入参校验失败返回 400 -->
