---
id: TASK-64
title: 成员端播放器 UI 集成与状态展示
status: To Do
assignee: []
created_date: '2026-01-31 05:45'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
将 VideoPlayer 集成到真实房间页面，为成员端提供状态文案（等待房主开始共享 / 正在播放房主画面 / 房主已停止共享），并在 WebRTC 状态变化时正确更新。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 房主未开始共享时，成员端显示「等待房主开始共享...」
- [ ] #2 WebRTC 建立并收到远端流时，显示视频和「正在播放房主画面」
- [ ] #3 房主停止共享或连接断开时，停止播放并显示「房主已停止共享」或错误提示
- [ ] #4 状态文案与实际连接状态一致
<!-- AC:END -->
