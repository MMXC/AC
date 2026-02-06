---
backlog_id: backlog-133
task: 房间页顶部 overlay（返回、房主信息、观看人数）
test_command: ""
---

# Task: 房间页顶部 overlay（返回、房主信息、观看人数）

## Description

在房间页主内容区之上增加顶部 overlay 层：含返回/关闭按钮、房主头像或房间名、观看人数（或当前成员数）。overlay 半透明或毛玻璃，不遮挡主内容过多；移动端需可点击。

**测试用例**:

**测试场景**:
1. 进入房间页，确认顶部有返回、房主/房间名、人数
2. 点击返回/关闭，确认可退出或返回

## Success Criteria

- [ ] #1 顶部 overlay 含返回或关闭按钮，点击可离开房间或返回上一页
- [ ] #2 顶部 overlay 展示房主头像或房间名（可从现有房间信息取数）
- [ ] #3 顶部 overlay 展示观看人数或当前成员数（可与现有成员列表数据同步）

## Implementation Steps

<!-- 细化约定时填写：步骤 + 每步验收，例如 -->
<!-- 1.1 加路由 — done when: GET /api/v1/rooms 返回 200 -->
<!-- 1.2 写 handler — done when: POST 入参校验失败返回 400 -->
