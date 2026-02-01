---
id: TASK-119
title: 修复房主端与成员端左侧成员列表只显示自己的问题
status: To Do
assignee: []
created_date: '2026-02-01 07:18'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
房主页与成员页左侧成员列表仅显示当前用户自己，其他在线用户不出现。需修复成员列表的数据源与同步：确保加入房间后从服务端或 WebSocket 拉取/订阅房间成员列表，并在成员进入/离开时更新列表；房主端与成员端共用同一套成员列表逻辑，列表渲染所有当前房间在线用户（含自己）。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 加入房间后，成员列表有明确的数据来源（API 或 WebSocket 推送），且能拿到除自己外的其他成员
- [ ] #2 房主端左侧成员列表展示房间内所有在线成员（含自己），2 人在房时列表至少 2 条
- [ ] #3 成员端左侧成员列表展示房间内所有在线成员（含自己），2 人在房时列表至少 2 条
- [ ] #4 新成员加入或某人离开后，各端列表在约定时间内更新一致
- [ ] #5 自动化测试：双浏览器同时在一房，断言两侧成员列表数量 ≥ 2，且包含当前页用户
<!-- AC:END -->
