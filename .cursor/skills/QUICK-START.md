# Ralph 工作流程快速参考

## 🚀 快速开始

### 场景 A：从粗略需求开始

```bash
# 1. 生成 newneed.md（手动或通过 Agent）
# Agent 会调用：requirement-clarify → requirement-to-newneed

# 2. 创建 backlog 任务
./.cursor/ralph-scripts/requirement-workflow.sh --decomposed newneed.md

# 3. 串行执行任务
./.cursor/ralph-scripts/backlog-serial.sh --auto-merge
```

### 场景 B：已有 Backlog 任务

```bash
# 直接执行单个任务
./.cursor/ralph-scripts/ralph-run-task-branch.sh <task_id>

# 或串行执行所有 To Do 任务
./.cursor/ralph-scripts/backlog-serial.sh
```

---

## 📋 流程步骤速查

### 前置流程（需求 → Backlog）

| 步骤 | 技能 | 脚本等价 |
|------|------|----------|
| 1. 需求澄清 | `requirement-clarify` | - |
| 2. 生成 newneed.md | `requirement-to-newneed` | - |
| 3. 创建 backlog 任务 | `backlog-create-from-decomposed` | `requirement-workflow.sh --decomposed` |
| 4. 串行执行 | `backlog-serial-execute` | `backlog-serial.sh` |

### 执行流程（Backlog → 完成）

| 步骤 | 技能 | 脚本等价 |
|------|------|----------|
| 1. 拿任务 | `ralph-take-task` | `ralph-run-task-branch.sh` (内部) |
| 2. 开分支 | `ralph-open-branch` | `ralph-run-task-branch.sh` (内部) |
| 3. 细化约定 | `spec-refine-and-plan` | Agent 按技能执行 |
| 4. 按步执行 | `plan-execute-step` | Agent 按技能执行 |
| 5. 跑测试 | `task-run-test-command` | `ralph-loop-until-tests-pass.sh` |
| 6. 审查（可选） | `task-request-review` | Agent 按技能执行 |
| 7. 完成与 PR | `ralph-finish-branch` | `backlog-serial.sh` (内部) |

---

## 🎯 常用命令

```bash
# 查看 backlog 任务
backlog task list -s "To Do" --plain

# 查看任务详情
backlog task <id> --plain

# 执行单个任务
./.cursor/ralph-scripts/ralph-run-task-branch.sh <id>

# 串行执行所有任务
./.cursor/ralph-scripts/backlog-serial.sh --auto-merge

# 持续等待新任务
./.cursor/ralph-scripts/backlog-serial.sh --watch
```

---

## 🤖 Cursor-Agent CLI 使用技能

### 方式 1：在 Prompt 中引用技能（推荐）

```bash
# 创建 prompt，引用技能名称
cat > prompt.txt << 'EOF'
请调用 spec-refine-and-plan 技能细化约定
然后调用 plan-execute-step 技能按步执行
EOF

# 运行 cursor-agent
cursor-agent -p --force --output-format stream-json < prompt.txt
```

### 方式 2：在测试命令中使用

```bash
# 在 backlog 任务中
backlog task edit 129 --test-command "skill:watch-together-webapp-testing 129"

# 或在 newneed.md 中
- **测试命令**: `skill:watch-together-webapp-testing ${TASK_ID}`
```

### 方式 3：自然语言触发

在对话中使用：
- "请使用 requirement-clarify 技能澄清需求"
- "现在调用 spec-refine-and-plan 技能"
- "按 plan-execute-step 技能执行步骤 1.1"

**详细说明**：`.cursor/skills/CURSOR-AGENT-CLI-USAGE.md`

---

## 📚 详细文档

- **完整流程指南**：`.cursor/skills/RALPH-WORKFLOW-GUIDE.md`
- **Cursor-Agent CLI 使用**：`.cursor/skills/CURSOR-AGENT-CLI-USAGE.md`
- **前置流程编排**：`.cursor/skills/requirement-to-backlog-flow/SKILL.md`
- **执行流程编排**：`.cursor/skills/openspec-backlog-flow/SKILL.md`
