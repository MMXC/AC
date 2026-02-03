---
id: TASK-131
title: 房主端成员列表无需刷新即可展示完整（实时加入/离开）
status: In Progress
assignee: []
created_date: '2026-02-03 07:42'
updated_date: '2026-02-03 08:19'
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
