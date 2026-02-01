# 单任务流程速查

## 六步

1. **拿任务** — `backlog task <id> --plain`（确认有 Description、AC、Test Command）  
2. **开分支** — `git checkout -b task/TASK-<id> main`  
3. **细化约定** — 补全 Description、AC；列实现步骤且**每步写验收标准**，便于按步迭代、失败时在对应步循环  
4. **实现** — 按步骤+验收写代码，做完一步验一步（不通过在该步循环）；整体 Test Command 失败时对应到某步再迭代  
5. **跑测试** — 执行任务里的 **Test Command**，不通过就继续改  
6. **完成** — 通过后勾齐 AC、`backlog task edit <id> -s Done`，需要时 push + `gh pr create`

## 步骤级验收

- 实现步骤建议**每步带验收标准**（如「1.1 验收：GET /api/v1/rooms 返回 200」），实现时按步验、失败在该步循环；整体 Test Command 失败时对应到某步再改。

## Test Command 约定

- 写在 backlog 任务的 **Description** 或 RALPH_TASK 的 `test_command`。  
- 类型示例：API 测试脚本、`prisma validate`/`migrate deploy`、`skill:watch-together-webapp-testing ${TASK_ID}`。  
- **不跑通 Test Command 不标 Done**。
