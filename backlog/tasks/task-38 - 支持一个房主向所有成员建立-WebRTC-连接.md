---
id: TASK-38
title: 支持一个房主向所有成员建立 WebRTC 连接
status: To Do
assignee: []
created_date: '2026-01-28 11:54'
updated_date: '2026-01-30 16:03'
labels: []
dependencies: []
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在房主端为房间内每个非房主用户维护一个独立的 RTCPeerConnection，并通过 WebSocket 信令为每个成员建立 WebRTC 媒体通路，让所有在线成员都能看到房主视频流。

**Test Command**: `skill:watch-together-webapp-testing TASK-38`

**测试用例**:

**测试场景**:
1. 在房主在线时陆续加入多个成员，所有人都能收到房主流
2. 某成员离开房间后，其余成员连接不受影响

**Test Command**: `skill:watch-together-webapp-testing TASK-38`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 房主端为每个成员创建并跟踪独立的 PeerConnection（以 userId 为 key）
- [ ] #2 信令层能为每个成员正确路由对应的 WebRTC 信令
- [ ] #3 新成员加入房间时可以增量建立连接，不影响已有连接
- [ ] #4 成员离开房间时，房主端能关闭对应 PeerConnection 并释放资源
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-01-30 23:39:17 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-38
task: 支持一个房主向所有成员建立 WebRTC 连接
test_command: "手动：1 房主 + 2 成员加入同一房间，房主开始共享，确认两个成员都能看到房主画面"
---

# Task: 支持一个房主向所有成员建立 WebRTC 连接

## Description

在房主端为房间内每个非房主用户维护一个独立的 RTCPeerConnection，并通过 WebSocket 信令为每个成员建立 WebRTC 媒体通路，让所有在线成员都能看到房主视频流。

**Test Command**: `手动：1 房主 + 2 成员加入同一房间，房主开始共享，确认两个成员都能看到房主画面`

**测试用例**:

**测试场景**:
1. 在房主在线时陆续加入多个成员，所有人都能收到房主流
2. 某成员离开房间后，其余成员连接不受影响

**Test Command**: `手动：1 房主 + 2 成员加入同一房间，房主开始共享，确认两个成员都能看到房主画面`

## Success Criteria

- [x] #1 房主端为每个成员创建并跟踪独立的 PeerConnection（以 userId 为 key）
- [x] #2 信令层能为每个成员正确路由对应的 WebRTC 信令
- [x] #3 新成员加入房间时可以增量建立连接，不影响已有连接
- [x] #4 成员离开房间时，房主端能关闭对应 PeerConnection 并释放资源
```
<!-- SECTION:NOTES:END -->
