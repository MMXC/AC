# 需求概要：watch-together UI 重制与前端重构

- **类型**: `page`（页面/前端重构）
- **范围**: watch-together 前端：在现有功能基础上，使用 **ui-ux-pro-max** 重制 UI，使用 **vercel-react-best-practices** 重构前端代码；引入**组件式/可组合**页面架构，便于后续扩展与维护。
- **技术栈**: React / Next.js（或保留现有栈时采用组件化模块结构）、Tailwind、设计系统（由 ui-ux-pro-max 生成）、符合 Vercel React 最佳实践的数据与渲染模式。
- **约束**: 不改变现有业务功能与接口契约；重构后需通过现有或迁移后的前端/集成测试。

---

## 组件式 / 插件式页面框架技能与选型

### 技能库中相关技能（无单独“页面框架”技能，以下组合即组件式+设计系统驱动）

| 技能 | 用途 | 与组件/插件式的关系 |
|------|------|----------------------|
| **ui-ux-pro-max** | 设计系统、风格、配色、字体、组件元素（button, modal, navbar, sidebar, card, form, chart） | 提供统一设计规范与组件级 UI 规范；支持栈含 React、Next.js、Tailwind、**shadcn/ui**。 |
| **vercel-react-best-practices** | React/Next.js 性能与结构最佳实践 | **Component Composition** 并行数据获取、避免 barrel 导入、dynamic import、Suspense、SWR 等，天然适合组件化与“按需加载”的插件式页面。 |
| **frontend-design** | 高质量前端界面与组件实现 | 与 ui-ux-pro-max 配合落地视觉与交互。 |
| **shadcn**（ui-ux-pro-max 栈之一） | 组件库、主题、表单与模式 | 可复制组件、可定制，适合作为**组件式页面**的 UI 基底。 |

### 组件式 / 插件式实现方式建议

- **组件式**: 以 React 组件为页面单元，按**组合优于继承**（vercel-react-best-practices + 常见规范）；页面由布局组件 + 功能组件组合而成，数据获取按“组件边界”并行（避免 waterfall）。
- **插件式 / 按需加载**: 使用 **next/dynamic** 或等价 dynamic import 加载非首屏区块；第三方或非关键脚本在 hydration 后加载；路由或功能模块可拆为独立 chunk，实现“功能即插件”的加载策略。
- **设计系统驱动**: 使用 **ui-ux-pro-max** 生成并持久化设计系统（`--design-system --persist`），页面与组件均引用同一套 MASTER + 页面级 override，保证一致性与可维护性。设计系统主文件：**`design-system/MASTER.md`**（页面级覆盖：`design-system/watch-together/pages/<page>.md`）。

---

## 任务结构（可被 parse-decomposed-tasks / backlog 解析）

### 任务 1: 技术选型与架构约定

- **ID**: refactor-1-arch
- **描述**: 确定 watch-together 前端重构的架构：是否迁移到 React/Next.js，或保留当前栈下采用组件化/模块化目录与构建；约定目录结构、路由与“页面 = 布局 + 可组合组件”的拆分方式；文档化选型理由与与 ui-ux-pro-max、vercel-react-best-practices 的对应关系。
- **测试命令**: `手动：评审架构文档与目录草图`
- **成功标准**:
  1. [ ] 架构决策（React/Next 迁移与否）已记录
  2. [ ] 组件化/可组合页面与数据获取策略已说明（可引用 vercel-react-best-practices）
  3. [ ] 与 ui-ux-pro-max 设计系统的集成方式已约定
- **测试用例**:
  - **测试数据**: 无
  - **测试场景**: 评审会议或文档审阅通过
  - **断言示例**: 无
- **依赖**: 无

### 任务 2: 使用 ui-ux-pro-max 生成并持久化设计系统

- **ID**: refactor-2-design-system
- **描述**: 使用 ui-ux-pro-max 技能为 watch-together 生成完整设计系统（产品类型：实时协作/一起看；风格：现代、可访问、可深色）。执行 `--design-system --persist` 并写入 `design-system/MASTER.md`；如需页面级差异可生成 `design-system/pages/<page>.md`。在 newneed 或设计文档中引用设计系统路径。
- **测试命令**: `手动：检查 design-system/MASTER.md 存在且含 Pattern/Style/Colors/Typography/Effects/Anti-patterns`
- **成功标准**:
  1. [ ] design-system/MASTER.md 已生成且内容完整
  2. [ ] 设计系统在 newneed 或项目文档中有引用说明
  3. [ ] 与当前 watch-together 产品类型与风格一致
