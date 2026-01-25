# 需求工作流说明

## 概述

完整的需求到执行工作流，支持：
1. **需求描述** → 用户提供需求
2. **正交分解** → 通过 skill 将需求拆分为独立、可测试的子任务
3. **用户确认** → 展示分解结果，等待用户确认
4. **任务创建** → 批量创建 backlog 任务
5. **Ralph 执行** → 可选择立即执行或稍后执行

## 工作流程图

```
用户描述需求
    ↓
requirement-decomposer skill
    ↓
正交分解为原子子任务
    ↓
每个任务包含：
  - 明确的测试命令
  - 成功标准列表
  - 无依赖（可并行）
    ↓
展示给用户确认
    ↓ [用户确认]
批量创建 backlog 任务
    ↓
询问是否立即执行
    ↓ [是]
Ralph 自动加载第一个任务
    ↓
开始执行
```

## 使用方法

### 方式 1: 命令行直接使用

```bash
# 直接提供需求描述
./.cursor/ralph-scripts/requirement-workflow.sh "构建一个 TypeScript CLI todo 应用，支持 add/list/done 命令"

# 从文件读取需求
./.cursor/ralph-scripts/requirement-workflow.sh --file requirement.txt

# 交互式输入
./.cursor/ralph-scripts/requirement-workflow.sh --interactive

# 跳过确认，直接创建
./.cursor/ralph-scripts/requirement-workflow.sh --no-confirm "需求描述"

# 创建后自动执行
./.cursor/ralph-scripts/requirement-workflow.sh --auto-execute "需求描述"
```

### 方式 2: 通过 Agent 使用

**Trigger**: 
- `/decompose <需求描述>`
- "分解这个需求: <描述>"
- "将这个需求拆分为子任务: <描述>"

Agent 会：
1. 调用 `requirement-decomposer` skill
2. 展示分解结果
3. 等待用户确认
4. 创建 backlog 任务
5. 询问是否执行

## 分解原则

### 正交性（Orthogonality）
- 子任务之间相互独立
- 可以并行执行
- 无依赖关系

### 原子性（Atomicity）
- 每个子任务不可再分
- 有明确的输入输出
- 有明确的完成标准

### 可测试性（Testability）
- 每个子任务有明确的测试命令
- 测试结果二元化（通过/失败）
- 可自动化执行

## 示例

### 输入需求

```
构建一个 TypeScript CLI todo 应用
- 支持 add/list/done 三个命令
- 使用 JSON 文件持久化
- 有完整的错误处理
- 支持 TypeScript 类型检查
```

### 分解结果

```
## 需求分解结果

共生成 4 个子任务：

### 任务 1: 实现 add 命令
- **ID**: `task-001`
- **描述**: 支持 add/list/done 三个命令
- **测试命令**: `npx ts-node todo.ts add "test" --help`
- **成功标准**:
  1. [ ] 命令可以正常执行
  2. [ ] 帮助信息正确显示
  3. [ ] 参数解析正确
- **依赖**: 无（可并行执行）

### 任务 2: 实现 list 命令
- **ID**: `task-002`
- **描述**: 支持 add/list/done 三个命令
- **测试命令**: `npx ts-node todo.ts list`
- **成功标准**:
  1. [ ] 命令可以正常执行
  2. [ ] 显示所有待办事项
  3. [ ] 格式正确
- **依赖**: 无（可并行执行）

### 任务 3: JSON 持久化
- **ID**: `task-003`
- **描述**: 使用 JSON 文件持久化
- **测试命令**: `test -f todos.json`
- **成功标准**:
  1. [ ] 数据保存到 JSON 文件
  2. [ ] 重启后数据可恢复
  3. [ ] JSON 格式正确
- **依赖**: 无（可并行执行）

### 任务 4: 错误处理
- **ID**: `task-004`
- **描述**: 有完整的错误处理
- **测试命令**: `npx ts-node todo.ts invalid`
- **成功标准**:
  1. [ ] 无效命令显示错误信息
  2. [ ] 错误信息清晰明确
  3. [ ] 程序不会崩溃
- **依赖**: 无（可并行执行）
```

### 创建后的 backlog.md

```markdown
# Backlog

## Tasks

### [ ] 实现 add 命令

**ID**: task-001  
**Status**: To Do

**Description**:  
支持 add/list/done 三个命令

**Test Command**: `npx ts-node todo.ts add "test" --help`

**Success Criteria**:
1. [ ] 命令可以正常执行
2. [ ] 帮助信息正确显示
3. [ ] 参数解析正确

---

### [ ] 实现 list 命令
...
```

## 脚本说明

### requirement-workflow.sh

主工作流脚本，整合整个流程：

```bash
./requirement-workflow.sh [options] "<requirement>"
```

**选项**:
- `--file <file>`: 从文件读取需求
- `--interactive`: 交互式输入
- `--no-confirm`: 跳过确认
- `--auto-execute`: 创建后自动执行

### decompose_requirement.py

需求分解脚本，位于：
```
.cursor/skills/requirement-decomposer/scripts/decompose_requirement.py
```

**功能**:
- 分析需求
- 正交分解
- 生成测试命令
- 生成成功标准

**使用**:
```bash
python3 decompose_requirement.py "需求描述"
python3 decompose_requirement.py "需求描述" --json  # JSON 输出
```

### backlog-integration.py

Backlog 集成脚本，新增功能：

```bash
# 创建单个任务
python3 backlog-integration.py create-task '{"id":"task-1","title":"Task 1",...}'

# 批量创建任务
python3 backlog-integration.py create-tasks tasks.json
```

## 优化建议

### 1. 分解质量

当前分解使用启发式规则，可以优化：
- 使用 LLM 进行更智能的分解
- 识别任务依赖关系
- 自动生成更准确的测试命令

### 2. 用户确认

可以添加：
- 编辑任务功能（在确认前）
- 合并/拆分任务
- 调整优先级

### 3. 执行策略

可以支持：
- 并行执行（如果任务真的正交）
- 依赖管理（如果有依赖）
- 任务优先级排序

### 4. 反馈循环

可以添加：
- 执行结果反馈到分解器
- 学习用户偏好
- 优化分解策略

## 故障排除

### 问题：分解结果不理想

**解决方案**：
1. 提供更详细的需求描述
2. 明确指定技术栈和约束
3. 手动编辑生成的任务

### 问题：任务创建失败

**解决方案**：
1. 检查 backlog.md 文件权限
2. 确认 JSON 格式正确
3. 查看错误日志

### 问题：测试命令不正确

**解决方案**：
1. 在 backlog.md 中手动编辑测试命令
2. 更新 decompose_requirement.py 的规则
3. 为特定技术栈添加模板

## 下一步

1. **集成 LLM**：使用 AI 进行更智能的分解
2. **依赖分析**：自动识别任务依赖
3. **模板系统**：为常见需求类型提供模板
4. **执行优化**：支持并行执行和依赖管理
