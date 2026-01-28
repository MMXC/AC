---
id: TASK-33
title: 成员端实现可附加 MediaStream 的视频播放器组件
status: To Do
assignee: []
created_date: '2026-01-28 11:54'
updated_date: '2026-01-28 16:36'
labels: []
dependencies: []
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在成员房间页面实现独立的 VideoPlayer 组件，对外暴露 attachStream(MediaStream) 和 detachStream() 接口，用于播放远端 MediaStream（目前先用假数据或本地 getUserMedia 模拟）。组件不关心 WebRTC 细节，只关心 MediaStream。

**Test Command**: `手动：在成员页面控制台通过测试函数传入 MediaStream，观察 <video> 播放行为`

**测试用例**:

**测试场景**:
1. 使用 getUserMedia({ video: true }) 获取本地摄像头流传给 attachStream，确认画面正常
2. 快速多次调用 attachStream 传入不同流，确认不会残留旧视频画面
3. 调用 detachStream 后，组件 UI 正确更新为“暂无视频流”

**Test Command**: `手动：在成员页面控制台通过测试函数传入 MediaStream，观察 <video> 播放行为`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 VideoPlayer 组件可以在不刷新页面的情况下多次 attachStream / detachStream 而不会出现内存泄漏或挂死
- [ ] #2 附加合法 MediaStream 时，成员端 <video> 能正常播放画面和（可选）音频
- [ ] #3 detachStream 后，视频区域清空或显示“等待流”状态，不再占用旧的 MediaStream 轨道
- [ ] #4 组件不依赖 WebRTC 细节，只关心拿到的 MediaStream 对象
<!-- AC:END -->
