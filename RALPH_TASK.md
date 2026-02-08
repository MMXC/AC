---
backlog_id: backlog-140
task: 应用设计系统到布局与主题
test_command: "手动：对照 MASTER.md 检查主题与布局；可选用 Lighthouse 或 a11y 工具做基础检查"
---

# Task: 应用设计系统到布局与主题

## Description

将 design-system/MASTER.md 中的颜色、字体、间距、圆角、阴影等落地为 CSS 变量或 Tailwind 主题；实现全局布局组件（如 Shell、Nav、Content 区域），并确保与设计系统中的 Layout & Responsive、Typography & Color 一致。遵循 ui-ux-pro-max 的 Pre-Delivery 清单（对比度、焦点、触摸目标等）。

**Test Command**: `手动：对照 MASTER.md 检查主题与布局；可选用 Lighthouse 或 a11y 工具做基础检查`

**Test Command**: `手动：对照 MASTER.md 检查主题与布局；可选用 Lighthouse 或 a11y 工具做基础检查`

## Success Criteria

- [x] #1 主题变量/Token 与设计系统一致
- [x] #2 至少一个全局布局组件可用且响应式
- [x] #3 满足设计系统中列出的关键 a11y 与触摸规范

## Implementation Steps

1. **1.1 设计 Token 文件** — done when: 存在 `watch-together/css/design-tokens.css`，`:root` 含 MASTER.md 的颜色、字体、间距、圆角、阴影变量，且与 MASTER 表一致。
2. **1.2 全局布局组件** — done when: 存在 `watch-together/css/layout.css`，提供 Shell（.shell）、Nav（.shell__nav）、Content（.shell__content）结构；在 375px / 768px / 1024px 断点下布局可用无横向滚动。
3. **1.3 应用 Token 到首页** — done when: `index.html` 引用 design-tokens.css，页面使用 CSS 变量（颜色/字体/间距/阴影），视觉与 MASTER 一致。
4. **1.4 应用布局与 Token 到房间页** — done when: `join.html` 引用 design-tokens.css 与 layout.css，房间页采用 Shell 布局（header + main），侧栏与内容区使用 token。
5. **2.1 a11y 与触摸规范** — done when: 焦点可见（:focus-visible）、可点击元素最小触摸目标 ≥44px、支持 prefers-reduced-motion、正文对比度满足 4.5:1（与 MASTER Pre-Delivery 一致）。
