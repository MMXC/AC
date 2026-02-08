---
id: TASK-144
title: UI 重制 - 房间页（观看与协作）
status: Done
assignee: []
created_date: '2026-02-08 08:26'
updated_date: '2026-02-08 10:13'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
使用设计系统与 ui-ux-pro-max 规范，重制房间内页：共享浏览区、侧边栏、成员列表、聊天、操作同步等区块的 UI；保持现有 WebSocket/信令与业务逻辑，仅更新布局、组件与样式；满足设计系统中 Layout、Touch & Interaction、Animation 等规则。

**Test Command**: `skill:watch-together-webapp-testing refactor-8-ui-room`

**Test Command**: `skill:watch-together-webapp-testing refactor-8-ui-room`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 房间内观看、聊天、操作同步等功能与原有一致
- [ ] #2 布局与组件符合设计系统；无横向滚动、焦点与触摸目标合格
- [ ] #3 相关 E2E 或用例测试通过
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-02-08 18:13:29 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-144
task: UI 重制 - 房间页（观看与协作）
test_command: "skill:watch-together-webapp-testing refactor-8-ui-room"
---

# Task: UI 重制 - 房间页（观看与协作）

## Description

使用设计系统与 ui-ux-pro-max 规范，重制房间内页：共享浏览区、侧边栏、成员列表、聊天、操作同步等区块的 UI；保持现有 WebSocket/信令与业务逻辑，仅更新布局、组件与样式；满足设计系统中 Layout、Touch & Interaction、Animation 等规则。

**Test Command**: `skill:watch-together-webapp-testing refactor-8-ui-room`

**Test Command**: `skill:watch-together-webapp-testing refactor-8-ui-room`

## Success Criteria

- [x] #1 房间内观看、聊天、操作同步等功能与原有一致
- [x] #2 布局与组件符合设计系统；无横向滚动、焦点与触摸目标合格
- [x] #3 相关 E2E 或用例测试通过

## Implementation Steps

1. **1.1 房间页布局与设计 Token** — 确认 join.html 已引用 design-tokens.css、layout.css，整体为 Shell（header + main，sidebar + area）；共享区、侧栏、聊天使用 CSS 变量（颜色、间距、圆角、触摸目标）。验收：npm run build 通过；房间页无横向滚动、主结构使用 token。
2. **1.2 侧栏与成员列表** — 侧栏区块（房间信息、我的信息、成员列表、聊天标题）统一使用 design token；成员列表项、按钮触摸目标 ≥44px，焦点 :focus-visible 可见。验收：侧栏样式来自 token，无硬编码色值。
3. **1.3 聊天与输入** — 聊天消息、输入框、发送按钮使用 token；输入框 focus 环、按钮 min-height 符合设计系统。验收：聊天区样式与 design-tokens.css 一致。
4. **1.4 共享区与操作按钮** — 视频占位、开始/停止共享按钮、分享房间链接按钮使用 token 与 layout；无横向溢出。验收：共享区与按钮符合 MASTER 组件规范。
5. **2.1 验收** — 运行 `npm run build` 通过；运行 `skill:watch-together-webapp-testing refactor-8-ui-room` 或 watch-together 单元测试通过；三项成功标准可勾选。
```
<!-- SECTION:NOTES:END -->
