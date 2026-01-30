---
backlog_id: backlog-36
task: 单页面内完成 WebRTC Loopback Demo（无服务器）
test_command: "手动：打开本地 demo 页面，点击“开始 Loopback 测试”，观察两个 <video> 是否正常显示"
---

# Task: 单页面内完成 WebRTC Loopback Demo（无服务器）

## Description

在单个浏览器页面中创建两个 RTCPeerConnection（pc1/pc2），通过本地变量传递 offer/answer/ICE，将 getDisplayMedia 或 getUserMedia 得到的流从 pc1 发送到 pc2，并在页面上展示“本地预览”和“远端播放”两个 <video>，用于验证 WebRTC API 使用是否正确。

**Test Command**: `手动：打开本地 demo 页面，点击“开始 Loopback 测试”，观察两个 <video> 是否正常显示`

**测试用例**:

**测试场景**:
1. 使用 getUserMedia 测试 Loopback
2. 使用 getDisplayMedia 测试 Loopback

**Test Command**: `手动：打开本地 demo 页面，点击“开始 Loopback 测试”，观察两个 <video> 是否正常显示`

## Success Criteria

- [x] #1 pc1 能成功获取 MediaStream 并通过 addTrack 添加到 PeerConnection
- [x] #2 pc1 与 pc2 之间通过本地 JS 变量成功交换 offer/answer/ICE，建立 WebRTC 连接
- [x] #3 pc2 的 <video> 能正常播放从 pc1 发送的远端流
- [x] #4 停止测试时能正确关闭 PeerConnection 和相关 MediaStream 轨道
