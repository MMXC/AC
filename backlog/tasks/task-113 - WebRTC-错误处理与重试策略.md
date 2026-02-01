---
id: TASK-113
title: WebRTC 错误处理与重试策略
status: Done
assignee: []
created_date: '2026-01-31 11:20'
updated_date: '2026-02-01 05:37'
labels: []
dependencies: []
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
为 getDisplayMedia、ICE 协商失败、信令中断等关键路径增加错误处理和有限重试，为房主/成员提供清晰错误提示，并在合理范围内自动重试或提示用户刷新/重进。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 房主拒绝 getDisplayMedia 权限时有明确错误提示
- [ ] #2 ICE 长时间协商失败时能超时退出并提示用户检查网络
- [ ] #3 WebSocket 信令中断时，前端能检测并停止共享/播放，提示错误
- [ ] #4 对可恢复错误在限制次数内尝试自动重连，失败后给出清晰说明
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-02-01 03:50:03 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-113
task: WebRTC 错误处理与重试策略
test_command: "skill:watch-together-webapp-testing ${TASK_ID}"
---

# Task: WebRTC 错误处理与重试策略

## Description

为 getDisplayMedia、ICE 协商失败、信令中断等关键路径增加错误处理和有限重试，为房主/成员提供清晰错误提示，并在合理范围内自动重试或提示用户刷新/重进。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

## Success Criteria

- [x] #1 房主拒绝 getDisplayMedia 权限时有明确错误提示
- [x] #2 ICE 长时间协商失败时能超时退出并提示用户检查网络
- [x] #3 WebSocket 信令中断时，前端能检测并停止共享/播放，提示错误
- [x] #4 对可恢复错误在限制次数内尝试自动重连，失败后给出清晰说明
```
<!-- SECTION:NOTES:END -->
