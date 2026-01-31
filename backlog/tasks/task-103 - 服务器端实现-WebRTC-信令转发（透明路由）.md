---
id: TASK-103
title: 服务器端实现 WebRTC 信令转发（透明路由）
status: To Do
assignee: []
created_date: '2026-01-31 11:17'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在现有 WebSocket 服务中增加 WebRTC 信令路由：根据 roomId / toUserId 将 WEBRTC_OFFER / WEBRTC_ANSWER / WEBRTC_ICE_CANDIDATE 转发给目标连接，不解析 SDP/ICE 内容。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 服务器能识别并转发 WebRTC 信令到正确的目标连接
- [ ] #2 不对 SDP/ICE 做任何修改，仅透明转发
- [ ] #3 目标用户不在线时，有合理警告日志而不会崩溃
- [ ] #4 WebRTC 信令不会干扰现有聊天/操作同步消息流
<!-- AC:END -->
