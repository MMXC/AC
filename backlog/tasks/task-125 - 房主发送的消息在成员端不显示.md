---
id: TASK-125
title: 房主发送的消息在成员端不显示
status: Done
assignee: []
created_date: '2026-02-02 08:37'
updated_date: '2026-02-02 14:39'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-02-02 22:39:16 - 任务完成，RALPH_TASK.md 已归档

---

## 测试通过 (Test Passed)

- **测试时间**: 2026-02-02 22:39:16
- **测试结果截图** (保存在 `backlog/test-results/task-125/`):
  - [final.png](backlog/test-results/task-125/final.png)
  - [initial.png](backlog/test-results/task-125/initial.png)
  - [member-joined.png](backlog/test-results/task-125/member-joined.png)

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-125
task: 房主发送的消息在成员端不显示
test_command: "skill:watch-together-webapp-testing ${TASK_ID}"
---

# Task: 房主发送的消息在成员端不显示

## Description

房主在聊天框输入并点击发送后，消息在房主端可能可见，但在成员端聊天区域不显示。需排查并修复：房主发送时的服务端广播（或 WebSocket 事件）、成员端对「房主消息」的订阅与渲染逻辑，确保成员端 #chatMessages 能收到并展示房主发送的消息。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**测试用例**:

**测试场景**:
1. 房主进入房间，至少一名成员加入同一房间
2. 房主在 #chatInput 输入唯一文本并点击「发送」
3. 在成员端等待约 2 秒后读取 #chatMessages 文本
4. 断言成员端 #chatMessages 包含房主刚发送的文本

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

## Success Criteria

- [x] #1 房主在 #chatInput 输入并点击「发送」后，至少一名成员端 #chatMessages 内出现该条消息文本
- [x] #2 agent-browser 或 Playwright 双端测试：房主发送 → 成员端断言 #chatMessages 包含发送内容
- [x] #3 消息展示包含发送者标识（如房主/昵称）与内容

## Implementation Steps

1. **1.1 服务端** — 确认 CHAT_MESSAGE 收到后向房间内所有连接广播（含 data.id/userId/nickname/content/timestamp）。Done when: server.js 已实现且无回归。
2. **1.2 前端 chat** — 确认发送时带 userId/nickname/content，收到 CHAT_MESSAGE 时 addMessageToHistory(message.data) 且 renderMessage(message.data)。Done when: #chatMessages 能渲染消息且含发送者与内容。
3. **1.3 前端 sync** — 成员端若通过 sync 的 WebSocket 收包，需将 CHAT_MESSAGE 转发给 chat 渲染。Done when: sync 收到 CHAT_MESSAGE 时调用 window.handleWebSocketMessage(message)；chat 暴露 handleWebSocketMessage 到 window；sync 默认 WS 与 chat 一致（ws://localhost:3000）。
4. **2.1 双端测试** — 房主发消息后成员端 #chatMessages 包含该文本。Done when: skill:watch-together-webapp-testing 对应场景通过或本地双浏览器验证通过。
```
<!-- SECTION:NOTES:END -->
