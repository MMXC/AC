---
id: TASK-139
title: 前端脚手架与基础结构
status: In Progress
assignee: []
created_date: '2026-02-08 08:24'
updated_date: '2026-02-08 08:46'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
若迁移到 React/Next.js：初始化 Next.js 项目（或 React+Vite），配置 Tailwind、ESLint、与现有 watch-together 后端/WS 的对接方式；若保留现有栈：建立清晰的组件化/模块目录与入口（如按页面或功能划分的 JS/CSS 模块）。确保构建与本地运行可通过。

**Test Command**: `npm run build`

**Test Command**: `npm run build`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 新前端可本地启动且能访问占位首页或现有入口
- [ ] #2 构建无报错；若迁移，与后端/WS 的对接方式已文档化或可连通
- [ ] #3 目录结构符合任务 1 的架构约定
<!-- AC:END -->
