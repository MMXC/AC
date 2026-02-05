---
name: ralph-take-task
description: 从 backlog 拿取任务并确保任务上下文就绪。Ralph 流程第一步。当需要「拿任务」「取 TASK-xx」「开始做 backlog 任务」时使用；与 backlogmd 配合。
---

# Ralph 拿任务（Take Task）

本技能是 **Ralph 任务流程的第一步**：从 backlog 取指定任务，确保 Description、Acceptance Criteria、Test Command 就绪，并产出或更新 RALPH_TASK.md 所需输入。

## 触发场景

- "拿任务"、"取 TASK-129"、"开始做 backlog 任务"
- 流程编排指示「步骤 1：拿任务」时
- 需要从 backlog 读取任务详情供后续步骤使用

## 输入

- **task_id**：backlog 任务 ID（数字，如 129）

## 必做动作

1. **读取任务**：使用 **backlogmd** 技能执行  
   `backlog task <task_id> --plain`  
   获取完整任务内容（Description、AC、Test Command、状态等）。

2. **校验必备内容**：
   - **Description**：有且清晰（做什么、范围、约束）；缺则用 `backlog task edit <id> -d "..."` 补全。
   - **Acceptance Criteria**：可逐条验收；缺则用 `backlog task edit <id> --ac "..."` 补全。
   - **Test Command**：能自动验证“做完”的命令；若任务要求可执行验收则应有，缺则提醒在任务中补上。

3. **输出任务上下文**：
   - 将任务摘要（标题、Description、AC 列表、Test Command）以可被下一步消费的形式给出。
   - 若在 ralph-run-task-branch 等脚本流程中，则脚本会生成 `RALPH_TASK.md`；本技能确保 **backlog 源数据** 已就绪并可被解析。

## 与脚本的关系

- `ralph-run-task-branch.sh <task_id>` 会先切分支，再执行 `backlog task <id> --plain | parser --emit-ralph-task > RALPH_TASK.md`。
- 本技能在「人工或 Agent 按步执行」时使用：先调用本技能拿任务并校验，再进入 **ralph-open-branch** → **spec-refine-and-plan** 等后续步骤。

## 相关技能

- **backlogmd**：`backlog task` 的查看、编辑、列表。
- **ralph-open-branch**：下一步，创建/切换任务分支。

## 完成标准

- 已执行 `backlog task <id> --plain` 并确认任务存在。
- Description / AC / Test Command（若需要）已校验或已补全。
- 任务上下文已提供给下一步（或 RALPH_TASK.md 即将由脚本生成）。
