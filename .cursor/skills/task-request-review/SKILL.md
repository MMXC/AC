---
name: task-request-review
description: 对照任务计划与 AC 对实现做审查，按严重程度列出问题。Ralph 流程可选步骤，对应 Superpowers 的 requesting-code-review。当需要「对照计划审查」「实现审查」「Done 前 review」时使用。
---

# 对照计划审查（Task Request Review）

本技能是 **Ralph 任务流程的可选步骤**：在实现完成、跑 Test Command 通过后（或前后），对照任务的 **Description、Acceptance Criteria、Implementation Steps** 对当前实现做一次审查，按严重程度列出问题，严重问题需修复后再标 Done 或提 PR。对应 Superpowers 的 **requesting-code-review**。

## 触发场景

- "对照计划审查"、"实现审查"、"Done 前 review"
- 流程编排指示「可选步骤：对照计划审查」时
- 测试已通过，希望在标 Done / 提 PR 前再做一次与约定的符合性检查

## 输入

- **RALPH_TASK.md**：含 Description、AC、Implementation Steps。
- **当前实现**：本分支上的代码与提交。

## 必做动作

1. **建立审查清单**：
   - 从 RALPH_TASK.md 提取：Description（做什么、范围、约束）、每条 AC、Implementation Steps 及每步验收。
   - 形成「是否满足」的检查项列表。

2. **逐项检查**：
   - 对每条 AC：实现是否满足、是否有遗漏或过度实现。
   - 对 Implementation Steps：每步是否已按约定完成、是否有未覆盖的步骤或验收。
   - 对 Description：范围与约束是否被遵守。

3. **按严重程度分类**：
   - **Critical**：必须修复才能标 Done/提 PR（如 AC 未满足、与约定明显冲突）。
   - **Major**：建议修复（如漏测、边界未覆盖）。
   - **Minor**：可选优化（如风格、注释）。

4. **输出**：
   - 列出问题清单（严重程度 + 条目 + 建议）。
   - 若存在 Critical：明确说明「需修复后再标 Done / 提 PR」。
   - 若无 Critical：可说明「审查通过，可进入 ralph-finish-branch」。

## 与流程的关系

- 本步骤为**可选**：流程编排可配置为「Test 通过后执行 task-request-review，再 ralph-finish-branch」。
- 若不执行本技能，也可在 **ralph-finish-branch** 前由人工或 Agent 做一次简要自检。

## 相关技能

- **ralph-finish-branch**：下一步，标 Done、推送、PR。
- **spec-refine-and-plan**：计划来源；审查时对照的 Steps 与 AC。
- **task-run-test-command**：通常在本步骤前已跑过测试。

## 完成标准

- 已对照 Description / AC / Implementation Steps 完成审查。
- 已输出问题清单（含严重程度）及是否阻塞 Done/PR 的结论。
