---
id: TASK-131
title: 房主端成员列表无需刷新即可展示完整（实时加入/离开）
status: Done
assignee: []
created_date: '2026-02-03 07:42'
updated_date: '2026-02-03 08:52'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
房主端用户列表当前需刷新页面才展示完整；新成员加入或成员离开后，不刷新则列表不完整。需实现：新成员加入时房主端收到 MEMBER_JOINED 或 SYNC_STATE 并更新 getMembersList() 与 UI；成员离开时房主端收到 MEMBER_LEFT 并移除（任务 5）。确保房主端成员列表随 WebSocket 推送实时更新，无需刷新即可展示完整列表。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**测试用例**:

**测试场景**:
1. 房主进入房间，不刷新页面；成员 A 加入
2. 房主端不刷新，等待约 2 秒，检查成员列表是否含 A
3. 成员 A 离开，房主端不刷新，检查成员列表是否移除 A

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 新成员加入后，房主端在约定时间内（如 2 秒）在成员列表中显示该成员，无需刷新
- [ ] #2 成员离开后，房主端在约定时间内从成员列表中移除该成员，无需刷新
- [ ] #3 getMembersList() 与界面展示一致，且与服务端当前房间成员一致
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-02-03 16:32:51 - 任务完成，RALPH_TASK.md 已归档

---

## 测试通过 (Test Passed)

- **测试时间**: 2026-02-03 16:32:51
- **测试结果截图** (保存在 `backlog/test-results/task-131/`):
  - [final.png](backlog/test-results/task-131/final.png)
  - [initial.png](backlog/test-results/task-131/initial.png)
  - [member-joined.png](backlog/test-results/task-131/member-joined.png)

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-131
task: 房主端成员列表无需刷新即可展示完整（实时加入/离开）
test_command: "skill:watch-together-webapp-testing ${TASK_ID}"
---

# Task: 房主端成员列表无需刷新即可展示完整（实时加入/离开）

## Description

房主端用户列表当前需刷新页面才展示完整；新成员加入或成员离开后，不刷新则列表不完整。需实现：新成员加入时房主端收到 MEMBER_JOINED 或 SYNC_STATE 并更新 getMembersList() 与 UI；成员离开时房主端收到 MEMBER_LEFT 并移除（任务 5）。确保房主端成员列表随 WebSocket 推送实时更新，无需刷新即可展示完整列表。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**测试用例**:

**测试场景**:
1. 房主进入房间，不刷新页面；成员 A 加入
2. 房主端不刷新，等待约 2 秒，检查成员列表是否含 A
3. 成员 A 离开，房主端不刷新，检查成员列表是否移除 A

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

## Success Criteria

- [x] #1 新成员加入后，房主端在约定时间内（如 2 秒）在成员列表中显示该成员，无需刷新
- [x] #2 成员离开后，房主端在约定时间内从成员列表中移除该成员，无需刷新
- [x] #3 getMembersList() 与界面展示一致，且与服务端当前房间成员一致

## Implementation Steps

1. **1.1 服务端 WebSocket 连接时向该客户端发送 SYNC_STATE** — done when: 客户端连接 WS 后收到一条 SYNC_STATE，data.members 为当前房间成员列表。
2. **1.2 服务端 WebSocket 关闭时向房间广播 MEMBER_LEFT** — done when: 某成员断开 WS 后，房间内其他连接（含房主）收到 MEMBER_LEFT，data.userId 为断开者。
3. **1.3 前端已处理 MEMBER_JOINED / SYNC_STATE / MEMBER_LEFT** — done when: chat.js 收到后更新 getMembersList() 与 UI（已有逻辑，仅需确认）。
4. **2.1 自动化测试** — done when: skill:watch-together-webapp-testing TASK-131 场景 1、2、3 通过（房主不刷新见成员 A 加入、约 2 秒后列表含 A、成员 A 离开后列表移除 A）。
```

2026-02-03 16:52:46 - 任务完成，RALPH_TASK.md 已归档

---

## 测试通过 (Test Passed)

- **测试时间**: 2026-02-03 16:52:46
- **测试结果截图** (保存在 `backlog/test-results/task-131/`):
  - [final.png](backlog/test-results/task-131/final.png)
  - [initial.png](backlog/test-results/task-131/initial.png)
  - [member-joined.png](backlog/test-results/task-131/member-joined.png)

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-131
task: 房主端成员列表无需刷新即可展示完整（实时加入/离开）
test_command: "skill:watch-together-webapp-testing ${TASK_ID}"
---

# Task: 房主端成员列表无需刷新即可展示完整（实时加入/离开）

## Description

房主端用户列表当前需刷新页面才展示完整；新成员加入或成员离开后，不刷新则列表不完整。需实现：新成员加入时房主端收到 MEMBER_JOINED 或 SYNC_STATE 并更新 getMembersList() 与 UI；成员离开时房主端收到 MEMBER_LEFT 并移除（任务 5）。确保房主端成员列表随 WebSocket 推送实时更新，无需刷新即可展示完整列表。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**测试用例**:

**测试场景**:
1. 房主进入房间，不刷新页面；成员 A 加入
2. 房主端不刷新，等待约 2 秒，检查成员列表是否含 A
3. 成员 A 离开，房主端不刷新，检查成员列表是否移除 A

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

## Success Criteria

- [x] #1 新成员加入后，房主端在约定时间内（如 2 秒）在成员列表中显示该成员，无需刷新
- [x] #2 成员离开后，房主端在约定时间内从成员列表中移除该成员，无需刷新
- [x] #3 getMembersList() 与界面展示一致，且与服务端当前房间成员一致

## Implementation Steps

1. **1.1 服务端 WebSocket 连接时向该客户端发送 SYNC_STATE** — done when: 客户端连接 WS 后收到一条 SYNC_STATE，data.members 为当前房间成员列表。
2. **1.2 服务端 WebSocket 关闭时向房间广播 MEMBER_LEFT** — done when: 某成员断开 WS 后，房间内其他连接（含房主）收到 MEMBER_LEFT，data.userId 为断开者。
3. **1.3 前端已处理 MEMBER_JOINED / SYNC_STATE / MEMBER_LEFT** — done when: chat.js 收到后更新 getMembersList() 与 UI（已有逻辑，仅需确认）。
4. **2.1 自动化测试** — done when: skill:watch-together-webapp-testing TASK-131 场景 1、2、3 通过（房主不刷新见成员 A 加入、约 2 秒后列表含 A、成员 A 离开后列表移除 A）。
```
<!-- SECTION:NOTES:END -->
