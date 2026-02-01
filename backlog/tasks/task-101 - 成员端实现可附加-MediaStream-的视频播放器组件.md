---
id: TASK-101
title: 成员端实现可附加 MediaStream 的视频播放器组件
status: Done
assignee: []
created_date: '2026-01-31 11:16'
updated_date: '2026-02-01 07:49'
labels: []
dependencies: []
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在成员房间页面实现 VideoPlayer 组件，对外暴露 attachStream(MediaStream) 和 detachStream()，用于播放远端 MediaStream（先用 getUserMedia 模拟）。组件不关心 WebRTC 细节，只关心 MediaStream。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 VideoPlayer 可多次 attachStream / detachStream 而无内存泄漏或挂死
- [ ] #2 附加合法 MediaStream 时，成员端 <video> 能正常播放画面和（可选）音频
- [ ] #3 detachStream 后，视频区域清空或显示「等待流」状态
- [ ] #4 组件不依赖 WebRTC 细节，只关心 MediaStream 对象
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-02-01 02:33:34 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-101
task: 成员端实现可附加 MediaStream 的视频播放器组件
test_command: "skill:watch-together-webapp-testing ${TASK_ID}"
---

# Task: 成员端实现可附加 MediaStream 的视频播放器组件

## Description

在成员房间页面实现 VideoPlayer 组件，对外暴露 attachStream(MediaStream) 和 detachStream()，用于播放远端 MediaStream（先用 getUserMedia 模拟）。组件不关心 WebRTC 细节，只关心 MediaStream。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

## Success Criteria

- [x] #1 VideoPlayer 可多次 attachStream / detachStream 而无内存泄漏或挂死
- [x] #2 附加合法 MediaStream 时，成员端 <video> 能正常播放画面和（可选）音频
- [x] #3 detachStream 后，视频区域清空或显示「等待流」状态
- [x] #4 组件不依赖 WebRTC 细节，只关心 MediaStream 对象
```
<!-- SECTION:NOTES:END -->
