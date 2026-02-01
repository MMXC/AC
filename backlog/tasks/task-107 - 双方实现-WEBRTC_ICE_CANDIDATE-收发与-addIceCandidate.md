---
id: TASK-107
title: 双方实现 WEBRTC_ICE_CANDIDATE 收发与 addIceCandidate
status: Done
assignee: []
created_date: '2026-01-31 11:18'
updated_date: '2026-01-31 19:10'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在房主端与成员端的 RTCPeerConnection 上监听 onicecandidate，将候选通过 WebSocket 发送 WEBRTC_ICE_CANDIDATE；接收方解析后调用 addIceCandidate，直至连接建立。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 房主与成员端都能在 onicecandidate 中发送 WEBRTC_ICE_CANDIDATE
- [ ] #2 接收方能正确解析并调用 addIceCandidate
- [ ] #3 ICE 候选能通过 WebSocket 正确路由到目标连接
- [ ] #4 双方 connectionState 能变为 connected
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-02-01 03:10:52 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-107
task: 双方实现 WEBRTC_ICE_CANDIDATE 收发与 addIceCandidate
test_command: "skill:watch-together-webapp-testing ${TASK_ID}"
---

# Task: 双方实现 WEBRTC_ICE_CANDIDATE 收发与 addIceCandidate

## Description

在房主端与成员端的 RTCPeerConnection 上监听 onicecandidate，将候选通过 WebSocket 发送 WEBRTC_ICE_CANDIDATE；接收方解析后调用 addIceCandidate，直至连接建立。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

## Success Criteria

- [x] #1 房主与成员端都能在 onicecandidate 中发送 WEBRTC_ICE_CANDIDATE
- [x] #2 接收方能正确解析并调用 addIceCandidate
- [x] #3 ICE 候选能通过 WebSocket 正确路由到目标连接
- [x] #4 双方 connectionState 能变为 connected
```
<!-- SECTION:NOTES:END -->
