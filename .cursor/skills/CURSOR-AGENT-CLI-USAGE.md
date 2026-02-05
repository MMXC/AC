# Cursor-Agent CLI 使用技能指南

本文档说明如何在 **cursor-agent CLI** 中使用 Ralph 工作流程的技能。

---

## 📋 概述

cursor-agent CLI 通过以下方式使用技能：

1. **在 Prompt 中引用技能名称**：Agent 会自动识别并调用对应技能
2. **在测试命令中使用 `skill:` 前缀**：直接调用技能作为测试命令
3. **在对话中显式调用**：通过自然语言触发技能

---

## 🚀 方式 1：在 Prompt 中引用技能（推荐）

### 工作原理

cursor-agent CLI 读取 prompt 文件，Agent 会识别 prompt 中提到的技能名称，并自动调用对应技能。

### 示例：执行单个任务

```bash
# 1. 创建 prompt 文件
cat > .ralph/.prompt << 'EOF'
你正在处理 backlog 任务 TASK-129。

请按以下步骤执行：

1. 调用 ralph-take-task 技能：读取任务详情
2. 调用 ralph-open-branch 技能：创建分支 task/TASK-129
3. 调用 spec-refine-and-plan 技能：细化约定并写出实现计划
4. 调用 plan-execute-step 技能：按步骤执行实现计划
5. 调用 task-run-test-command 技能：运行测试命令
6. 调用 ralph-finish-branch 技能：完成并创建 PR

任务详情见 RALPH_TASK.md
EOF

# 2. 运行 cursor-agent
cursor-agent -p --force --output-format stream-json < .ralph/.prompt
```

### 示例：前置流程

```bash
cat > .ralph/.prompt << 'EOF'
用户需求："构建一个 TypeScript CLI todo 应用"

请按前置流程执行：

1. 调用 requirement-clarify 技能：澄清需求
2. 调用 requirement-to-newneed 技能：生成 newneed.md
3. 调用 backlog-create-from-decomposed 技能：创建 backlog 任务
EOF

cursor-agent -p --force --output-format stream-json < .ralph/.prompt
```

### 在 build_prompt 中引用（已实现）

`ralph-common.sh` 的 `build_prompt()` 函数已经包含了技能引用：

```bash
# 在 ralph-common.sh 中
build_prompt() {
  # ...
  cat << EOF
## Task Workflow (Backlog + Branch – 按步调用技能)

1. **Step 3 – spec-refine-and-plan**: invoke the **spec-refine-and-plan** skill
2. **Step 4 – plan-execute-step**: invoke the **plan-execute-step** behavior
3. **Step 5 – task-run-test-command**: Run test command (as in **task-run-test-command**)
...
EOF
}
```

因此，使用 `ralph-run-task-branch.sh` 时，Agent 会自动看到这些技能引用。

---

## 🎯 方式 2：在测试命令中使用 `skill:` 前缀

### 语法

```bash
skill:<skill-name> [arguments]
# 或
@<skill-name> [arguments]
```

### 示例：在 Test Command 中调用技能

在 backlog 任务的 Test Command 字段中：

```markdown
test_command: skill:watch-together-webapp-testing ${TASK_ID}
```

或在 newneed.md 中：

```markdown
- **测试命令**: `skill:watch-together-webapp-testing ${TASK_ID}`
```

### 脚本支持

`ralph-loop-until-tests-pass.sh` 已支持技能调用：

```bash
# 检测技能格式
if [[ "$test_cmd" =~ ^skill:([a-zA-Z0-9_-]+)(.*)$ ]] || [[ "$test_cmd" =~ ^@([a-zA-Z0-9_-]+)(.*)$ ]]; then
  skill_name="${BASH_REMATCH[1]}"
  skill_args="${BASH_REMATCH[2]}"
  # 调用技能
fi
```

### 可用技能列表

- `skill:watch-together-webapp-testing` - 前端/浏览器测试
- `skill:backlogmd` - backlog CLI 操作
- 其他自定义技能...

---

## 💬 方式 3：在对话中显式调用

### 自然语言触发

在 cursor-agent 的对话中，使用自然语言触发技能：

```
"请使用 requirement-clarify 技能澄清这个需求：构建一个 TypeScript CLI todo 应用"
"现在调用 spec-refine-and-plan 技能，细化约定并写出实现计划"
"按 plan-execute-step 技能执行步骤 1.1"
```

### 技能名称映射

Agent 会根据技能描述中的触发场景自动识别：

| 技能名称 | 触发关键词 |
|---------|-----------|
| `requirement-clarify` | "澄清需求"、"需求澄清" |
| `requirement-to-newneed` | "生成 newneed.md"、"写需求文档" |
| `spec-refine-and-plan` | "细化约定"、"写实现计划" |
| `plan-execute-step` | "按步执行"、"执行步骤" |
| `task-run-test-command` | "跑测试"、"执行测试" |
| `ralph-finish-branch` | "完成"、"标 Done"、"提 PR" |

---

## 🔧 实际使用示例

### 示例 1：完整前置流程（手动）

