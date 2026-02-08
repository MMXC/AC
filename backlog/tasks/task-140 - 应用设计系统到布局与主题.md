---
id: TASK-140
title: 应用设计系统到布局与主题
status: To Do
assignee: []
created_date: '2026-02-08 08:24'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
将 design-system/MASTER.md 中的颜色、字体、间距、圆角、阴影等落地为 CSS 变量或 Tailwind 主题；实现全局布局组件（如 Shell、Nav、Content 区域），并确保与设计系统中的 Layout & Responsive、Typography & Color 一致。遵循 ui-ux-pro-max 的 Pre-Delivery 清单（对比度、焦点、触摸目标等）。

**Test Command**: `手动：对照 MASTER.md 检查主题与布局；可选用 Lighthouse 或 a11y 工具做基础检查`

**Test Command**: `手动：对照 MASTER.md 检查主题与布局；可选用 Lighthouse 或 a11y 工具做基础检查`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 主题变量/Token 与设计系统一致
- [ ] #2 至少一个全局布局组件可用且响应式
- [ ] #3 满足设计系统中列出的关键 a11y 与触摸规范
<!-- AC:END -->
