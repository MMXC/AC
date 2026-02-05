---
name: task-run-test-command
description: 执行任务中定义的 Test Command 并报告通过/失败。Ralph 流程第五步。当需要「跑测试」「执行 Test Command」「测试收敛」时使用。
---

# 跑测试（Task Run Test Command）

本技能是 **Ralph 任务流程的第五步**：执行当前任务在 RALPH_TASK.md 或 backlog 中定义的 **Test Command**，根据结果报告通过或失败，并写入 .ralph/test-results.log 供后续步骤使用。

## 触发场景

- "跑测试"、"执行 Test Command"、"测试收敛"
- 流程编排指示「步骤 5：跑测试」时
- 实现步骤全部完成后、标 Done 或提 PR 前，需要整体验收

## 输入

- **Test Command**：来自 RALPH_TASK.md 的 `test_command:` 或 backlog 任务的 Test Command 字段。
- **workspace**：项目根目录（默认当前目录）。

## 必做动作

1. **读取 Test Command**：
   - 从 RALPH_TASK.md 中解析 `test_command:` 行，或从 backlog 任务中获取。
   - 若任务无 Test Command 且任务要求可执行验收：提醒在任务中补上 Test Command 后再跑。

2. **执行命令**：
   - 在项目根目录（或脚本约定的工作目录）执行 Test Command。
   - 示例：  
     - API：`docker compose up -d && cd watch-together-server && npm run test:api:join`  
     - Prisma：`docker compose exec watch-together-server npx prisma validate && npx prisma migrate deploy`  
     - 前端：`skill:watch-together-webapp-testing ${TASK_ID}`（见 watch-together-webapp-testing）

3. **记录结果**：
   - 将标准输出与标准错误写入 `.ralph/test-results.log`（或脚本约定的路径）。
   - 根据退出码与输出判断：**通过** 或 **失败**。

4. **报告**：
   - 明确输出「Test Command 通过」或「Test Command 失败」，并引用 .ralph/test-results.log 中的关键信息。
   - 若失败：对应回 **plan-execute-step** 中的某一步或某条 AC，建议在该步上迭代修复后再重跑。

## 与脚本的关系

- `ralph-loop-until-tests-pass.sh` 会在每次迭代后自动执行 Test Command 并写 .ralph/test-results.log。
- 本技能供「按步调用技能」的流程使用：在 **plan-execute-step** 全部完成后、**task-request-review** 或 **ralph-finish-branch** 前调用。

## 相关技能

- **plan-execute-step**：上一步，按步实现；失败时对应回某步。
- **task-request-review**：可选，跑测试前后做对照计划审查。
- **ralph-finish-branch**：测试通过后标 Done、PR。
- **watch-together-webapp-testing**：前端/浏览器测试作为 Test Command 的一种。

## 完成标准

- Test Command 已执行。
- 结果已写入 .ralph/test-results.log 并明确报告通过/失败。
- 未通过时已给出对应步骤或 AC 的修复建议。
