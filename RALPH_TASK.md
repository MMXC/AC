---
task_id: add-debug-logs-for-video-and-chat
source: 用户反馈「画面未显示、消息未显示」排查
test_command: "手动：进房后发消息、房主开共享，观察控制台与服务端 [排查] 日志链路"
---

# Task: 添加前端与后端排查日志（画面未显示、消息未显示）

## Description

为定位「画面未显示、消息未显示」问题，在前端（chat.js、screen-streaming.js）与后端（watch-together-server）增加带 `[排查]` 前缀的日志，便于按链路判断：消息是否收到、是否渲染；WebRTC Offer 是否到达成员端、Answer 是否发出、远端流是否附加到 video。

## Acceptance Criteria

- [ ] #1 后端：CHAT_MESSAGE 收到时打印 roomId、userId、contentLen、已广播到 N 个连接
- [ ] #2 后端：WEBRTC 信令成功转发时打印 type、toUserId
- [ ] #3 前端 chat：收到 CHAT_MESSAGE 后打印「已加入历史并触发渲染」；renderMessage 被调用/chatMessages 不存在/消息已挂载到 DOM 有对应日志
- [ ] #4 前端 screen-streaming：成员端收到 WEBRTC_OFFER、已发送 Answer、收到远端 track、已附加远端流到 VideoPlayer/video 有对应日志

## Implementation Steps

1. **1.1 后端 CHAT_MESSAGE 与 WEBRTC 转发日志** — server.js：CHAT_MESSAGE 分支中统计 sentCount，广播后打印 [排查] CHAT_MESSAGE 收到 roomId userId contentLen 已广播到 N 个连接；sendToUser 改为返回 boolean，WEBRTC 转发成功后打印 [排查] WEBRTC 信令已转发 type toUserId。Done when: 发消息与转发信令时服务端有对应 [排查] 日志。
2. **1.2 前端 chat 排查日志** — chat.js：CHAT_MESSAGE 分支末尾打印 [排查] 聊天消息已加入历史并触发渲染；renderMessage 开头打印 [排查] renderMessage 被调用，!chatMessages 时打印 [排查] chatMessages 元素不存在，appendChild 后打印 [排查] 消息已挂载到 DOM。Done when: 收到消息与渲染时控制台有对应 [排查] 日志。
3. **1.3 前端 screen-streaming 排查日志** — screen-streaming.js：handleWebRTCOffer 开头打印 [排查] 成员端收到 WEBRTC_OFFER；发送 Answer 后保留并加 [排查] 前缀；ontrack 内「成员端收到 WebRTC 远端 track」加 [排查]，附加到 VideoPlayer/video 后打印 [排查] 成员端已附加远端流到 VideoPlayer/video。Done when: 成员端 Offer/Answer/ontrack/附加流 各环节有 [排查] 日志。
