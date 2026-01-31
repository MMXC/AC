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
