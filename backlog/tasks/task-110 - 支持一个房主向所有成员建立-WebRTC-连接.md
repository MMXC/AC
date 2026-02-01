---
id: TASK-110
title: 支持一个房主向所有成员建立 WebRTC 连接
status: Done
assignee: []
created_date: '2026-01-31 11:19'
updated_date: '2026-02-01 07:49'
labels: []
dependencies: []
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在房主端为房间内每个非房主用户维护独立 RTCPeerConnection，通过 WebSocket 信令为每个成员建立 WebRTC 媒体通路，让所有在线成员都能看到房主视频流。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 房主端为每个成员创建并跟踪独立的 PeerConnection（以 userId 为 key）
- [ ] #2 信令层能为每个成员正确路由 WebRTC 信令
- [ ] #3 新成员加入时可增量建立连接，不影响已有连接
- [ ] #4 成员离开时，房主端能关闭对应 PeerConnection 并释放资源
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-02-01 03:29:03 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-110
task: 支持一个房主向所有成员建立 WebRTC 连接
test_command: "skill:watch-together-webapp-testing ${TASK_ID}"
---

# Task: 支持一个房主向所有成员建立 WebRTC 连接

## Description

在房主端为房间内每个非房主用户维护独立 RTCPeerConnection，通过 WebSocket 信令为每个成员建立 WebRTC 媒体通路，让所有在线成员都能看到房主视频流。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

## Success Criteria

- [x] #1 房主端为每个成员创建并跟踪独立的 PeerConnection（以 userId 为 key）
- [x] #2 信令层能为每个成员正确路由 WebRTC 信令
- [x] #3 新成员加入时可增量建立连接，不影响已有连接
- [x] #4 成员离开时，房主端能关闭对应 PeerConnection 并释放资源
```
<!-- SECTION:NOTES:END -->
