---
id: TASK-108
title: 成员端实现 ontrack 回调并将远端 MediaStream 传给 VideoPlayer
status: Done
assignee: []
created_date: '2026-01-31 11:18'
updated_date: '2026-02-01 07:49'
labels: []
dependencies: []
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在成员端 RTCPeerConnection 上设置 ontrack 回调，收到远端流时从 event.streams[0] 获取 MediaStream，调用 VideoPlayer.attachStream(stream)，使成员端 <video> 播放房主共享画面。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ontrack 回调能正确触发并获取 event.streams[0]
- [ ] #2 能调用 VideoPlayer.attachStream(stream) 将远端流传入
- [ ] #3 成员端 <video> 能实时播放房主共享画面
- [ ] #4 房主停止共享时，成员端能正确 detachStream 并更新 UI
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-02-01 03:16:49 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-108
task: 成员端实现 ontrack 回调并将远端 MediaStream 传给 VideoPlayer
test_command: "skill:watch-together-webapp-testing ${TASK_ID}"
---

# Task: 成员端实现 ontrack 回调并将远端 MediaStream 传给 VideoPlayer

## Description

在成员端 RTCPeerConnection 上设置 ontrack 回调，收到远端流时从 event.streams[0] 获取 MediaStream，调用 VideoPlayer.attachStream(stream)，使成员端 <video> 播放房主共享画面。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

## Success Criteria

- [x] #1 ontrack 回调能正确触发并获取 event.streams[0]
- [x] #2 能调用 VideoPlayer.attachStream(stream) 将远端流传入
- [x] #3 成员端 <video> 能实时播放房主共享画面
- [x] #4 房主停止共享时，成员端能正确 detachStream 并更新 UI
```
<!-- SECTION:NOTES:END -->
