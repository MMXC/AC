---
id: TASK-37
title: 通过 WebSocket 信令在房主与单个成员之间建立 WebRTC 连接
status: To Do
assignee: []
created_date: '2026-01-28 11:54'
updated_date: '2026-01-30 16:03'
labels: []
dependencies: []
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
基于任务 B1/B2 定义的信令格式和转发逻辑，在实际房间环境中实现“房主 ↔ 单一成员”的 WebRTC 媒体通路。房主作为 caller，成员作为 callee，通过 WebSocket 交换 offer/answer/ICE，将房主的 getDisplayMedia 流发送到成员端的 VideoPlayer。

**Test Command**: `skill:watch-together-webapp-testing TASK-37`

**测试用例**:

**测试场景**:
1. 局域网环境下房主与单成员成功建立 WebRTC 连接并传输视频流
2. 刷新任一端页面后可重新建立连接

**Test Command**: `skill:watch-together-webapp-testing TASK-37`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 房主点击开始共享能向目标成员发送 WEBRTC_OFFER
- [ ] #2 成员收到 WEBRTC_OFFER 后能创建 answer 并用 WEBRTC_ANSWER 回传
- [ ] #3 双方能正确处理并转发 WEBRTC_ICE_CANDIDATE 直至连接建立
- [ ] #4 成员端 VideoPlayer 成功接收到远端 MediaStream 并播放画面
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-01-29 04:24:12 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-37
task: 通过 WebSocket 信令在房主与单个成员之间建立 WebRTC 连接
test_command: "手动：房主与一个成员加入同一房间，房主点击开始共享，确认成员端出现并播放房主画面"
---

# Task: 通过 WebSocket 信令在房主与单个成员之间建立 WebRTC 连接

## Description

基于任务 B1/B2 定义的信令格式和转发逻辑，在实际房间环境中实现“房主 ↔ 单一成员”的 WebRTC 媒体通路。房主作为 caller，成员作为 callee，通过 WebSocket 交换 offer/answer/ICE，将房主的 getDisplayMedia 流发送到成员端的 VideoPlayer。

**Test Command**: `手动：房主与一个成员加入同一房间，房主点击开始共享，确认成员端出现并播放房主画面`

**测试用例**:

**测试场景**:
1. 局域网环境下房主与单成员成功建立 WebRTC 连接并传输视频流
2. 刷新任一端页面后可重新建立连接

**Test Command**: `手动：房主与一个成员加入同一房间，房主点击开始共享，确认成员端出现并播放房主画面`

## Success Criteria

- [x] #1 房主点击开始共享能向目标成员发送 WEBRTC_OFFER
- [x] #2 成员收到 WEBRTC_OFFER 后能创建 answer 并用 WEBRTC_ANSWER 回传
- [x] #3 双方能正确处理并转发 WEBRTC_ICE_CANDIDATE 直至连接建立
- [x] #4 成员端 VideoPlayer 成功接收到远端 MediaStream 并播放画面
```

2026-01-30 23:28:05 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-37
task: 通过 WebSocket 信令在房主与单个成员之间建立 WebRTC 连接
test_command: "手动：房主与一个成员加入同一房间，房主点击开始共享，确认成员端出现并播放房主画面"
---

# Task: 通过 WebSocket 信令在房主与单个成员之间建立 WebRTC 连接

## Description

基于任务 B1/B2 定义的信令格式和转发逻辑，在实际房间环境中实现“房主 ↔ 单一成员”的 WebRTC 媒体通路。房主作为 caller，成员作为 callee，通过 WebSocket 交换 offer/answer/ICE，将房主的 getDisplayMedia 流发送到成员端的 VideoPlayer。

**Test Command**: `手动：房主与一个成员加入同一房间，房主点击开始共享，确认成员端出现并播放房主画面`

**测试用例**:

**测试场景**:
1. 局域网环境下房主与单成员成功建立 WebRTC 连接并传输视频流
2. 刷新任一端页面后可重新建立连接

**Test Command**: `手动：房主与一个成员加入同一房间，房主点击开始共享，确认成员端出现并播放房主画面`

## Success Criteria

- [x] #1 房主点击开始共享能向目标成员发送 WEBRTC_OFFER
- [x] #2 成员收到 WEBRTC_OFFER 后能创建 answer 并用 WEBRTC_ANSWER 回传
- [x] #3 双方能正确处理并转发 WEBRTC_ICE_CANDIDATE 直至连接建立
- [x] #4 成员端 VideoPlayer 成功接收到远端 MediaStream 并播放画面
```
<!-- SECTION:NOTES:END -->