```bash
#!/bin/bash
# 完整前置流程示例

# 步骤 1：需求澄清
cat > .ralph/.prompt-clarify << 'EOF'
用户需求："构建一个 TypeScript CLI todo 应用"

请调用 requirement-clarify 技能，澄清以下问题：
1. 技术栈：TypeScript + Node.js，CLI 框架？
2. 功能范围：需要哪些命令？
3. 数据存储：文件还是数据库？
EOF

cursor-agent -p --force --output-format stream-json < .ralph/.prompt-clarify > .ralph/clarify-result.json

# 步骤 2：生成 newneed.md
cat > .ralph/.prompt-newneed << 'EOF'
基于澄清后的需求，调用 requirement-to-newneed 技能生成 newneed.md
EOF

cursor-agent -p --force --output-format stream-json < .ralph/.prompt-newneed

# 步骤 3：创建 backlog 任务
./.cursor/ralph-scripts/requirement-workflow.sh --decomposed newneed.md

# 步骤 4：串行执行
./.cursor/ralph-scripts/backlog-serial.sh --auto-merge
```

### 示例 2：执行单个任务（使用脚本）

```bash
# 脚本内部会调用 cursor-agent，并传入包含技能引用的 prompt
./.cursor/ralph-scripts/ralph-run-task-branch.sh 129

# 等价于：
# 1. 生成 RALPH_TASK.md
# 2. 创建分支 task/TASK-129
# 3. 运行 cursor-agent，prompt 中包含技能引用：
#    "调用 spec-refine-and-plan 技能..."
#    "调用 plan-execute-step 技能..."
```

### 示例 3：在测试命令中使用技能

```bash
# 在 backlog 任务中设置 Test Command
backlog task edit 129 --test-command "skill:watch-together-webapp-testing 129"

# 或在 newneed.md 中
cat >> newneed.md << 'EOF'
- **测试命令**: `skill:watch-together-webapp-testing ${TASK_ID}`
EOF

# 执行时，ralph-loop-until-tests-pass.sh 会识别并调用技能
./.cursor/ralph-scripts/ralph-run-task-branch.sh 129
```

---

## 📚 技能文件位置

所有技能文件位于 `.cursor/skills/` 目录：

```
.cursor/skills/
├── requirement-clarify/
│   └── SKILL.md
├── requirement-to-newneed/
│   └── SKILL.md
├── spec-refine-and-plan/
│   └── SKILL.md
├── plan-execute-step/
│   └── SKILL.md
├── task-run-test-command/
│   └── SKILL.md
└── ...
```

Agent 会自动读取这些 SKILL.md 文件来理解技能的使用方式。

---

## 🔍 技能识别机制

### 1. 技能名称匹配

Agent 会识别 prompt 中提到的技能名称（如 `spec-refine-and-plan`），并查找对应的 `.cursor/skills/<skill-name>/SKILL.md` 文件。

### 2. 触发场景匹配

Agent 会根据技能描述中的触发场景（如 "细化约定"、"写实现计划"）匹配技能。

### 3. 显式调用

在对话中使用 "调用 <skill-name> 技能" 或 "使用 <skill-name>" 会显式触发技能。

---

## 🛠️ 调试技巧

### 查看技能文件

```bash
# 查看技能内容
cat .cursor/skills/spec-refine-and-plan/SKILL.md

# 列出所有技能
ls -1 .cursor/skills/*/SKILL.md
```

### 查看 Agent 输出

```bash
# 使用 stream-json 格式查看详细输出
cursor-agent -p --force --output-format stream-json < prompt.txt | jq .

# 或保存到文件
cursor-agent -p --force --output-format stream-json < prompt.txt > output.json
```

### 检查技能调用

在 `.ralph/activity.log` 中查看 Agent 的活动记录：

```bash
tail -f .ralph/activity.log
```

---

## 📖 相关文档

- **完整流程指南**：`.cursor/skills/RALPH-WORKFLOW-GUIDE.md`
- **快速参考**：`.cursor/skills/QUICK-START.md`
- **前置流程编排**：`.cursor/skills/requirement-to-backlog-flow/SKILL.md`
- **执行流程编排**：`.cursor/skills/openspec-backlog-flow/SKILL.md`

---

## 💡 最佳实践

1. **使用脚本**：优先使用 `ralph-run-task-branch.sh` 和 `backlog-serial.sh`，它们已集成技能引用
2. **显式调用**：在自定义 prompt 中显式写出 "调用 <skill-name> 技能"
3. **测试命令**：使用 `skill:` 前缀在测试命令中调用技能
4. **技能文档**：每个技能都有 SKILL.md，包含触发场景、输入、动作、完成标准

---

## 🎯 总结

- **方式 1（推荐）**：在 prompt 中引用技能名称，Agent 自动识别
- **方式 2**：在测试命令中使用 `skill:<name>` 格式
- **方式 3**：在对话中使用自然语言触发技能

所有方式都通过读取 `.cursor/skills/<skill-name>/SKILL.md` 文件来理解技能的使用方式。
