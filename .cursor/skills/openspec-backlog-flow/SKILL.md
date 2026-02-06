---
name: openspec-backlog-flow
description: 本项目的标准任务流程：按步骤调用独立技能完成 backlog 任务（拿任务→开分支→细化约定与写计划→按步执行→可选整体简化→跑测试→可选计划审查→可选代码质量审查→完成/PR）。用户提到「任务流程」「按 backlog 做任务」「按步骤调用技能」时使用。
license: MIT
---

# Backlog + Ralph 任务流程（按步调用技能）

本技能定义**本项目的标准任务流程**：以 backlog 为任务源，**每一步对应一个独立技能**，Ralph 流程按步骤调用技能完成相关任务；**必须跑通任务的 Test Command 后才标 Done 并走 PR**。思路吸收自 [Superpowers](https://github.com/obra/superpowers)：每步形成独立技能，流程按步骤调用技能执行。

**与脚本的关系**：使用 `ralph-run-task-branch.sh <task_id>` 时，**ralph-common.sh 的 build_prompt** 会引用本流程与各步骤技能，AI 每次迭代按当前步骤调用对应技能；本技能作为流程编排与人工参考。

## 流程编排：步骤 → 技能

执行单任务时，**按顺序完成以下步骤；每一步都通过调用对应技能完成**：

| 步骤 | 名称           | 技能名称                 | 说明 |
|------|----------------|--------------------------|------|
| 1    | 拿任务         | **ralph-take-task**      | 从 backlog 取任务，校验 Description/AC/Test Command，确保任务上下文就绪。 |
| 2    | 开分支         | **ralph-open-branch**    | 创建或切换分支 `task/TASK-<id>`，后续改动均在该分支。 |
| 3    | 细化约定与写计划 | **spec-refine-and-plan** | 补全 Description/AC，写出 Implementation Steps 及**每步验收**，写入 RALPH_TASK.md。 |
| 4    | 按步执行       | **plan-execute-step**    | 按实现步骤逐步执行并验证该步验收，通过后提交再进入下一步。**每步完成后可选用 code-simplifier 精简本步改动再提交**。 |
| 4.5  | 整体简化（可选） | **code-simplifier**      | 全部实现步骤完成后、跑测试前，对本次任务改动做一次简化与规范（清晰度、一致性、可维护性），保持功能不变。 |
| 5    | 跑测试         | **task-run-test-command**| 执行任务中的 Test Command，结果写入 .ralph/test-results.log；未通过则对应回某步迭代。 |
| 6    | 对照计划审查   | **task-request-review**（可选） | 对照 Description/AC/Implementation Steps 做实现审查，按严重程度列问题；Critical 需修复后再 Done。 |
| 7    | 代码质量审查   | **code-reviewer**（可选） | PR/代码质量分析：复杂度与风险、SOLID/代码异味、硬编码密钥/注入模式等；可生成审查报告。与步骤 6 互补（6 偏计划符合性，7 偏代码质量与安全）。 |
| 8    | 完成与 PR      | **ralph-finish-branch**  | 勾选 AC、标 Done、按需推送并创建 PR。 |

**强制顺序**：1 → 2 → 3 → 4 → 4…（循环直到所有步骤完成）→ (4.5 可选) → 5 → 6（可选）→ 7（可选）→ 8。步骤 5 未通过不进入步骤 8。

## 如何使用（按步调用技能）

- **在对话/Agent 中**：当处于某一步时，显式调用该步技能（如「现在执行步骤 3：请按 **spec-refine-and-plan** 技能细化约定与写计划」）。
- **在 build_prompt 中**：已写明「当前处于任务分支模式，请按 Task Workflow 步骤执行；每步对应技能见 openspec-backlog-flow」。
- **脚本自动化**：`ralph-run-task-branch.sh` 已完成步骤 1–2（拿任务由 backlog 解析、开分支由脚本执行），并生成 RALPH_TASK.md；从步骤 3 起由 Agent 按技能执行。

## 任务必备内容

- **Description**：做什么、范围、关键约束。  
- **Acceptance Criteria**：可逐条验收的条目（建议 Given/When/Then 便于写测试）。  
- **Test Command**：能自动验证“做完”的命令或技能调用；没有则要先在任务里补上再跑。

## 步骤技能一览

- **ralph-take-task**：拿任务，与 backlogmd 配合。  
- **ralph-open-branch**：开分支，与 ralph-git-workflow 一致。  
- **spec-refine-and-plan**：细化约定与写计划（含每步验收）。  
- **plan-execute-step**：按步执行并验证每步验收；每步完成后可选用 code-simplifier。  
- **code-simplifier**：可选，整体简化——全部步骤完成后、跑测试前，对任务改动做简化与规范。  
- **task-run-test-command**：跑 Test Command。  
- **task-request-review**：可选，对照计划与 AC 审查。  
- **code-reviewer**：可选，代码质量与 PR 分析（复杂度、风险、SOLID、code smells）。  
- **ralph-finish-branch**：完成与 PR。

## 相关技能（非步骤）

- **backlogmd**：`backlog task` 的创建、查看、编辑、列表。  
- **ralph-git-workflow**：分支命名 `task/TASK-<id>`、提交规范、PR。  
- **watch-together-webapp-testing**：前端/浏览器测试作为 Test Command 的一种。

## 延伸（可选）

本流程的「先约定再实现、Test Command 收敛、每步独立技能」思路借鉴自 [OpenSpec](https://github.com/Fission-AI/OpenSpec) 与 [Superpowers](https://github.com/obra/superpowers)。**本项目中任务来源与验收仍以 backlog + Test Command 为准**；流程按步骤调用上述技能执行。