- **测试用例**:
  - **测试数据**: 无
  - **测试场景**: 打开 MASTER.md 核对章节与示例
  - **断言示例**: 无
- **依赖**: refactor-1-arch

### 任务 3: 前端脚手架与基础结构

- **ID**: refactor-3-scaffold
- **描述**: 若迁移到 React/Next.js：初始化 Next.js 项目（或 React+Vite），配置 Tailwind、ESLint、与现有 watch-together 后端/WS 的对接方式；若保留现有栈：建立清晰的组件化/模块目录与入口（如按页面或功能划分的 JS/CSS 模块）。确保构建与本地运行可通过。
- **测试命令**: `npm run build` 或项目既定构建命令
- **成功标准**:
  1. [ ] 新前端可本地启动且能访问占位首页或现有入口
  2. [ ] 构建无报错；若迁移，与后端/WS 的对接方式已文档化或可连通
  3. [ ] 目录结构符合任务 1 的架构约定
- **测试用例**:
  - **测试数据**: 无
  - **测试场景**: 执行构建与一次手动访问
  - **断言示例**: 无
- **依赖**: refactor-1-arch

### 任务 4: 应用设计系统到布局与主题

- **ID**: refactor-4-theme-layout
- **描述**: 将 design-system/MASTER.md 中的颜色、字体、间距、圆角、阴影等落地为 CSS 变量或 Tailwind 主题；实现全局布局组件（如 Shell、Nav、Content 区域），并确保与设计系统中的 Layout & Responsive、Typography & Color 一致。遵循 ui-ux-pro-max 的 Pre-Delivery 清单（对比度、焦点、触摸目标等）。
- **测试命令**: `手动：对照 MASTER.md 检查主题与布局；可选用 Lighthouse 或 a11y 工具做基础检查`
- **成功标准**:
  1. [ ] 主题变量/Token 与设计系统一致
  2. [ ] 至少一个全局布局组件可用且响应式
  3. [ ] 满足设计系统中列出的关键 a11y 与触摸规范
- **测试用例**:
  - **测试数据**: 无
  - **测试场景**: 在桌面与移动视口下查看布局与字体
  - **断言示例**: 无
- **依赖**: refactor-2-design-system, refactor-3-scaffold

### 任务 5: 按组件组合拆分页面与数据获取

- **ID**: refactor-5-composition
- **描述**: 将现有页面拆分为可组合的组件（如创建房间、房间内、侧边栏、聊天、共享浏览区等）；数据获取按 vercel-react-best-practices：独立请求用 Promise.all/并行，有依赖的用 better-all 或先发请求再 await；若使用 RSC，则用组件组合实现并行 fetch，避免 waterfall。文档化每个页面的组件树与数据流。
- **测试命令**: `手动：代码审阅 + 运行时检查无多余串行请求`
- **成功标准**:
  1. [ ] 主要页面均由多个可复用组件组合而成
  2. [ ] 数据获取无不必要的串行等待（符合 vercel-react-best-practices 第 1、3 类规则）
  3. [ ] 组件边界与数据依赖在文档或注释中可追溯
- **测试用例**:
  - **测试数据**: 无
  - **测试场景**: 打开关键页面，用网络面板或日志确认请求顺序
  - **断言示例**: 无
- **依赖**: refactor-3-scaffold

### 任务 6: 包体与运行时性能优化

- **ID**: refactor-6-bundle-perf
- **描述**: 按 vercel-react-best-practices 优化包体与运行时：避免 barrel 导入、对重组件使用 dynamic import、非关键第三方在 hydration 后加载；必要时使用 SWR 或 React.cache 做请求去重与缓存；列表使用 content-visibility 或虚拟化（若适用）。不改变功能行为。
- **测试命令**: `手动：对比重构前后 bundle 大小或 LCP/TTI；现有测试仍通过`
- **成功标准**:
  1. [ ] 关键路径无 barrel 导入或已通过 optimizePackageImports 等等价方式优化
  2. [ ] 重组件或非首屏模块已动态加载
  3. [ ] 现有前端/集成测试全部通过
- **测试用例**:
  - **测试数据**: 无
  - **测试场景**: 运行项目测试套件；可选跑 Lighthouse
  - **断言示例**: 无
- **依赖**: refactor-5-composition

### 任务 7: UI 重制 - 创建房间页

