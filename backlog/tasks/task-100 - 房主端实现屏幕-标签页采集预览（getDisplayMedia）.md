---
id: TASK-100
title: 房主端实现屏幕/标签页采集预览（getDisplayMedia）
status: Done
assignee: []
created_date: '2026-01-31 11:16'
updated_date: '2026-01-31 17:48'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在房主房间页面实现「开始共享 / 停止共享」按钮，通过 navigator.mediaDevices.getDisplayMedia 采集屏幕或浏览器标签页，并在本地 <video> 元素中预览。确保点击停止后正确关闭 MediaStream 轨道并清理预览。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 点击「开始共享」后浏览器弹出屏幕/标签页选择对话框，用户可成功选择内容
- [ ] #2 选择内容后，本地预览 <video> 可实时显示采集画面
- [ ] #3 点击「停止共享」后，预览停止且 MediaStream 轨道已关闭
- [ ] #4 多次开始/停止共享不会造成异常
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-02-01 01:48:44 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-100
task: 房主端实现屏幕/标签页采集预览（getDisplayMedia）
test_command: "skill:watch-together-webapp-testing ${TASK_ID}"
---

# Task: 房主端实现屏幕/标签页采集预览（getDisplayMedia）

## Description

在房主房间页面实现「开始共享 / 停止共享」按钮，通过 navigator.mediaDevices.getDisplayMedia 采集屏幕或浏览器标签页，并在本地 <video> 元素中预览。确保点击停止后正确关闭 MediaStream 轨道并清理预览。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

## Success Criteria

- [x] #1 点击「开始共享」后浏览器弹出屏幕/标签页选择对话框，用户可成功选择内容
- [x] #2 选择内容后，本地预览 <video> 可实时显示采集画面
- [x] #3 点击「停止共享」后，预览停止且 MediaStream 轨道已关闭
- [x] #4 多次开始/停止共享不会造成异常
```
<!-- SECTION:NOTES:END -->
