---
id: TASK-116
title: 修复 API_BASE 重复声明导致的 SyntaxError
status: In Progress
assignee: []
created_date: '2026-02-01 06:22'
updated_date: '2026-02-01 06:53'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
room.js 与 operation-source.js 均在顶层声明 `const API_BASE`，在同一页面加载时触发 `Identifier 'API_BASE' has already been declared`。改为从 `window.API_BASE` 或统一配置模块读取，仅在一处完成初始化与声明。

**Test Command**: `docker compose up -d && .cursor/skills/watch-together-webapp-testing/run-test.sh fix-frontend`

**Test Command**: `docker compose up -d && .cursor/skills/watch-together-webapp-testing/run-test.sh fix-frontend`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 顶层仅在一处声明或初始化 API_BASE
- [ ] #2 room.js 与 operation-source.js 均可正确获取 API 根地址
- [ ] #3 控制台无 "API_BASE has already been declared" 错误
<!-- AC:END -->
