---
id: TASK-60
title: 成员端实现 ontrack 回调并将远端 MediaStream 传给 VideoPlayer
status: To Do
assignee: []
created_date: '2026-01-31 05:44'
labels: []
dependencies: []
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
