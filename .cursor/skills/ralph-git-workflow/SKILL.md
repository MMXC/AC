---
name: ralph-git-workflow
description: Git 分支与 PR 工作流约定，用于 Ralph + backlog 队列场景。负责在每个 backlog 任务上创建/管理独立分支、提交规范、以及完成任务后的 PR 流程。用户提到“分支合并”“PR”“ralph 结果提 PR”时使用。
---

# Ralph Git Workflow（Backlog 队列版）

## 场景

- 使用 `backlog-queue.sh` 抢占任务（TASK-xx），并通过 `ralph-run-task-worktree.sh` 在独立 worktree 中运行 Ralph。
- 希望每个 backlog 任务对应一个 Git 分支，完成后自动或半自动推送并创建 PR。

## 分支命名规范

- 统一使用：
  - `task/TASK-<id>`，例如：`task/TASK-56`
- 分支来源：
  - 默认从 `main`（或仓库默认主分支）创建：
    - `git checkout main`
    - `git pull`（如需要）
    - `git checkout -b task/TASK-56`

## 与 worktree 结合的推荐做法

在 `ralph-run-task-worktree.sh` 的 worktree 内：

1. **创建/切换任务分支**
   - 如果本地不存在该分支：
     - `git checkout -b task/TASK-<id> origin/main || git checkout -b task/TASK-<id> main`
   - 如果已存在：
     - `git checkout task/TASK-<id>`

2. **Ralph 在该分支上工作**
   - 所有 Ralph 的修改与提交只发生在 `task/TASK-<id>` 分支。

3. **完成任务后：推送并创建 PR（可选）**
   - `git push -u origin task/TASK-<id>`
   - 使用 `gh` CLI 创建 PR：

     ```bash
     gh pr create \
       --head "task/TASK-<id>" \
       --base "main" \
       --title "TASK-<id>: <简短标题>" \
       --body "来自 backlog 的任务：TASK-<id>\n\n请参考 RALPH_TASK.md / backlog 说明。"
     ```

> 注意：在自动化脚本里，只在用户明确要求时才执行 push / gh pr create。

## 提交（commit）规范

- 提交频率：
  - 每完成一个 backlog Acceptance Criteria（勾选前），建议至少一次 commit。
  - 大型修改前后可以加“checkpoint”式 commit。

- 提交信息前缀：
  - 统一前缀：`ralph: TASK-<id> ...`，示例：
    - `ralph: TASK-56 实现 index.html 动画效果`
    - `ralph: TASK-56 补充表单交互测试`

- 提交消息内容建议包含：
  - 简要说明做了什么；
  - 若对应某个 AC，可以在正文提及 `AC #1` / `AC #2` 等。

示例命令：

```bash
git add -A
git commit -m "ralph: TASK-56 实现创建房间动画与交互"
```

## 完成条件与分支收尾

- 当 `RALPH_TASK.md` 中所有 Success Criteria 变为 `[x]` 且测试通过时，可以视为任务完成：
  - 确认分支干净：`git status`
  - 推送分支：`git push -u origin task/TASK-<id>`
  - （可选）创建 PR（见上文）。

- 若 PR 合并后：
  - 可在本地删除分支：

    ```bash
    git checkout main
    git pull
    git branch -d task/TASK-<id>
    ```

## 在对话中如何使用本 Skill

当用户提出类似需求时：

- “抢占任务后拉分支合并，是不是比 worktree 快？”
- “完成任务后帮我提个 PR”
- “按 backlog 任务自动建分支”

你应当：

1. 按上述分支规范为当前任务生成分支名 `task/TASK-<id>`。
2. 指导或修改脚本，使 Ralph 在该分支上工作，并在完成后：
   - 生成合适的 commit；
   - （若用户允许）push 并调用 `gh pr create`。
3. 在回答中清晰说明分支名、PR 的 base/head 以及关联的 backlog 任务 ID。+
