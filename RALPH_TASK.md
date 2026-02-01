---
backlog_id: backlog-117
task: 修复 WebSocket 连接时 userId 格式校验与后端不一致
test_command: "docker compose up -d && .cursor/skills/watch-together-webapp-testing/run-test.sh fix-frontend"
---

# Task: 修复 WebSocket 连接时 userId 格式校验与后端不一致

## Description

加入房间后，后端返回 UUID 格式的 userId（如 `8f0bb8e5-9711-419b-8481-accbdf28ace2`），但 chat.js 与 sync.js 中 WebSocket 连接前校验 userId 为正则 `/^user-[a-z0-9]{8}$/`，导致「userId 格式不正确」而无法连接。需将校验规则更新为同时支持 UUID 格式（或与后端约定一致），使新成员能正常连接聊天与操作同步 WebSocket。

**Test Command**: `docker compose up -d && .cursor/skills/watch-together-webapp-testing/run-test.sh fix-frontend`

**Test Command**: `docker compose up -d && .cursor/skills/watch-together-webapp-testing/run-test.sh fix-frontend`

## Success Criteria

- [x] #1 chat.js 中 userId 格式校验接受后端返回的 UUID 格式
- [x] #2 sync.js 中 userId 格式校验接受后端返回的 UUID 格式
- [x] #3 新成员加入房间后，能成功连接聊天 WebSocket 与操作同步 WebSocket
- [x] #4 控制台无「userId 格式不正确」相关错误

## Implementation Steps

1. **1.1 chat.js 中 userId 校验** — done when: 校验规则接受后端返回的 UUID（如 `8f0bb8e5-9711-419b-8481-accbdf28ace2`），不再仅限 `/^user-[a-z0-9]{8}$/`。
2. **1.2 sync.js 中 userId 校验** — done when: 与 chat.js 一致，接受 UUID 格式。
3. **1.3 运行验收** — done when: `docker compose up -d && .cursor/skills/watch-together-webapp-testing/run-test.sh fix-frontend` 通过，控制台无「userId 格式不正确」。
