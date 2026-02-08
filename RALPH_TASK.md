---
backlog_id: backlog-139
task: 前端脚手架与基础结构
test_command: "npm run build"
---

# Task: 前端脚手架与基础结构

## Description

若迁移到 React/Next.js：初始化 Next.js 项目（或 React+Vite），配置 Tailwind、ESLint、与现有 watch-together 后端/WS 的对接方式；若保留现有栈：建立清晰的组件化/模块目录与入口（如按页面或功能划分的 JS/CSS 模块）。确保构建与本地运行可通过。

**Test Command**: `npm run build`

**Test Command**: `npm run build`

## Success Criteria

- [x] #1 新前端可本地启动且能访问占位首页或现有入口
- [x] #2 构建无报错；若迁移，与后端/WS 的对接方式已文档化或可连通
- [x] #3 目录结构符合任务 1 的架构约定

## Implementation Steps

1. **1.1 根目录与 watch-together 的 build 脚本** — done when: 在仓库根目录执行 `npm run build` 无报错且退出码 0（当前栈为多页面 HTML + 模块化 JS，无 bundler，build 可为静态校验或通过即可）。
2. **1.2 本地启动与占位首页** — done when: 前端可本地启动（如 `docker compose up watch-together` 或 watch-together 内 `npm start`），访问入口（如 `/` 或 `index.html`）可打开占位首页或现有创建房间页。
3. **1.3 与后端/WS 对接文档化** — done when: 与 watch-together-server/WS 的对接方式在 README 或 docs 中已说明（API 基址、WS 地址、环境变量或现有 architecture-decisions 引用）。
4. **2.1 目录结构符合架构约定** — done when: watch-together 目录与 `watch-together/docs/architecture-decisions.md` 第 4 节草图一致（index.html、join.html、js/、docs/ 等），必要时补充缺失项。
