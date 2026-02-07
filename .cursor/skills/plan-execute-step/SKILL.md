---
name: plan-execute-step
description: 按实现计划执行当前步骤并验证该步验收。Ralph 流程第四步，对应 Superpowers 的 executing-plans。当需要「执行第 N 步」「按步实现」「做当前步骤」时使用。
---

# 按步执行（Plan Execute Step）

本技能是 **Ralph 任务流程的第四步**：根据 **spec-refine-and-plan** 产出的「Implementation Steps + 每步验收」，执行**当前步骤**，完成该步动作并验证该步验收通过，再进入下一步或报告失败。

## 触发场景

- "执行第 N 步"、"按步实现"、"做当前步骤"
- 流程编排指示「步骤 4：按步执行」且指定当前步序号时
- 实现阶段，需要单步执行、单步验证以避免大范围返工

## 输入

- **当前步序号**：如 1.1、1.2、2.1（与 RALPH_TASK.md 中 Implementation Steps 一致）。
- **RALPH_TASK.md**：含 Implementation Steps 及每步验收。

## 必做动作

1. **读取当前步**：从 RALPH_TASK.md 的 Implementation Steps 中定位当前步，确认「做什么」与「该步验收」。

2. **执行该步**：
   - 只做当前步所描述的动作（改指定文件、加接口、写测试等）。
   - 遵循项目既有风格与约束；必要时先读相关文件再改。

3. **验证该步验收**：
   - 按该步的「完成条件」做一次验证（如调接口、跑某条测试、检查文件存在/内容）。
   - 若通过：在 progress 或 RALPH_TASK 中标记该步完成，并进入下一步（或输出「当前步完成，下一步为 X」）。
   - 若未通过：在本步内迭代修复，直到该步验收通过，不进入下一步。

4. **提交**：该步验收通过后，执行一次 commit：  
   `git add -A && git commit -m 'ralph: TASK-<id> <当前步简短描述>'`  
   **可选**：该步验收通过后、提交前，可调用 **code-simplifier** 对本步改动的代码做一次简化与规范，再提交。

5. **将本步结论总结追加到 .ralph/progress.md**（约定必做）：
   - **追加到 progress.md 文件末尾**（即 Session History 段落末尾），勿插入在段落开头或 Summary 下。
   - 追加一条**步骤结论**，格式示例：
     - `**Step X.Y completed** - <一句话：做了什么>`  
     - 下一行起：该步做了什么（文件/改动要点）、验收结果（通过/失败）、若失败则写阻塞原因；若有下一步则写「下一步：Step X.Y+1」。
   - 这样每步做完后的结论都留在 progress.md 末尾，便于轮换后接续与排查。

## 与 Test Command 的关系

- 单步验收可能是「跑某条测试」或「调某接口」，不等同于整个任务的 **Test Command**。
- 全部步骤做完后，由 **task-run-test-command** 跑整体 Test Command 做最终收敛。

## 相关技能

- **spec-refine-and-plan**：上一步，产出实现步骤与每步验收。
- **code-simplifier**：可选，每步验收通过后、提交前可调用，对本步改动做简化与规范；全部步骤完成后也可在步骤 4.5 做整体简化。
- **task-run-test-command**：全部步骤完成后跑整体测试。
- **ralph-git-workflow**：提交信息格式 `ralph: TASK-<id> ...`。

## 完成标准

- 当前步动作已做完。
- 该步验收已通过并有记录。
- 已提交。
- **已将该步结论总结追加到 .ralph/progress.md 末尾**（步骤 X.Y completed + 做了什么、验收结果、下一步或阻塞原因）。
- 若还有下一步则明确下一步序号。
