---
id: TASK-41
title: WebRTC 错误处理与重试策略
status: In Progress
assignee: []
created_date: '2026-01-28 11:55'
updated_date: '2026-01-28 21:13'
labels: []
dependencies: []
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
为 getDisplayMedia、ICE 协商失败、信令中断等关键路径增加错误处理和有限重试策略，为房主/成员提供清晰的错误提示，并在合理范围内自动重试或提示用户刷新/重进。

**Test Command**: `手动：刻意制造权限拒绝、断网、关闭服务器等错误场景，观察前后端提示与行为`

**测试用例**:

**测试场景**:
1. 权限拒绝、ICE 失败、信令中断三种场景分别触发错误分支
2. 测试自动重连次数与间隔是否符合预期（例如 3 次，每次间隔 5 秒）

**Test Command**: `手动：刻意制造权限拒绝、断网、关闭服务器等错误场景，观察前后端提示与行为`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 房主拒绝 getDisplayMedia 权限时有明确错误提示而非静默失败
- [ ] #2 ICE 长时间协商失败时能超时退出并提示用户检查网络/稍后重试
- [ ] #3 WebSocket 信令中断时，前端能检测到并停止共享/播放，提示错误
- [ ] #4 对可恢复错误在限制次数内尝试自动重连，失败后给出清晰说明
<!-- AC:END -->
