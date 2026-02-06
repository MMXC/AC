---
id: TASK-135
title: 房间页聊天/评论以底部或 overlay 展示且可收起
status: In Progress
assignee: []
created_date: '2026-02-06 21:37'
updated_date: '2026-02-06 22:04'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
将现有聊天区域从固定侧栏改为底部区域或 overlay 形式：可收起/展开，不长期遮挡主内容；展开时显示原有聊天消息与输入框，行为与现有 chat 逻辑一致。

**测试用例**:

**测试场景**:
1. 进入房间，确认聊天可收起/展开
2. 展开后发送一条消息，确认自己与对方（若有）可见
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 聊天以底部区域或浮层形式展示，默认可收起或半高，不长期占满主内容
- [ ] #2 有明确入口（如底部「评论/聊天」按钮）展开聊天区域
- [ ] #3 展开后聊天消息列表与输入框可用，发送与接收与现有逻辑一致
<!-- AC:END -->
