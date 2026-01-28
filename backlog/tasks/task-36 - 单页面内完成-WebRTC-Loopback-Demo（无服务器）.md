---
id: TASK-36
title: 单页面内完成 WebRTC Loopback Demo（无服务器）
status: To Do
assignee: []
created_date: '2026-01-28 11:54'
updated_date: '2026-01-28 16:36'
labels: []
dependencies: []
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在单个浏览器页面中创建两个 RTCPeerConnection（pc1/pc2），通过本地变量传递 offer/answer/ICE，将 getDisplayMedia 或 getUserMedia 得到的流从 pc1 发送到 pc2，并在页面上展示“本地预览”和“远端播放”两个 <video>，用于验证 WebRTC API 使用是否正确。

**Test Command**: `手动：打开本地 demo 页面，点击“开始 Loopback 测试”，观察两个 <video> 是否正常显示`

**测试用例**:

**测试场景**:
1. 使用 getUserMedia 测试 Loopback
2. 使用 getDisplayMedia 测试 Loopback

**Test Command**: `手动：打开本地 demo 页面，点击“开始 Loopback 测试”，观察两个 <video> 是否正常显示`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 pc1 能成功获取 MediaStream 并通过 addTrack 添加到 PeerConnection
- [ ] #2 pc1 与 pc2 之间通过本地 JS 变量成功交换 offer/answer/ICE，建立 WebRTC 连接
- [ ] #3 pc2 的 <video> 能正常播放从 pc1 发送的远端流
- [ ] #4 停止测试时能正确关闭 PeerConnection 和相关 MediaStream 轨道
<!-- AC:END -->
