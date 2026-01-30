---
id: TASK-32
title: 房主端实现屏幕/标签页采集预览（getDisplayMedia）
status: To Do
assignee: []
created_date: '2026-01-28 11:54'
updated_date: '2026-01-30 15:50'
labels: []
dependencies: []
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在房主房间页面实现“开始共享 / 停止共享”按钮，通过 navigator.mediaDevices.getDisplayMedia 采集屏幕或浏览器标签页，并在本地 <video> 元素中预览采集到的 MediaStream。确保点击停止后正确关闭 MediaStream 轨道并清理预览。

**Test Command**: `手动：在浏览器中打开房主页面，点击开始/停止共享按钮，观察本地预览行为`

**测试用例**:

**测试场景**:
1. 首次授权、已授权、拒绝授权三种浏览器权限状态下分别测试开始/停止共享流程
2. 共享浏览器标签页、共享整个屏幕、共享应用窗口三种模式下验证预览行为

**Test Command**: `手动：在浏览器中打开房主页面，点击开始/停止共享按钮，观察本地预览行为`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 点击“开始共享”后浏览器弹出屏幕/标签页选择对话框，用户可成功选择要共享的内容
- [ ] #2 选择内容后，本地预览 <video> 可以实时显示采集到的画面（含鼠标移动/页面滚动等）
- [ ] #3 点击“停止共享”后，预览 <video> 停止播放且 MediaStream 轨道已关闭（不会继续占用系统共享状态）
- [ ] #4 多次开始/停止共享不会造成异常（例如多重预览、权限状态卡死等）
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-01-29 01:21:46 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-32
task: 房主端实现屏幕/标签页采集预览（getDisplayMedia）
test_command: "手动：在浏览器中打开房主页面，点击开始/停止共享按钮，观察本地预览行为"
---

# Task: 房主端实现屏幕/标签页采集预览（getDisplayMedia）

## Description

在房主房间页面实现“开始共享 / 停止共享”按钮，通过 navigator.mediaDevices.getDisplayMedia 采集屏幕或浏览器标签页，并在本地 <video> 元素中预览采集到的 MediaStream。确保点击停止后正确关闭 MediaStream 轨道并清理预览。

**Test Command**: `手动：在浏览器中打开房主页面，点击开始/停止共享按钮，观察本地预览行为`

**测试用例**:

**测试场景**:
1. 首次授权、已授权、拒绝授权三种浏览器权限状态下分别测试开始/停止共享流程
2. 共享浏览器标签页、共享整个屏幕、共享应用窗口三种模式下验证预览行为

**Test Command**: `手动：在浏览器中打开房主页面，点击开始/停止共享按钮，观察本地预览行为`

## Success Criteria

- [x] #1 点击“开始共享”后浏览器弹出屏幕/标签页选择对话框，用户可成功选择要共享的内容
- [x] #2 选择内容后，本地预览 <video> 可以实时显示采集到的画面（含鼠标移动/页面滚动等）
- [x] #3 点击“停止共享”后，预览 <video> 停止播放且 MediaStream 轨道已关闭（不会继续占用系统共享状态）
- [x] #4 多次开始/停止共享不会造成异常（例如多重预览、权限状态卡死等）
```
<!-- SECTION:NOTES:END -->
