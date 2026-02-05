---
name: ralph-open-branch
description: 为 backlog 任务创建或切换 Git 分支 task/TASK-<id>。Ralph 流程第二步。当需要「开分支」「建任务分支」「切换 task/TASK-xx」时使用；与 ralph-git-workflow 一致。
---

# Ralph 开分支（Open Branch）

本技能是 **Ralph 任务流程的第二步**：为当前 backlog 任务创建或切换到独立分支 `task/TASK-<id>`，后续所有实现与提交均在该分支上。

## 触发场景

- "开分支"、"建任务分支"、"切换 task/TASK-129"
- 流程编排指示「步骤 2：开分支」时
- 拿任务后、细化约定前，需要隔离工作环境

## 输入

- **task_id**：backlog 任务 ID（数字）
- **workspace**：Git 仓库根目录（默认当前目录）

## 必做动作

1. **分支命名**：统一使用 `task/TASK-<id>`，例如 `task/TASK-129`。

2. **创建或切换分支**：
   - 若分支已存在：`git checkout task/TASK-<id>`
   - 若不存在：从 `main`（或 `master`）创建：  
     `git checkout main && git pull`（如需）  
     `git checkout -b task/TASK-<id>`

3. **工作区干净**：若有未提交更改，先提交或 stash，再切换，避免冲突。

4. **不执行 push**：本步骤仅本地分支操作；push 在 **ralph-finish-branch** 中按需执行。

## 与脚本的关系

- `ralph-run-task-branch.sh <task_id>` 已包含「创建/切换分支 + 生成 RALPH_TASK.md」；在脚本流程中本步骤由脚本完成。
- 本技能供「按步调用技能」的流程使用：在 **ralph-take-task** 之后、**spec-refine-and-plan** 之前调用。

## 相关技能

- **ralph-git-workflow**：分支命名规范、提交规范、PR 流程。
- **ralph-take-task**：上一步。
- **spec-refine-and-plan**：下一步，细化约定与写计划。

## 完成标准

- 当前分支为 `task/TASK-<id>`。
- 工作区可在此分支上正常提交。
