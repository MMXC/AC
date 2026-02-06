---
name: requirement-to-backlog-flow
description: 从粗略需求到 backlog 任务创建与执行的完整前置流程编排。按步骤调用独立技能：需求澄清→生成 newneed.md→创建 backlog 任务→串行执行。用户提到「需求流程」「从需求到任务」「前置流程」时使用。
---

# 需求到 Backlog 流程（Requirement to Backlog Flow）

本技能定义**从粗略需求到 backlog 任务创建与执行的完整前置流程**：以用户提供的粗略需求为起点，**每一步对应一个独立技能**，按步骤调用技能完成需求澄清、任务分解、backlog 创建与执行。

## 流程编排：前置步骤 → 技能

从粗略需求到 backlog 任务执行，**按顺序完成以下前置步骤；每一步都通过调用对应技能完成**：

| 步骤 | 名称           | 技能名称                         | 说明 |
|------|----------------|----------------------------------|------|
| 1    | 需求澄清       | **requirement-clarify**          | 通过对话澄清粗略需求，明确技术栈、范围、约束、场景。**输出需求类型**（`type: feature | page | infra | chore`）。 |
| 2    | 生成 newneed.md| **requirement-to-newneed**        | 将澄清后的需求按格式写入 newneed.md（含需求概要与任务结构）。 |
| 2a   | 需求可视化建模（可选但推荐） | **json-canvas** | **当 `type ∈ {feature, page}` 时**：使用 json-canvas 技能生成用例图/用户流程图 Canvas，保存到 `designs/canvas/<need-id>-*.canvas`，并在 newneed.md 中引用。用于确认业务和交互路径正确。 |
| 2b   | UI/UX 设计系统（强烈推荐） | **ui-ux-pro-max** | **当 `type ∈ {feature, page}` 时**：使用 ui-ux-pro-max 技能生成完整设计系统文档（Pattern、Style、Colors、Typography、Effects、Anti-patterns、Pre-delivery checklist），保存到 `designs/ui/<need-id>-design-system.md`，并在 newneed.md 中引用。后续实现验收以此为基线。 |
| 3    | 创建 backlog 任务 | **backlog-create-from-decomposed** | 从 newneed.md 解析任务列表，使用 backlog CLI 批量创建 To Do 任务。 |
| 4    | 串行执行任务   | **backlog-serial-execute**       | 串行处理 backlog To Do 任务，依次完成每个任务（调用 ralph-run-task-branch.sh）。 |

**可选步骤**：
- **requirement-decompose**：若需求未分解，可在步骤 2 内部调用，正交分解为原子子任务。
- **步骤 2a 和 2b**：当需求为功能/页面类时强烈推荐，用于在创建 backlog 任务前明确设计规范。

**强制顺序**：1 → 2 → (2a → 2b，可选但推荐) → 3 → 4。步骤 2 内部可调用 requirement-decompose（若需要）。步骤 2a 和 2b 在步骤 2 完成后、步骤 3 之前执行。

## 与执行流程的衔接

- 步骤 4（**backlog-serial-execute**）会调用 `ralph-run-task-branch.sh`，进入 **openspec-backlog-flow** 的执行流程：
  - 步骤 1–2：拿任务、开分支（由脚本完成）
  - 步骤 3–7：细化约定、按步执行、跑测试、可选审查、完成/PR（由 Agent 按技能执行）

## 如何使用（按步调用技能）

- **在对话/Agent 中**：当用户提供粗略需求时，显式调用前置流程技能（如「现在执行前置步骤 1：请按 **requirement-clarify** 技能澄清需求」）。
- **在脚本中**：`requirement-workflow.sh` 已实现步骤 2–3 的部分逻辑（分解、创建任务），但可按技能拆分以支持更灵活的编排。
- **完整自动化**：`requirement-workflow.sh --decomposed newneed.md` + `backlog-serial.sh` 相当于步骤 2–4 的脚本实现。

## 前置步骤技能一览

- **requirement-clarify**：需求澄清，与 requirement-clarifier 配合。  
- **requirement-to-newneed**：生成 newneed.md，与 requirement-decomposer 配合。  
- **json-canvas**：需求可视化建模（步骤 2a），生成用例图/用户流程图 Canvas。  
- **ui-ux-pro-max**：UI/UX 设计系统生成（步骤 2b），生成完整设计系统文档。  
- **requirement-decompose**：可选，正交分解任务。  
- **backlog-create-from-decomposed**：创建 backlog 任务，与 backlogmd 配合。  
- **backlog-serial-execute**：串行执行任务，调用 backlog-serial.sh。

## 相关技能（非前置步骤）

- **requirement-clarifier**：更完整的需求澄清与任务生成流程。  
- **requirement-decomposer**：更完整的分解流程（含验证正交性）。  
- **backlogmd**：`backlog task` 的创建、查看、编辑、列表。  
- **openspec-backlog-flow**：执行流程编排（步骤 1–7）。

## 延伸

本流程的「需求澄清→任务分解→批量创建→串行执行」思路借鉴自 [Superpowers](https://github.com/obra/superpowers) 的「brainstorming → writing-plans → executing-plans」流程，并结合本项目的 backlog + Ralph 工作流。**前置流程完成后，进入 openspec-backlog-flow 的执行流程**。
