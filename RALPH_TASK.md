---
backlog_id: backlog-120
task: 修复聊天消息不显示的问题
test_command: "skill:watch-together-webapp-testing ${TASK_ID}"
---

# Task: 修复聊天消息不显示的问题

## Description

房主页与成员页消息区域不显示消息。需修复聊天的发送、接收与展示：发送方通过聊天 WebSocket 发送消息；服务端广播或点对点推送给房间内其他连接；接收方在 WebSocket 收到消息后写入消息列表并渲染到消息区域。确保消息列表 DOM 与数据绑定正确，新消息能追加显示。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

## Success Criteria

- [ ] #1 发送消息后，聊天 WebSocket 能成功发出（无因 userId 等导致的发送失败）
- [ ] #2 房主发送一条消息后，房主端消息区域显示该条消息
- [ ] #3 房主发送一条消息后，成员端消息区域显示该条消息
- [ ] #4 成员发送一条消息后，成员端与房主端消息区域均显示该条消息
- [ ] #5 消息展示包含发送者标识与内容，多条消息按时间顺序排列
- [ ] #6 自动化测试：双浏览器，任一方发消息，两侧断言消息区域存在对应文本，通过

## Implementation Steps

1. **1.1 服务端：连接时在 ws 上保存 roomId、userId** — done when: 收到消息时能根据 ws 确定房间与发送者
2. **1.2 服务端：处理 CHAT_MESSAGE，生成 id/timestamp 并向房间内所有连接广播（含发送者）** — done when: 任一端发送消息后，房主端与成员端消息区域均能收到并显示
3. **1.3 前端：确认发送不因 userId 等失败、收到 CHAT_MESSAGE 后写入 messageHistory 并 renderMessage** — 已有逻辑；done when: 消息区域 DOM 显示发送者标识与内容，多条按时间排列
4. **2.1 自动化测试** — done when: `skill:watch-together-webapp-testing 120`（或 backlog-120 对应 TASK_ID）双浏览器任一方发消息，两侧断言消息区域存在对应文本，通过
