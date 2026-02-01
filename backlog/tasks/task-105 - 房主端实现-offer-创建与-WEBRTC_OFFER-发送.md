---
id: TASK-105
title: 房主端实现 offer 创建与 WEBRTC_OFFER 发送
<<<<<<< HEAD
status: Done
assignee: []
created_date: '2026-01-31 11:17'
updated_date: '2026-01-31 19:00'
=======
status: In Progress
assignee: []
created_date: '2026-01-31 11:17'
updated_date: '2026-01-31 18:56'
>>>>>>> task/TASK-104
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在房主端点击「开始共享」时：1) 调用 getDisplayMedia 获取 MediaStream；2) 创建 RTCPeerConnection 并 addTrack；3) createOffer 生成 offer；4) 通过 WebSocket 向目标成员发送 WEBRTC_OFFER（含 roomId、fromUserId、toUserId、sdp）。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 点击开始共享后能成功获取 getDisplayMedia 流
- [ ] #2 能正确创建 RTCPeerConnection 并将流轨道添加进去
- [ ] #3 createOffer 成功后能通过 WebSocket 发送格式正确的 WEBRTC_OFFER
- [ ] #4 WEBRTC_OFFER 包含 toUserId 和 sdp 字段
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-02-01 03:00:19 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-105
task: 房主端实现 offer 创建与 WEBRTC_OFFER 发送
test_command: "skill:watch-together-webapp-testing ${TASK_ID}"
---

# Task: 房主端实现 offer 创建与 WEBRTC_OFFER 发送

## Description

在房主端点击「开始共享」时：1) 调用 getDisplayMedia 获取 MediaStream；2) 创建 RTCPeerConnection 并 addTrack；3) createOffer 生成 offer；4) 通过 WebSocket 向目标成员发送 WEBRTC_OFFER（含 roomId、fromUserId、toUserId、sdp）。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

## Success Criteria

- [x] #1 点击开始共享后能成功获取 getDisplayMedia 流
- [x] #2 能正确创建 RTCPeerConnection 并将流轨道添加进去
- [x] #3 createOffer 成功后能通过 WebSocket 发送格式正确的 WEBRTC_OFFER
- [x] #4 WEBRTC_OFFER 包含 toUserId 和 sdp 字段
```
<!-- SECTION:NOTES:END -->
