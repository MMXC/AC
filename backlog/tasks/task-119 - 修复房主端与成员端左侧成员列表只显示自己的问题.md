---
id: TASK-119
title: 修复房主端与成员端左侧成员列表只显示自己的问题
status: Done
assignee: []
created_date: '2026-02-01 07:18'
updated_date: '2026-02-01 07:50'
labels: []
dependencies: []
ordinal: 23000
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-02-01 15:45:13 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-119
task: 修复房主端与成员端左侧成员列表只显示自己的问题
test_command: "skill:watch-together-webapp-testing ${TASK_ID}"
---

# Task: 修复房主端与成员端左侧成员列表只显示自己的问题

## Description

房主页与成员页左侧成员列表仅显示当前用户自己，其他在线用户不出现。需修复成员列表的数据源与同步：确保加入房间后从服务端或 WebSocket 拉取/订阅房间成员列表，并在成员进入/离开时更新列表；房主端与成员端共用同一套成员列表逻辑，列表渲染所有当前房间在线用户（含自己）。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

## Success Criteria

- [x] #1 加入房间后，成员列表有明确的数据来源（API 或 WebSocket 推送），且能拿到除自己外的其他成员
- [x] #2 房主端左侧成员列表展示房间内所有在线成员（含自己），2 人在房时列表至少 2 条
- [x] #3 成员端左侧成员列表展示房间内所有在线成员（含自己），2 人在房时列表至少 2 条
- [x] #4 新成员加入或某人离开后，各端列表在约定时间内更新一致
- [x] #5 自动化测试：双浏览器同时在一房，断言两侧成员列表数量 ≥ 2，且包含当前页用户

## Implementation Steps

1. **1.1 前端：加入后用 API 返回的 room.members 初始化完整成员列表**
   - 在 room.js 中新增 `setMembersList(members)`（接受 `{ id, name }[]`），替换 `membersList` 并调用 `updateMembersDisplay()`。
   - 在 `joinRoomWithNickname` 成功回调中：若 `joinData.data.room.members` 存在且为非空数组，则用其设置列表（将 API 的 `userId` 映射为 `id`、`nickname` 映射为 `name`）；否则仅 `addMember(serverUserId, serverNickname)`。
   - **验收**：房主/成员加入后，左侧成员列表展示房间内所有成员（≥2 人时至少 2 条）。

2. **1.2 服务端：WebSocket 在有人加入/离开时广播 MEMBER_JOINED / MEMBER_LEFT**
   - 提供房间内广播能力（如共享模块或 server 暴露 `broadcastToRoom(roomId, excludeUserId, message)`），在 POST join 创建新成员后向房间内其他连接广播 `MEMBER_JOINED`，在 POST leave 后广播 `MEMBER_LEFT`。
   - **验收**：双端同房时，一端新成员加入或离开后，另一端成员列表在约定时间内更新一致。

3. **1.3（可选）服务端：WebSocket 连接时发送 SYNC_STATE 含 members**
   - 客户端连接 WS 时服务端查询当前房间成员并发送 `SYNC_STATE`（含 `members`），便于刷新后重连得到完整列表。
   - **验收**：刷新后重连 WS 能收到当前房间成员列表并更新左侧列表。

4. **1.4 运行测试**
   - 执行 `skill:watch-together-webapp-testing backlog-119`（或对应 TASK_ID）；双浏览器同房断言两侧成员列表数量 ≥ 2 且包含当前页用户。
   - **验收**：自动化测试通过。
```
<!-- SECTION:NOTES:END -->
