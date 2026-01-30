# Watch Together Webapp Testing - Ralph 集成说明

## 集成到 ralph-run-task-branch.sh

测试技能已集成到 ralph 工作流中，实现**测试驱动的开发循环**。

## 工作流程

### 1. 在 backlog task 中指定测试技能

```markdown
**Test Command**: `skill:watch-together-webapp-testing TASK-32`
```

### 2. 运行 ralph-run-task-branch.sh

```bash
ralph-run-task-branch.sh 32
```

### 3. 自动工作流程

脚本会自动：

1. **生成 RALPH_TASK.md**：从 backlog task 32 读取并生成
2. **检测测试命令**：发现 `test_command: "skill:watch-together-webapp-testing TASK-32"`
3. **使用测试循环模式**：自动调用 `ralph-loop-until-tests-pass.sh`
4. **执行开发循环**：
   - 迭代 1：Ralph 实现功能 → 运行测试 → 测试失败 → 保存结果到 `.ralph/test-results.log`
   - 迭代 2：Ralph 读取测试结果 → 修复问题 → 运行测试 → 测试失败 → 继续
   - 迭代 N：Ralph 修复所有问题 → 运行测试 → **测试通过** → 完成

## 测试结果反馈机制

### 测试结果保存

每次测试运行后，结果会保存到 `.ralph/test-results.log`：

```
═══════════════════════════════════════════════════════════════════
Test Run: 2026-01-30 18:00:00
Command: skill:watch-together-webapp-testing TASK-32
═══════════════════════════════════════════════════════════════════
[测试输出...]

Test Result: FAILED
Exit Code: 1
═══════════════════════════════════════════════════════════════════
```

### Ralph 读取测试结果

在每次迭代开始时，Ralph 的 prompt 会包含：

```
## FIRST: Read State Files

Before doing anything:
1. Read `RALPH_TASK.md` - your task and completion criteria
2. Read `.ralph/guardrails.md` - lessons from past failures (FOLLOW THESE)
3. Read `.ralph/progress.md` - what's been accomplished
4. Read `.ralph/errors.log` - recent failures to avoid
5. Read `.ralph/test-results.log` - latest test results (if exists) - **CRITICAL**: Fix any test failures before continuing
```

Ralph 会：
1. 读取 `.ralph/test-results.log` 了解测试失败原因
2. 根据测试结果修复代码
3. 再次运行测试验证修复

### 测试结果截图与归档

- 测试截图保存在 **`backlog/test-results/task-<id>/`**（按任务单独文件夹）。
- 任务完成时，归档内容（Implementation Notes）中会自动增加「**测试通过 (Test Passed)**」段落，包含测试时间及该任务目录下所有 `.png` 的链接，便于在任务笔记或 `backlog/docs/task-<id>-ralph-task.md` 中查看。

## Docker Compose 服务管理

测试运行前会自动检查并启动 docker-compose 服务：

```bash
# 自动检查服务状态
docker-compose ps

# 如果服务未运行，自动启动
docker-compose up -d
```

## 测试循环示例

```
迭代 1:
  → Ralph 实现功能
  → 运行测试: skill:watch-together-webapp-testing TASK-32
  → 测试失败: "未找到开始共享按钮"
  → 保存结果到 .ralph/test-results.log

迭代 2:
  → Ralph 读取 .ralph/test-results.log
  → 发现: "未找到开始共享按钮"
  → 修复: 添加按钮到页面
  → 运行测试
  → 测试失败: "视频未播放"
  → 保存结果

迭代 3:
  → Ralph 读取测试结果
  → 修复视频播放问题
  → 运行测试
  → ✅ 测试通过
  → 完成！
```

## 使用示例

### 示例 1: 运行 TASK-32

```bash
# 1. 确保 backlog task 32 有测试命令
backlog task 32 --plain | grep "Test Command"

# 2. 运行 ralph
ralph-run-task-branch.sh 32

# 3. 观察循环
# - 每次迭代后会自动运行测试
# - 测试失败会继续下一轮迭代
# - 测试通过会停止并完成
```

### 示例 2: 手动查看测试结果

```bash
# 查看最新测试结果
tail -50 .ralph/test-results.log

# 查看测试失败详情
grep -A 20 "FAILED" .ralph/test-results.log
```

## 注意事项

1. **Docker Compose 服务**：确保服务在测试前运行，脚本会自动检查并启动
2. **测试超时**：某些测试（如屏幕共享）需要用户手动操作，会有等待时间
3. **测试结果格式**：测试输出会完整保存到 `.ralph/test-results.log`，Ralph 可以读取并理解
4. **迭代限制**：默认最多 20 次迭代，可以通过 `-n` 参数调整

## 故障排查

### 测试未运行

检查 RALPH_TASK.md 中是否有 `test_command`：

```bash
grep test_command RALPH_TASK.md
```

### 测试结果未保存

检查 `.ralph` 目录权限：

```bash
ls -la .ralph/test-results.log
```

### Docker 服务未启动

手动启动服务：

```bash
docker-compose up -d
docker-compose ps
```
