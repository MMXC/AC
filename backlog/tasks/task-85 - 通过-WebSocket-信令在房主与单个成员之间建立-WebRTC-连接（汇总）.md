---
id: TASK-85
title: 通过 WebSocket 信令在房主与单个成员之间建立 WebRTC 连接（汇总）
status: To Do
assignee: []
created_date: '2026-01-31 10:18'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
基于 webrtc-c2a～c2d 完成「房主 ↔ 单一成员」的 WebRTC 媒体通路。房主作为 caller，成员作为 callee，通过 WebSocket 交换 offer/answer/ICE，将房主的 getDisplayMedia 流发送到成员端 VideoPlayer。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 房主点击开始共享能向目标成员发送 WEBRTC_OFFER
- [ ] #2 成员收到 WEBRTC_OFFER 后能创建 answer 并用 WEBRTC_ANSWER 回传
- [ ] #3 双方能正确处理 WEBRTC_ICE_CANDIDATE 直至连接建立
- [ ] #4 成员端 VideoPlayer 成功接收远端 MediaStream 并播放画面
<!-- AC:END -->
