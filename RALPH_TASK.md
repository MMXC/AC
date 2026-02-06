---
backlog_id: backlog-133
task: 房间页顶部 overlay（返回、房主信息、观看人数）
test_command: "docker compose up -d && .cursor/skills/watch-together-webapp-testing/run-test.sh TASK-133"
---

# Task: 房间页顶部 overlay（返回、房主信息、观看人数）

## Description

在房间页主内容区之上增加顶部 overlay 层：含返回/关闭按钮、房主头像或房间名、观看人数（或当前成员数）。overlay 半透明或毛玻璃，不遮挡主内容过多；移动端需可点击。

**测试用例**:

**测试场景**:
1. 进入房间页，确认顶部有返回、房主/房间名、人数
2. 点击返回/关闭，确认可退出或返回

## Success Criteria

- [x] #1 顶部 overlay 含返回或关闭按钮，点击可离开房间或返回上一页
- [x] #2 顶部 overlay 展示房主头像或房间名（可从现有房间信息取数）
- [x] #3 顶部 overlay 展示观看人数或当前成员数（可与现有成员列表数据同步）

## Implementation Steps

1. **1.1 顶部 overlay 容器与样式** — 在房间页主内容区（browser-area）顶部增加 overlay 层 DOM，半透明/毛玻璃样式，不遮挡主内容过多；移动端可点击。  
   **Acceptance**: 进入房间页可见顶部 overlay 条，有半透明或毛玻璃效果。

2. **1.2 返回/关闭按钮** — overlay 含返回或关闭按钮，点击可离开房间或返回上一页（如 history.back 或跳转首页）。  
   **Acceptance**: 点击按钮能退出房间或返回上一页。

3. **1.3 房主头像或房间名** — overlay 展示房主头像或房间名，从现有房间信息（room API / 成员列表 / window 变量）取数。  
   **Acceptance**: overlay 上显示房主昵称或房间名。

4. **1.4 观看人数/成员数** — overlay 展示当前成员数，与 getMembersList() 或现有成员列表数据同步。  
   **Acceptance**: 人数随成员列表变化更新。

5. **2.1 测试** — 可选：跑 TASK-133 或手动验证两场景（进入房间见 overlay；点击返回可退出）。
