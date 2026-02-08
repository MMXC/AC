---
id: TASK-145
title: 无障碍与交互终验
status: To Do
assignee: []
created_date: '2026-02-08 08:26'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
按 ui-ux-pro-max 的 Accessibility、Touch & Interaction、Animation 等规则做终验：键盘导航、焦点环、alt/aria、表单 label、触摸目标尺寸、加载与错误反馈、动效时长与 prefers-reduced-motion；修复不符合项并记录在交付清单中。

**Test Command**: `手动：键盘与屏幕阅读器走查 + 可选 axe 或 Lighthouse a11y`

**Test Command**: `手动：键盘与屏幕阅读器走查 + 可选 axe 或 Lighthouse a11y`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 关键流程可仅用键盘完成
- [ ] #2 焦点可见、表单有 label、图标按钮有 aria-label
- [ ] #3 触摸目标 ≥44px；动效尊重 prefers-reduced-motion
<!-- AC:END -->
