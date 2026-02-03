---
backlog_id: backlog-129
task: 用户离开房间后服务端广播 MEMBER_LEFT 与前端列表移除
test_command: "skill:watch-together-webapp-testing ${TASK_ID}"
---

# Task: 用户离开房间后服务端广播 MEMBER_LEFT 与前端列表移除

## Description

后台日志出现「信令目标用户不在线」时，toUserId 多为已离开房间的历史用户 ID；用户离开房间后前端成员列表仍显示该用户，说明离开事件未正确同步。需实现：用户离开（WebSocket 断开或主动离开）时，服务端向房间内其他连接广播 MEMBER_LEFT（含 userId）；前端收到 MEMBER_LEFT 后从成员列表移除该用户并更新 UI，使房间列表不再显示已离开用户。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**测试用例**:

**测试场景**:
1. 房主进入房间，成员 A、B 加入
2. 成员 B 离开（关闭页或断开连接）
3. 确认服务端发出 MEMBER_LEFT（B 的 userId）
4. 在房主端与成员 A 端检查成员列表，断言不再包含 B

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

## Success Criteria

- [ ] #1 用户离开房间后，服务端向该房间其他连接发送 MEMBER_LEFT（data.userId 为离开者）
- [ ] #2 房主端与其它成员端收到 MEMBER_LEFT 后，成员列表在约定时间内移除该用户
- [ ] #3 离开后再次发往该 toUserId 的 WebRTC 信令应减少（房主端仅向当前列表发信令，见任务 6）

## Implementation Steps

<!-- 细化约定时填写：步骤 + 每步验收，例如 -->
<!-- 1.1 加路由 — done when: GET /api/v1/rooms 返回 200 -->
<!-- 1.2 写 handler — done when: POST 入参校验失败返回 400 -->
