---
name: backlog-serial-execute
description: 串行执行 backlog To Do 任务列表，依次完成每个任务。前置流程第四步。当需要「串行执行任务」「依次完成 backlog 任务」时使用；调用 backlog-serial.sh。
---

# 串行执行 Backlog 任务（Backlog Serial Execute）

本技能是 **前置流程的第四步**：串行处理 backlog To Do 任务，逐个抢占、执行、完成，直到没有 To Do 任务为止。遵循 ralph-git-workflow 规范：backlog 状态变更在 main 上执行，每个任务在独立分支 `task/TASK-<id>` 上工作。

## 触发场景

- "串行执行任务"、"依次完成 backlog 任务"、"执行 backlog 队列"
- 流程编排指示「前置步骤 4：串行执行任务」时
- backlog 中已有 To Do 任务列表，需要依次完成

## 输入

- **workspace**：Git 仓库根目录（默认当前目录）
- **可选参数**：
  - `--watch`：队列空了也不退出（持续等待新任务）
  - `--auto-pr`：完成后自动创建 PR
  - `--auto-merge`：完成后自动合并到主分支并 push

## 必做动作

1. **检查环境**：
   - 确认 backlog CLI 可用
   - 确认 Git 仓库在 workspace
   - 确认主分支（main 或 master）存在

2. **进入主循环**：
   - 在 main 分支上，轮询 backlog To Do 任务列表
   - 若队列为空且未设置 `--watch`，退出；若设置了 `--watch`，持续等待新任务

3. **对每个任务执行**：
   - **抢占任务**：在 main 上执行 `backlog task edit <id> -s "In Progress" -a @myself`，提交到 main
   - **创建/切换分支**：创建或切换到 `task/TASK-<id>` 分支
   - **生成 RALPH_TASK.md**：从 backlog 任务生成 RALPH_TASK.md
   - **运行 Ralph**：调用 `ralph-run-task-branch.sh <id>` 执行任务（若任务有 test_command，使用 `ralph-loop-until-tests-pass.sh`；否则使用 `ralph-loop.sh`）
   - **成功处理**：
     - 推送任务分支
     - 若 `--auto-merge`：合并 main→任务分支→main，在 main 上标记 Done 并提交
     - 若 `--auto-pr`：创建 PR
   - **失败处理**：在 main 上标记 To Do 并提交，继续下一个任务

4. **继续下一个任务**：重复步骤 3，直到队列为空（或 `--watch` 模式下持续等待）

## 与脚本的关系

- `backlog-serial.sh` 实现了本技能的全部逻辑：轮询、抢占、执行、完成、合并。
- 本技能供「按步调用技能」的前置流程使用：在 **backlog-create-from-decomposed** 之后调用，串行执行所有创建的 To Do 任务。

## 相关技能

- **ralph-take-task**：步骤 1，拿任务（在 ralph-run-task-branch.sh 内部完成）。
- **ralph-open-branch**：步骤 2，开分支（在 ralph-run-task-branch.sh 内部完成）。
- **backlog-create-from-decomposed**：上一步，创建 backlog 任务。

## 完成标准

- 已串行处理所有 To Do 任务（或持续等待新任务）。
- 每个任务都在独立分支上完成，状态已更新（Done 或失败回退 To Do）。
