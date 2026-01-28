---
id: TASK-35
title: 服务器端实现 WebRTC 信令转发（透明路由）
status: In Progress
assignee: []
created_date: '2026-01-28 11:54'
updated_date: '2026-01-28 17:55'
labels: []
dependencies: []
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在现有 WebSocket 服务中增加对 WebRTC 信令消息的简单路由逻辑：根据 roomId / toUserId 将 WEBRTC_OFFER / WEBRTC_ANSWER / WEBRTC_ICE_CANDIDATE 转发给目标连接，不解析 SDP/ICE 内容。

**Test Command**: `手动或集成测试：使用两个浏览器实例互相发送模拟 WEBRTC_* 消息，观察服务器转发行为`

**测试用例**:

**测试场景**:
1. 使用两个浏览器 A/B 连接到同一房间，通过控制台发送模拟 WEBRTC_OFFER/ANSWER/CANDIDATE 消息，确认对方能收到原始 JSON
2. 在目标用户断开连接后继续发送 WEBRTC_* 消息，确认服务器不会抛异常，并记录可读的错误日志

**Test Command**: `手动或集成测试：使用两个浏览器实例互相发送模拟 WEBRTC_* 消息，观察服务器转发行为`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 服务器能识别并转发来自客户端的 WebRTC 信令到正确的目标连接
- [ ] #2 不对 SDP/ICE 内容做任何修改，仅做透明转发
- [ ] #3 目标用户不在线时，有合理警告日志而不会崩溃
- [ ] #4 WebRTC 信令不会干扰现有聊天/操作同步消息流
<!-- AC:END -->
