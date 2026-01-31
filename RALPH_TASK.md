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

- [ ] #1 VideoPlayer 可多次 attachStream / detachStream 而无内存泄漏或挂死
- [ ] #2 附加合法 MediaStream 时，成员端 <video> 能正常播放画面和（可选）音频
- [ ] #3 detachStream 后，视频区域清空或显示「等待流」状态
- [ ] #4 组件不依赖 WebRTC 细节，只关心 MediaStream 对象
