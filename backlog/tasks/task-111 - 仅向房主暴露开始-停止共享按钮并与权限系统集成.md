---
id: TASK-111
title: 仅向房主暴露开始/停止共享按钮并与权限系统集成
status: To Do
assignee: []
created_date: '2026-01-31 11:19'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
仅当当前用户为房主时显示共享控制按钮；普通成员不显示或禁用。在后端/信令层增加校验，拒绝普通成员伪造发起共享的 WebRTC 信令，确保只有房主可作为媒体流发送方。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 currentUser.isOwner === true 时显示共享按钮，否则不显示/禁用
- [ ] #2 普通成员伪造共享请求时，后端拒绝
- [ ] #3 房主停止共享后，按钮/文案状态能及时恢复
- [ ] #4 权限逻辑不影响普通成员正常观看已有 WebRTC 视频流
<!-- AC:END -->
