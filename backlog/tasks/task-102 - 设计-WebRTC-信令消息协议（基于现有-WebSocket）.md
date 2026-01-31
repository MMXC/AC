---
id: TASK-102
title: 设计 WebRTC 信令消息协议（基于现有 WebSocket）
status: In Progress
assignee: []
created_date: '2026-01-31 11:16'
updated_date: '2026-01-31 18:38'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
基于现有房间 WebSocket/sync 通道，定义 WebRTC 信令消息格式：WEBRTC_OFFER、WEBRTC_ANSWER、WEBRTC_ICE_CANDIDATE 等，以及字段 roomId、fromUserId、toUserId、sdp、candidate。用文档或 TS 类型固化结构。

**Test Command**: `cd watch-together && npm test -- webrtc-signaling`

**Test Command**: `cd watch-together && npm test -- webrtc-signaling`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 有文档或 TS 类型清晰列出所有 WebRTC 信令消息的 JSON 结构
- [ ] #2 每个字段有明确含义说明
- [ ] #3 前端信令发送/接收层统一使用这些类型
- [ ] #4 为未来扩展预留扩展点或版本化策略
<!-- AC:END -->
