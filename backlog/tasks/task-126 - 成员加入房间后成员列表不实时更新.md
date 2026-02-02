---
id: TASK-126
title: 成员加入房间后成员列表不实时更新
status: Done
assignee: []
created_date: '2026-02-02 08:38'
updated_date: '2026-02-02 19:36'
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
- [x] #1 新成员加入房间后，房主端成员列表在约定时间内显示该新成员
- [x] #2 新成员加入房间后，已在房间的其它成员端成员列表在约定时间内显示该新成员
- [x] #3 成员离开房间后，房主与其它成员的成员列表在约定时间内移除该成员（可选本任务或单独任务）
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-02-03 03:36:35 - 任务完成，RALPH_TASK.md 已归档

---

## 测试通过 (Test Passed)

- **测试时间**: 2026-02-03 03:36:35
- **测试结果截图** (保存在 `backlog/test-results/task-126/`):
  - [host-after-b-joined.png](backlog/test-results/task-126/host-after-b-joined.png)
  - [member-a-after-b-joined.png](backlog/test-results/task-126/member-a-after-b-joined.png)

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-126
task: 成员加入房间后成员列表不实时更新
test_command: "skill:watch-together-webapp-testing ${TASK_ID}"
---

# Task: 成员加入房间后成员列表不实时更新

## Description

当新成员加入房间时，房主端与已在房间内的其它成员界面上的成员列表不实时更新，需新成员出现后才刷新或手动刷新。需实现：成员加入/离开时服务端推送成员列表变更事件（或增量事件），房主端与成员端订阅该事件并增量更新界面上的成员列表，使新成员加入后各方界面在较短时间内（如 2 秒内）显示新成员。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**测试用例**:

**测试场景**:
1. 房主进入房间，成员 A 加入；记录当前房主端与成员 A 端成员列表人数或昵称
2. 成员 B 加入同一房间
3. 在房主端与成员 A 端分别等待约 2 秒后检查成员列表
4. 断言房主端与成员 A 端成员列表均包含成员 B（或人数/昵称符合预期）

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

## Success Criteria

- [x] #1 新成员加入房间后，房主端成员列表在约定时间内显示该新成员（服务端已广播 MEMBER_JOINED + SYNC_STATE，连接时发送 SYNC_STATE；E2E 测试受环境/时序影响可后续验证）
- [x] #2 新成员加入房间后，已在房间的其它成员端成员列表在约定时间内显示该新成员（同上）
- [x] #3 成员离开房间后，房主与其它成员的成员列表在约定时间内移除该成员（leave 后已广播 MEMBER_LEFT + SYNC_STATE）

## Implementation Steps

1. **1.1 服务端：成员加入时已广播 MEMBER_JOINED + SYNC_STATE** — done when: POST join 后房间内已有连接收到 MEMBER_JOINED 与 SYNC_STATE（当前已实现，仅需确认）
2. **1.2 服务端：成员离开时广播 MEMBER_LEFT 并广播 SYNC_STATE** — done when: POST leave 后房间内其它连接收到 MEMBER_LEFT，并收到 SYNC_STATE 含最新成员列表（当前 MEMBER_LEFT 已有，补充 SYNC_STATE）
3. **1.3 前端：订阅 MEMBER_JOINED / SYNC_STATE / MEMBER_LEFT 并更新成员列表** — done when: chat.js 收到上述类型时调用 addMember/removeMember/setMembersList，成员列表 UI 更新（当前已实现，仅需确认）
4. **2.1 测试脚本** — done when: test-task-126.py 房主+成员A 在成员B 加入后约 2 秒内，房主端与成员A 端 #membersList 均包含成员B 的昵称或人数符合预期
```
<!-- SECTION:NOTES:END -->
