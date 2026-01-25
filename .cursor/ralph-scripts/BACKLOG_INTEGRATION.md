# Ralph Backlog 集成说明

## 概述

Ralph 现在支持与 Backlog 集成，可以：
1. **自动从 Backlog 加载任务**：启动时如果没有 `RALPH_TASK.md`，会自动从 backlog 读取下一个未完成任务
2. **动态生成 RALPH_TASK.md**：根据 backlog 任务自动生成执行文件
3. **自动更新 Backlog 状态**：任务完成时自动将 backlog 中的任务状态更新为 "Done"

## 工作流程

```
Backlog (backlog.md) 
    ↓ [Ralph 启动]
自动加载未完成任务
    ↓
生成 RALPH_TASK.md
    ↓ [Ralph 执行]
更新状态为 "In Progress"
    ↓ [任务完成]
更新状态为 "Done"
```

## 使用方法

### 1. 准备 Backlog 文件

在项目根目录创建 `backlog.md`，格式如下：

```markdown
# Backlog

## Tasks

### [ ] 任务标题

**ID**: task-id  
**Status**: To Do

**Description**:  
任务描述

**Success Criteria**:
1. [ ] 第一个成功标准
2. [ ] 第二个成功标准

**Test Command**: `npm test`
```

### 2. 运行 Ralph

直接运行 Ralph 脚本，如果 `RALPH_TASK.md` 不存在，会自动从 backlog 加载：

```bash
# 单次迭代
./.cursor/ralph-scripts/ralph-once.sh

# 完整循环
./.cursor/ralph-scripts/ralph-loop.sh
```

### 3. 自动状态更新

- **启动时**：如果任务从 backlog 加载，状态自动更新为 "In Progress"
- **完成时**：所有成功标准完成后，状态自动更新为 "Done"

## Backlog 文件格式

### 必需字段

- **ID**: 任务的唯一标识符（用于关联）
- **Status**: 任务状态（"To Do", "In Progress", "Done"）
- **Success Criteria**: 成功标准列表（使用 `[ ]` 或 `[x]` 标记）

### 可选字段

- **Description**: 任务描述
- **Requirements**: 需求列表
- **Test Command**: 测试命令

## 脚本说明

### backlog-integration.py

Python 脚本，提供以下命令：

```bash
# 获取下一个未完成任务
python3 .cursor/ralph-scripts/backlog-integration.py get-next-task

# 生成 RALPH_TASK.md
python3 .cursor/ralph-scripts/backlog-integration.py generate-task

# 更新任务状态
python3 .cursor/ralph-scripts/backlog-integration.py update-status <task_id> <status>
```

## 修改的文件

1. **ralph-common.sh**
   - 添加 `load_task_from_backlog()` 函数
   - 添加 `update_backlog_status()` 函数
   - 修改 `check_task_complete()` 以自动更新 backlog
   - 修改 `check_prerequisites()` 以支持从 backlog 加载

2. **ralph-loop.sh** 和 **ralph-once.sh**
   - 更新以传递 script_dir 参数

3. **backlog-integration.py** (新建)
   - Backlog 集成脚本
   - 支持解析 backlog.md
   - 支持更新任务状态

## 注意事项

1. **优先级**：优先加载 "In Progress" 状态的任务，然后是 "To Do" 状态
2. **任务关联**：通过 `backlog_id` 字段关联 backlog 任务和 RALPH_TASK.md
3. **状态同步**：任务完成时自动更新 backlog，无需手动操作
4. **回退机制**：如果 backlog 集成失败，Ralph 会提示手动创建 RALPH_TASK.md

## 示例

### 示例 backlog.md

```markdown
# Backlog

## Tasks

### [ ] Build CLI Todo App

**ID**: todo-app-typescript  
**Status**: To Do

**Description**:  
Build a simple command-line todo application in TypeScript.

**Success Criteria**:
1. [ ] Implement add command
2. [ ] Implement list command
3. [ ] Implement done command
4. [ ] Add JSON persistence
5. [ ] Add proper error handling

**Test Command**: `npx ts-node todo.ts list`
```

### 运行流程

1. 运行 `./.cursor/ralph-scripts/ralph-once.sh`
2. 脚本检测到没有 `RALPH_TASK.md`
3. 自动从 backlog.md 加载 "todo-app-typescript" 任务
4. 生成 `RALPH_TASK.md` 并更新 backlog 状态为 "In Progress"
5. Ralph 开始执行任务
6. 任务完成后，backlog 状态自动更新为 "Done"

## 故障排除

### 问题：无法从 backlog 加载任务

**解决方案**：
1. 检查 `backlog.md` 文件是否存在
2. 确认任务格式正确（包含 ID 和 Status 字段）
3. 确认有 "To Do" 或 "In Progress" 状态的任务

### 问题：状态未更新

**解决方案**：
1. 检查 `backlog.md` 中的任务 ID 是否与 `RALPH_TASK.md` 中的 `backlog_id` 匹配
2. 确认 Python 3 已安装
3. 检查 `backlog-integration.py` 脚本权限

### 问题：任务格式解析错误

**解决方案**：
1. 确认使用正确的 markdown 格式
2. 检查任务 ID 是否唯一
3. 确认 Success Criteria 使用正确的列表格式