- **ID**: refactor-7-ui-create-room
- **描述**: 使用 design-system/MASTER.md 与 ui-ux-pro-max 规范，重制“创建房间”页的 UI（表单、按钮、卡片、错误态、加载态）；保持现有字段与提交逻辑，仅替换样式与结构为设计系统组件与规范；满足无障碍、触摸目标、焦点、对比度等清单。
- **测试命令**: `skill:watch-together-webapp-testing refactor-7-ui-create-room` 或 `npm test -- create-room`（若已配置）
- **成功标准**:
  1. [ ] 创建房间流程功能与原有一致
  2. [ ] 视觉与交互符合设计系统与 ui-ux-pro-max Pre-Delivery 清单
  3. [ ] 相关 E2E 或用例测试通过
- **测试用例**:
  - **测试数据**: 无
  - **测试场景**: 打开创建房间页，完成一次创建并进入房间
  - **断言示例**: 无
- **依赖**: refactor-4-theme-layout, refactor-5-composition

### 任务 8: UI 重制 - 房间页（观看与协作）

- **ID**: refactor-8-ui-room
- **描述**: 使用设计系统与 ui-ux-pro-max 规范，重制房间内页：共享浏览区、侧边栏、成员列表、聊天、操作同步等区块的 UI；保持现有 WebSocket/信令与业务逻辑，仅更新布局、组件与样式；满足设计系统中 Layout、Touch & Interaction、Animation 等规则。
- **测试命令**: `skill:watch-together-webapp-testing refactor-8-ui-room` 或项目内房间相关测试
- **成功标准**:
  1. [ ] 房间内观看、聊天、操作同步等功能与原有一致
  2. [ ] 布局与组件符合设计系统；无横向滚动、焦点与触摸目标合格
  3. [ ] 相关 E2E 或用例测试通过
- **测试用例**:
  - **测试数据**: 无
  - **测试场景**: 多人进入同一房间，验证共享与聊天
  - **断言示例**: 无
- **依赖**: refactor-4-theme-layout, refactor-5-composition

### 任务 9: 无障碍与交互终验

- **ID**: refactor-9-a11y-ux
- **描述**: 按 ui-ux-pro-max 的 Accessibility、Touch & Interaction、Animation 等规则做终验：键盘导航、焦点环、alt/aria、表单 label、触摸目标尺寸、加载与错误反馈、动效时长与 prefers-reduced-motion；修复不符合项并记录在交付清单中。
- **测试命令**: `手动：键盘与屏幕阅读器走查 + 可选 axe 或 Lighthouse a11y`
- **成功标准**:
  1. [ ] 关键流程可仅用键盘完成
  2. [ ] 焦点可见、表单有 label、图标按钮有 aria-label
  3. [ ] 触摸目标 ≥44px；动效尊重 prefers-reduced-motion
- **测试用例**:
  - **测试数据**: 无
  - **测试场景**: 键盘 Tab 走查、移动端点击热区检查
  - **断言示例**: 无
- **依赖**: refactor-7-ui-create-room, refactor-8-ui-room

### 任务 10: 测试收敛与文档收尾

- **ID**: refactor-10-test-docs
- **描述**: 确保所有与 watch-together 前端相关的测试（单元、集成、E2E）在重构后通过；更新 README 或开发文档中的架构说明、设计系统引用、组件式/插件式使用方式；标注与 ui-ux-pro-max、vercel-react-best-practices 的对应关系便于后续维护。
- **测试命令**: `npm test` 或 `./.cursor/ralph-scripts/...` 中约定的测试命令
- **成功标准**:
  1. [ ] 项目约定测试全部通过
  2. [ ] README 或 docs 已更新（架构、设计系统、运行与构建）
  3. [ ] 技能引用（ui-ux-pro-max、vercel-react-best-practices）已在文档中说明
- **测试用例**:
  - **测试数据**: 无
  - **测试场景**: 全量测试 + 文档审阅
  - **断言示例**: 无
- **依赖**: refactor-6-bundle-perf, refactor-9-a11y-ux

---

## Visual Specs (JSON Canvas)

> 可选：步骤 2a 生成需求可视化（用例图/页面流），保存至 `designs/canvas/refactor-watch-together-*.canvas`，并在此处引用。

## UI / UX Design System

> 由任务 2 产出：`design-system/MASTER.md`（及可选 `design-system/pages/*.md`）。  
> 实现时以 MASTER 为基准，页面级覆盖以 `design-system/pages/<page>.md` 为准。
