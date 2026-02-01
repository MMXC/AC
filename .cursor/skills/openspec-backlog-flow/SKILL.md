---
name: openspec-backlog-flow
description: 本项目的标准任务流程：backlog 拿任务 → 开分支 → 细化约定（先约定再实现）→ 实现 → 跑 Test Command 通过后再 Done/PR。用户提到「任务流程」「按 backlog 做任务」「先细化再实现」时使用。
license: MIT
---

# Backlog + Ralph 任务流程与测试收敛

本技能定义**本项目的标准任务流程**：以 backlog 为任务源，按 AC 实现，**必须跑通任务的 Test Command 后才标 Done 并走 PR**。无需额外学习 OpenSpec，按下面流程执行即可。

**与脚本的关系**：使用 `ralph-run-task-branch.sh <task_id>` 时，**流程已写入 ralph-common.sh 的 build_prompt**（细化约定、按步验收、测试收敛），AI 每次迭代都会看到；本技能作为人工参考或未用脚本时的流程说明。

## 标准流程（单任务）

1. **拿任务**  
   - `backlog task list -s "To Do" --plain` 看待办，或从队列/指派拿到 TASK-xx。  
   - `backlog task <id> --plain` 看详情：**Description**、**Acceptance Criteria**、**Test Command**（必须在任务里）。

2. **开分支**（见 ralph-git-workflow）  
   - `git checkout -b task/TASK-<id> main`（或从 main 拉取后建分支）。  
   - 后续所有改动与提交都在该分支。

3. **细化约定**（先约定再写代码）  
   - 在动手实现前，把「要做什么、验收条件、实现步骤」写清楚，避免边写边想、漏项。  
   - **必做**：确认任务里已有清晰的 **Description**（做什么、范围、约束）和 **Acceptance Criteria**（可逐条勾）；没有就补，如 `backlog task edit <id> -d "..." --ac "..."`。  
   - **建议**：在任务正文或 Implementation Notes 里列**实现步骤**（如 1.1 加路由、1.2 写 handler、2.1 写测试），**每一步都写验收标准**（如 1.1 的验收：「GET /api/v1/rooms 返回 200」；1.2 的验收：「POST 入参校验通过返回 400」）。这样：  
     - 实现时可按步做、按步验，某步不过就在该步循环完善，再进入下一步；  
     - 最后跑整体 **Test Command** 失败时，能快速定位到是哪一步没满足，在该步上迭代而不是盲目改。  
   - 若涉及接口/数据模型：可简短写「设计要点」（入参、出参、错误码、表字段等），再写代码。  
   - 细化完再进入下一步，避免实现时才发现范围不清或漏 AC。

4. **实现**  
   - 按**细化后的** Description + AC + 实现步骤（及每步验收标准）写代码。  
   - 建议**按步迭代**：做完一步就验一步（若有该步的验收命令或检查点），不通过就在该步内修到通过再进下一步；每完成一步或一条 AC：`backlog task edit <id> --check-ac <n>`，提交用 `ralph: TASK-<id> ...`。  
   - 整体 **Test Command** 失败时，根据失败信息对应回某一步，在该步上循环完善，再重跑测试。

5. **跑测试（收敛）**  
   - 执行该任务里的 **Test Command**（在 Description 或 RALPH_TASK 中）。  
   - 示例：  
     - API：`docker compose up -d && cd watch-together-server && npm run test:api:join`  
     - Prisma：`docker compose exec watch-together-server npx prisma validate && npx prisma migrate deploy`  
     - 前端：`skill:watch-together-webapp-testing ${TASK_ID}`（见 watch-together-webapp-testing）。  
   - **未通过就不算完成**：根据失败信息对应到**某一步的验收**，在该步上循环完善后重跑；若步骤都勾了但整体仍失败，再查步骤之间的衔接或遗漏。

6. **完成**  
   - Test Command 通过后：  
     - 未勾的 AC 全部勾上：`backlog task edit <id> --check-ac 1 --check-ac 2 ...`  
     - 标 Done：`backlog task edit <id> -s Done`  
     - 需要时推送并建 PR：`git push -u origin task/TASK-<id>`，`gh pr create --head task/TASK-<id> --base main --title "TASK-<id>: 简短标题" ...`

## 任务必备内容

- **Description**：做什么、范围、关键约束。  
- **Acceptance Criteria**：可逐条验收的条目（建议 Given/When/Then 便于写测试）。  
- **Test Command**：能自动验证“做完”的命令或技能调用；没有则要先在任务里补上再跑。

## 相关技能

- **backlogmd**：`backlog task` 的创建、查看、编辑、列表。  
- **ralph-git-workflow**：分支命名 `task/TASK-<id>`、提交规范、PR。  
- **watch-together-webapp-testing**：前端/浏览器测试作为 Test Command 的一种。

## 延伸（可选）

本流程的「先按 AC 约定再实现、用 Test Command 收敛再完成」思路借鉴自 [OpenSpec](https://github.com/Fission-AI/OpenSpec)。若你之后想用 OpenSpec 的完整命令（如 `/opsx:new`、`/opsx:ff`、`/opsx:apply`），可再查其文档；**本项目中任务来源与验收仍以 backlog + Test Command 为准**。
