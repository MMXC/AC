---
name: requirement-design-steps
description: 需求设计步骤：当需求为功能/页面类时，生成需求可视化建模（Canvas）和 UI/UX 设计系统文档。前置流程步骤 2a 和 2b。当需要「需求可视化」「生成设计系统」「UI/UX 设计」时使用。
---

# 需求设计步骤（Requirement Design Steps）

本技能定义**前置流程的步骤 2a 和 2b**：当需求类型为功能或页面类（`type ∈ {feature, page}`）时，在生成 `newneed.md` 之后、创建 backlog 任务之前，执行需求可视化建模和 UI/UX 设计系统生成，确保产出符合用户需求并具备明确的设计规范。

## 触发条件

- **步骤 2a（需求可视化建模）**：当 `type ∈ {feature, page}` 时执行
- **步骤 2b（UI/UX 设计系统）**：当 `type ∈ {feature, page}` 时执行
- 两个步骤在 `requirement-to-newneed` 完成后、`backlog-create-from-decomposed` 之前执行

## 步骤 2a：需求可视化建模（JSON Canvas）

### 目标

使用 **json-canvas** 技能生成需求的可视化模型，明确：
- **用例视图**：主要参与者、核心用例、系统边界
- **用户流程/页面流**（页面类需求）：入口 → 关键交互 → 结果页面

### 执行方法

1. **确定需求标识**：
   - 从 `newneed.md` 提取需求标识（如需求标题的简化版本，或使用时间戳）
   - 生成唯一标识：`<need-id>`（如 `spa-booking-system`、`user-dashboard-20260205`）

2. **生成用例图 Canvas**（功能/页面类需求通用）：
   - 使用 **json-canvas** 技能创建用例图
   - 包含：参与者（用户、系统）、用例（核心功能）、系统边界
   - 保存到：`designs/canvas/<need-id>-usecases.canvas`

3. **生成用户流程图 Canvas**（页面类需求推荐）：
   - 使用 **json-canvas** 技能创建用户流程/页面流图
   - 包含：入口页面 → 关键交互步骤 → 结果页面/状态
   - 保存到：`designs/canvas/<need-id>-userflow.canvas`

4. **更新 newneed.md**：
   - 在 `newneed.md` 的 "Visual Specs (JSON Canvas)" 章节中，替换占位内容为实际引用：
   
   ```markdown
   ## Visual Specs (JSON Canvas)
   
   - [[designs/canvas/<need-id>-usecases.canvas]] - 用例视图
   - [[designs/canvas/<need-id>-userflow.canvas]] - 用户流程/页面流（如适用）
   ```

### 完成标准

- Canvas 文件已生成并保存到 `designs/canvas/` 目录
- `newneed.md` 中的 "Visual Specs" 章节已更新为实际文件引用
- 用例图清晰展示了参与者、用例和系统边界
- 用户流程图（如适用）清晰展示了关键交互路径

## 步骤 2b：UI/UX 设计系统生成（ui-ux-pro-max）

### 目标

使用 **ui-ux-pro-max** 技能生成完整的 UI/UX 设计系统文档，包含：
- **Pattern**：页面结构/布局模式
- **Style**：UI 风格（从 67 种风格中选择）
- **Colors**：配色方案（从 96 种行业特定配色中选择）
- **Typography**：字体配对（从 57 种字体组合中选择）
- **Effects**：交互效果和动画
- **Anti-patterns**：避免事项（如"AI purple/pink gradients"）
- **Pre-delivery checklist**：交付前检查清单

### 执行方法

1. **准备需求描述**：
   - 从 `newneed.md` 提取需求概要和技术栈信息
   - 组合为设计系统生成查询：`"{需求描述} {技术栈}"`（如 `"beauty spa wellness landing page React Next.js"`）

2. **生成设计系统文档**：
   - 使用 **ui-ux-pro-max** 技能的设计系统生成器：
   
   ```bash
   # 方法 1：使用 Python 脚本（推荐）
   python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "{需求描述}" --design-system --persist -p "{项目名}" -f markdown
   
   # 方法 2：在对话中直接调用 ui-ux-pro-max 技能
   # "请为以下需求生成完整的设计系统文档：[需求描述]"
   ```
   
   - 输出格式：Markdown 文档
   - 保存到：`designs/ui/<need-id>-design-system.md`

