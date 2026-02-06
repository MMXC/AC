---
id: TASK-135
title: 房间页聊天/评论以底部或 overlay 展示且可收起
status: Done
assignee: []
created_date: '2026-02-06 21:37'
updated_date: '2026-02-06 22:16'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-02-07 06:16:29 - 任务完成，RALPH_TASK.md 已归档

---

## 测试通过 (Test Passed)

- **测试时间**: 2026-02-07 06:16:29
- **测试结果截图** (保存在 `backlog/test-results/task-135/`):
  - [final.png](backlog/test-results/task-135/final.png)
  - [initial.png](backlog/test-results/task-135/initial.png)

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-135
task: 房间页聊天/评论以底部或 overlay 展示且可收起
test_command: "docker compose up -d && .cursor/skills/watch-together-webapp-testing/run-test.sh TASK-135"
---

# Task: 房间页聊天/评论以底部或 overlay 展示且可收起

## Description

将现有聊天区域从固定侧栏改为底部区域或 overlay 形式：可收起/展开，不长期遮挡主内容；展开时显示原有聊天消息与输入框，行为与现有 chat 逻辑一致。

**测试用例**:

**测试场景**:
1. 进入房间，确认聊天可收起/展开
2. 展开后发送一条消息，确认自己与对方（若有）可见

## Success Criteria

- [x] #1 聊天以底部区域或浮层形式展示，默认可收起或半高，不长期占满主内容
- [x] #2 有明确入口（如底部「评论/聊天」按钮）展开聊天区域
- [x] #3 展开后聊天消息列表与输入框可用，发送与接收与现有逻辑一致

## Implementation Steps

1.1 **将聊天从侧栏改为底部抽屉/浮层** — done when: 页面底部有可收起的聊天容器，默认收起或半高，不长期占满主内容  
1.2 **添加底部「评论/聊天」入口按钮** — done when: 点击按钮可展开/收起聊天区域  
1.3 **展开后消息列表与输入框与现有逻辑一致** — done when: 展开后 #chatMessages、#chatInput、发送/接收与 chat.js 现有行为一致  
2.1 **（可选）跑前端或 E2E 测试** — done when: 无回归、手动或自动化验证通过
```
<!-- SECTION:NOTES:END -->
