---
id: TASK-126
title: 成员加入房间后成员列表不实时更新
status: To Do
assignee: []
created_date: '2026-02-02 08:38'
updated_date: '2026-02-02 18:57'
labels: []
dependencies: []
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
当新成员加入房间时，房主端与已在房间内的其它成员界面上的成员列表不实时更新，需新成员出现后才刷新或手动刷新。需实现：成员加入/离开时服务端推送成员列表变更事件（或增量事件），房主端与成员端订阅该事件并增量更新界面上的成员列表，使新成员加入后各方界面在较短时间内（如 2 秒内）显示新成员。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**测试用例**:

**测试场景**:
1. 房主进入房间，成员 A 加入；记录当前房主端与成员 A 端成员列表人数或昵称
2. 成员 B 加入同一房间
3. 在房主端与成员 A 端分别等待约 2 秒后检查成员列表
4. 断言房主端与成员 A 端成员列表均包含成员 B（或人数/昵称符合预期）

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 新成员加入房间后，房主端成员列表在约定时间内显示该新成员
- [ ] #2 新成员加入房间后，已在房间的其它成员端成员列表在约定时间内显示该新成员
- [ ] #3 成员离开房间后，房主与其它成员的成员列表在约定时间内移除该成员（可选本任务或单独任务）
<!-- AC:END -->
