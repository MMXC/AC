---
id: TASK-116
title: 修复 API_BASE 重复声明导致的 SyntaxError
status: Done
assignee: []
created_date: '2026-02-01 06:22'
updated_date: '2026-02-01 06:56'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-02-01 14:56:53 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
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

- [x] #1 顶层仅在一处声明或初始化 API_BASE
- [x] #2 room.js 与 operation-source.js 均可正确获取 API 根地址
- [x] #3 控制台无 "API_BASE has already been declared" 错误

## Implementation Steps

1. **1.1 仅在一处初始化 API_BASE** — done when: 仅 room.js 在 window 上设置 `window.API_BASE`，无顶层 `const API_BASE` 声明。
2. **1.2 room.js 使用 getApiBase()** — done when: room.js 内所有请求使用 `getApiBase()` 获取 API 根地址，控制台无 "API_BASE has already been declared"。
3. **1.3 运行 fix-frontend 测试** — done when: `docker compose up -d && .cursor/skills/watch-together-webapp-testing/run-test.sh fix-frontend` 通过。
```
<!-- SECTION:NOTES:END -->
