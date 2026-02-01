---
id: TASK-117
title: 修复 WebSocket 连接时 userId 格式校验与后端不一致
status: To Do
assignee: []
created_date: '2026-02-01 06:22'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
加入房间后，后端返回 UUID 格式的 userId（如 `8f0bb8e5-9711-419b-8481-accbdf28ace2`），但 chat.js 与 sync.js 中 WebSocket 连接前校验 userId 为正则 `/^user-[a-z0-9]{8}$/`，导致「userId 格式不正确」而无法连接。需将校验规则更新为同时支持 UUID 格式（或与后端约定一致），使新成员能正常连接聊天与操作同步 WebSocket。

**Test Command**: `docker compose up -d && .cursor/skills/watch-together-webapp-testing/run-test.sh fix-frontend`

**Test Command**: `docker compose up -d && .cursor/skills/watch-together-webapp-testing/run-test.sh fix-frontend`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 chat.js 中 userId 格式校验接受后端返回的 UUID 格式
- [ ] #2 sync.js 中 userId 格式校验接受后端返回的 UUID 格式
- [ ] #3 新成员加入房间后，能成功连接聊天 WebSocket 与操作同步 WebSocket
- [ ] #4 控制台无「userId 格式不正确」相关错误
<!-- AC:END -->
