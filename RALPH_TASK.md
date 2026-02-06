---
backlog_id: backlog-136
task: 房间页 375px 移动端视口适配
test_command: ""
---

# Task: 房间页 375px 移动端视口适配

## Description

在 375px 宽度视口（或 320px）下，房间页布局正常：主内容区、顶部 overlay、右侧竖条、聊天入口均可用，无横向溢出，主要按钮可点击。

**测试用例**:

**测试场景**:
1. 将浏览器视口调整为 375px 宽，打开房间页
2. 依次点击顶部返回、右侧操作、聊天入口，确认无错位与遮挡导致无法点击

## Success Criteria

- [ ] #1 375px 视口下无横向滚动条，无内容明显溢出
- [ ] #2 顶部 overlay、右侧竖条、聊天入口在移动视口下可见且可点
- [ ] #3 主内容区在移动端仍为主体，可读/可用

## Implementation Steps

<!-- 细化约定时填写：步骤 + 每步验收，例如 -->
<!-- 1.1 加路由 — done when: GET /api/v1/rooms 返回 200 -->
<!-- 1.2 写 handler — done when: POST 入参校验失败返回 400 -->
