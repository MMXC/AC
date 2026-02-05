---
name: ralph-finish-branch
description: 任务完成后勾选 AC、标 Done、推送分支并可选创建 PR。Ralph 流程最后一步，对应 Superpowers 的 finishing-a-development-branch。当需要「完成」「标 Done」「提 PR」时使用。
---

# 完成与 PR（Ralph Finish Branch）

本技能是 **Ralph 任务流程的最后一步**：在 Test Command 通过（且可选地通过 **task-request-review**）后，勾选全部 AC、将任务标为 Done、推送分支，并按需创建 PR。对应 Superpowers 的 **finishing-a-development-branch**。

## 触发场景

- "完成"、"标 Done"、"提 PR"、"收尾任务分支"
- 流程编排指示「步骤 7：完成与 PR」时
- 测试已通过，准备收尾并合并或交付

## 前置条件

- **Test Command 已通过**（由 **task-run-test-command** 验证）。
- 可选：**task-request-review** 已执行且无 Critical 问题。
- 当前分支为 `task/TASK-<id>`，且实现与提交已就绪。

## 必做动作

1. **勾选 AC**：
   - 将任务中未勾选的 Acceptance Criteria 全部勾选：  
     `backlog task edit <id> --check-ac 1 --check-ac 2 ...`  
   - 若使用 RALPH_TASK.md 中的 Success Criteria，则确保 `[ ]` 已全部改为 `[x]`。

2. **标 Done**：
   - `backlog task edit <id> -s Done`

3. **提交收尾**（若有未提交更改）：
   - `git add -A && git commit -m 'ralph: TASK-<id> Done'`

4. **推送分支**（仅在用户或流程明确要求时执行）：
   - `git push -u origin task/TASK-<id>`

5. **创建 PR**（仅在用户或流程明确要求时执行）：
   - `gh pr create --head task/TASK-<id> --base main --title "TASK-<id>: <简短标题>" --body "来自 backlog 的任务：TASK-<id>\n\n请参考 RALPH_TASK.md / backlog 说明。"`

6. **不自动 push/PR**：在自动化脚本或 Agent 中，仅在用户明确要求或流程配置为「完成后提 PR」时才执行 push 与 `gh pr create`。

## 与脚本的关系

- `ralph-run-task-branch.sh ... --pr` 会在成功后可选地 push 并创建 PR。
- `backlog-finish-task.sh` 会清理 .ralph/claims、标记 Done 等。
- 本技能供「按步调用技能」的流程使用：在 **task-run-test-command** 通过（及可选的 **task-request-review**）后调用。

## 相关技能

- **ralph-git-workflow**：分支命名、提交规范、PR 命令格式。
- **task-run-test-command**：上一步，测试通过后才可进入本步。
- **task-request-review**：可选，审查通过后再进入本步。
- **backlogmd**：`backlog task edit` 勾选 AC、标 Done。

## 完成标准

- 所有 AC 已勾选，任务已标 Done。
- 本地已提交；若需交付则已按约定执行 push / PR。