3. **设计系统文档应包含**：
   - **TARGET**：项目/需求名称
   - **PATTERN**：推荐的页面结构（如 Hero-Centric、Conversion-Optimized）
   - **STYLE**：推荐的 UI 风格（如 Soft UI Evolution、Minimalism）
   - **COLORS**：配色方案（Primary、Secondary、CTA、Background、Text）
   - **TYPOGRAPHY**：字体配对（Heading + Body，含 Google Fonts 链接）
   - **KEY EFFECTS**：关键交互效果（动画、过渡、悬停状态）
   - **AVOID (Anti-patterns)**：避免的设计模式
   - **PRE-DELIVERY CHECKLIST**：交付前检查清单（无障碍、响应式、性能等）

4. **更新 newneed.md**：
   - 在 `newneed.md` 的 "UI / UX Design System" 章节中，替换占位内容为实际引用：
   
   ```markdown
   ## UI / UX Design System
   
   - [[designs/ui/<need-id>-design-system.md]]
   
   > 由 ui-ux-pro-max 技能生成，包含完整的设计系统规范（Pattern、Style、Colors、Typography、Effects、Anti-patterns、Pre-delivery checklist）
   ```

### 完成标准

- 设计系统文档已生成并保存到 `designs/ui/` 目录
- `newneed.md` 中的 "UI / UX Design System" 章节已更新为实际文件引用
- 设计系统文档包含 Pattern、Style、Colors、Typography、Effects、Anti-patterns、Pre-delivery checklist 等完整内容
- 设计系统与需求类型和技术栈匹配

## 与后续步骤的衔接

### 与 `spec-refine-and-plan` 的衔接

- 在细化任务约定时，引用设计系统文档作为约束：
  - 颜色、字体、间距必须符合设计系统
  - 布局和组件结构必须符合 Pattern
  - 交互效果必须符合 Key Effects

### 与 `plan-execute-step` 的衔接

- 在执行实现步骤时，验收每一步是否符合设计系统：
  - 布局是否符合 Pattern
  - 颜色和字体是否符合设计系统
  - 交互是否符合 Key Effects

### 与 `task-run-test-command` 的衔接

- 在测试时，验证是否符合 Pre-delivery checklist：
  - 无障碍性（颜色对比度、焦点状态、键盘导航）
  - 响应式设计（375px、768px、1024px、1440px）
  - 性能（图片优化、动画性能）
  - 交互（悬停状态、加载状态、错误反馈）

## 相关技能

- **requirement-to-newneed**：上一步，生成 newneed.md（含需求类型）。
- **json-canvas**：步骤 2a 使用的技能，生成 Canvas 可视化模型。
- **ui-ux-pro-max**：步骤 2b 使用的技能，生成设计系统文档。
- **backlog-create-from-decomposed**：下一步，从 newneed.md 创建 backlog 任务。
- **spec-refine-and-plan**：后续执行流程中引用设计系统文档。

## 目录结构

执行完成后，项目目录结构应包含：

```
project-root/
├── newneed.md                    # 包含设计文档引用
├── designs/
│   ├── canvas/
│   │   ├── <need-id>-usecases.canvas
│   │   └── <need-id>-userflow.canvas
│   └── ui/
│       └── <need-id>-design-system.md
└── ...
```

## 注意事项

1. **需求类型判断**：只有 `type ∈ {feature, page}` 时才执行步骤 2a 和 2b。`infra` 和 `chore` 类型通常不需要设计步骤。

2. **设计系统生成**：`ui-ux-pro-max` 的设计系统生成器会根据需求描述自动匹配行业规则（100 种行业特定规则），选择最适合的 Pattern、Style、Colors、Typography。

3. **文件命名**：使用一致的 `<need-id>` 命名规范，便于后续引用和维护。

4. **设计文档版本控制**：设计文档应纳入版本控制，与代码一起管理。

5. **设计系统更新**：如果需求变更，应同步更新设计系统文档，并在 `newneed.md` 中记录变更历史。
