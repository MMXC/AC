---
id: TASK-39
title: 仅向房主暴露开始/停止共享按钮并与权限系统集成
status: Done
assignee: []
created_date: '2026-01-28 11:54'
updated_date: '2026-01-28 20:29'
updated_date: '2026-01-28 20:56'
labels: []
dependencies: []
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
仅当当前用户为房主时显示共享控制按钮；普通成员不显示或禁用。同时在后端/信令层增加校验，拒绝普通成员伪造发起共享的 WebRTC 信令，确保只有房主可以作为媒体流发送方。

**Test Command**: `手动：分别以房主和普通成员身份进入房间，检查按钮与权限行为`

**测试用例**:

**测试场景**:
1. 房主登录时按钮可见且可操作，普通成员登录时按钮不可见
2. 普通成员在控制台尝试伪造 WEBRTC_OFFER，后端日志中能记录并拒绝该行为

**Test Command**: `手动：分别以房主和普通成员身份进入房间，检查按钮与权限行为`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 currentUser.isOwner === true 时页面显示共享按钮，否则不显示/禁用
- [ ] #2 普通成员即使在控制台调用前端共享方法，后端也会拒绝该共享请求
- [ ] #3 房主停止共享后，按钮/文案状态能及时恢复
- [ ] #4 权限逻辑不影响普通成员正常观看已有 WebRTC 视频流
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-01-29 04:56:49 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-39
task: 仅向房主暴露开始/停止共享按钮并与权限系统集成
test_command: "手动：分别以房主和普通成员身份进入房间，检查按钮与权限行为"
---

# Task: 仅向房主暴露开始/停止共享按钮并与权限系统集成

## Description

仅当当前用户为房主时显示共享控制按钮；普通成员不显示或禁用。同时在后端/信令层增加校验，拒绝普通成员伪造发起共享的 WebRTC 信令，确保只有房主可以作为媒体流发送方。

**Test Command**: `手动：分别以房主和普通成员身份进入房间，检查按钮与权限行为`

**测试用例**:

**测试场景**:
1. 房主登录时按钮可见且可操作，普通成员登录时按钮不可见
2. 普通成员在控制台尝试伪造 WEBRTC_OFFER，后端日志中能记录并拒绝该行为

**Test Command**: `手动：分别以房主和普通成员身份进入房间，检查按钮与权限行为`

## Success Criteria

- [x] #1 currentUser.isOwner === true 时页面显示共享按钮，否则不显示/禁用
- [x] #2 普通成员即使在控制台调用前端共享方法，后端也会拒绝该共享请求
- [x] #3 房主停止共享后，按钮/文案状态能及时恢复
- [x] #4 权限逻辑不影响普通成员正常观看已有 WebRTC 视频流
```
<!-- SECTION:NOTES:END -->
