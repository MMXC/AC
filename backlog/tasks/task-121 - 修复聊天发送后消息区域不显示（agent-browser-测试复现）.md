---
id: TASK-121
title: 修复聊天发送后消息区域不显示（agent-browser 测试复现）
status: In Progress
assignee: []
created_date: '2026-02-02 07:16'
updated_date: '2026-02-02 07:16'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
根据 agent-browser 自动化测试失败日志，成员端在聊天框输入并点击「发送」后，消息区域（#chatMessages）未包含发送的内容。现象：fill "#chatInput" 与 click "#chatSendButton" 均成功（✓ Done），但 get text "#chatMessages" 不包含刚发送的文本，断言失败。需修复聊天消息的发送、服务端广播与前端渲染，使发送后当前页消息区域能显示该条消息。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**测试用例**:

**测试场景**:
1. 打开房间页并加入（昵称+加入房间）
2. 在 #chatInput 输入唯一文本并点击「发送」
3. 等待约 2 秒后读取 #chatMessages 文本
4. 断言 #chatMessages 包含刚发送的文本

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 成员端在 #chatInput 输入并点击「发送」后，#chatMessages 内能出现该条消息文本
- [ ] #2 agent-browser 脚本执行至步骤 7 断言通过（消息区域包含发送内容）
- [ ] #3 消息展示包含发送者标识与内容（可选）
<!-- AC:END -->
