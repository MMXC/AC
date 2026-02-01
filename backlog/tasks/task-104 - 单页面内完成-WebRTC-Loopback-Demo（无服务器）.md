---
id: TASK-104
title: 单页面内完成 WebRTC Loopback Demo（无服务器）
status: In Progress
assignee: []
created_date: '2026-01-31 11:17'
updated_date: '2026-01-31 18:50'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在单页面中创建 pc1/pc2，通过本地变量传递 offer/answer/ICE，将 getDisplayMedia 或 getUserMedia 得到的流从 pc1 发送到 pc2，展示「本地预览」和「远端播放」两个 <video>，验证 WebRTC API 使用是否正确。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 pc1 能成功获取 MediaStream 并通过 addTrack 添加到 PeerConnection
- [ ] #2 pc1 与 pc2 通过本地变量成功交换 offer/answer/ICE，建立 WebRTC 连接
- [ ] #3 pc2 的 <video> 能正常播放从 pc1 发送的远端流
- [ ] #4 停止测试时能正确关闭 PeerConnection 和相关 MediaStream 轨道
<!-- AC:END -->
