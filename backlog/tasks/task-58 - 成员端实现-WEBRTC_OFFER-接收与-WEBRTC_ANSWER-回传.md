---
id: TASK-58
title: 成员端实现 WEBRTC_OFFER 接收与 WEBRTC_ANSWER 回传
status: To Do
assignee: []
created_date: '2026-01-31 05:44'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在成员端监听 WebSocket 收到的 WEBRTC_OFFER；创建 RTCPeerConnection，setRemoteDescription(offer)，createAnswer，通过 WebSocket 向房主回传 WEBRTC_ANSWER（含 roomId、fromUserId、toUserId、sdp）。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 能正确解析并处理 WebSocket 收到的 WEBRTC_OFFER
- [ ] #2 能创建 RTCPeerConnection 并 setRemoteDescription(offer)
- [ ] #3 createAnswer 成功后能通过 WebSocket 发送 WEBRTC_ANSWER
- [ ] #4 WEBRTC_ANSWER 的 toUserId 指向房主
<!-- AC:END -->
