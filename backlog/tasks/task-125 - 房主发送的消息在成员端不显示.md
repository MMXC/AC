---
id: TASK-125
title: 房主发送的消息在成员端不显示
status: In Progress
assignee: []
created_date: '2026-02-02 08:37'
updated_date: '2026-02-02 14:28'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
房主在聊天框输入并点击发送后，消息在房主端可能可见，但在成员端聊天区域不显示。需排查并修复：房主发送时的服务端广播（或 WebSocket 事件）、成员端对「房主消息」的订阅与渲染逻辑，确保成员端 #chatMessages 能收到并展示房主发送的消息。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**测试用例**:

**测试场景**:
1. 房主进入房间，至少一名成员加入同一房间
2. 房主在 #chatInput 输入唯一文本并点击「发送」
3. 在成员端等待约 2 秒后读取 #chatMessages 文本
4. 断言成员端 #chatMessages 包含房主刚发送的文本

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 房主在 #chatInput 输入并点击「发送」后，至少一名成员端 #chatMessages 内出现该条消息文本
- [ ] #2 agent-browser 或 Playwright 双端测试：房主发送 → 成员端断言 #chatMessages 包含发送内容
- [ ] #3 消息展示包含发送者标识（如房主/昵称）与内容
<!-- AC:END -->
