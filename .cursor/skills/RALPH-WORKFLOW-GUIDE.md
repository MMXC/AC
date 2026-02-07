# Ralph 完整工作流程指南

本文档说明从**粗略需求**到**任务完成**的完整流程，包括前置流程（需求到 backlog）和执行流程（backlog 到完成）。

---

## 📋 流程总览

```
粗略需求
   ↓
[前置流程：requirement-to-backlog-flow]
   ├─ 1. requirement-clarify         需求澄清
   ├─ 2. requirement-to-newneed       生成 newneed.md
   ├─ 3. backlog-create-from-decomposed  创建 backlog 任务
   └─ 4. backlog-serial-execute      串行执行任务
   ↓
Backlog To Do 任务列表
   ↓
[执行流程：openspec-backlog-flow]
   ├─ 1. ralph-take-task              拿任务
   ├─ 2. ralph-open-branch            开分支
   ├─ 3. spec-refine-and-plan        细化约定与写计划
   ├─ 4. plan-execute-step           按步执行
   ├─ 5. task-run-test-command        跑测试
   ├─ 6. task-request-review (可选)   对照计划审查
   └─ 7. ralph-finish-branch         完成与 PR
   ↓
任务完成 ✅
```

---

## 🚀 前置流程：从需求到 Backlog 任务

### 场景 1：用户提供粗略需求

**示例**：用户说"构建一个 TypeScript CLI todo 应用"

#### 步骤 1：需求澄清（requirement-clarify）

**技能**：`requirement-clarify`

**动作**：
- 分析需求类型（CLI 工具）
- 主动澄清关键问题：
  - 技术栈：TypeScript、Node.js、CLI 框架？
  - 功能范围：add/list/done 命令？是否需要持久化？
  - 约束条件：性能、兼容性要求？
  - 用户场景：目标用户、使用环境？
- 识别优化方向（可选）：性能、用户体验、代码质量等
- 输出澄清后的结构化需求

**对话示例**：
```
用户："构建一个 TypeScript CLI todo 应用"

Agent（调用 requirement-clarify）：
"请确认以下信息：
1. 技术栈：使用 TypeScript + Node.js，CLI 框架用 commander.js 还是 yargs？
2. 功能：需要哪些命令？add/list/done/delete？
3. 数据存储：使用文件（JSON）还是数据库？
4. 是否需要测试？"
```

#### 步骤 2：生成 newneed.md（requirement-to-newneed）

**技能**：`requirement-to-newneed`

**动作**：
- 若需求未分解，先调用 `requirement-decompose` 正交分解为原子子任务
- 按格式写入 `newneed.md`：

```markdown
# 需求概要

### 任务 1: 初始化 TypeScript CLI 项目

- **ID**: todo-cli-init
- **描述**: 创建 TypeScript CLI 项目结构，配置 package.json、tsconfig.json
- **测试命令**: `npm run build && npm run test`
- **成功标准**:
  1. [ ] package.json 包含 TypeScript 依赖
  2. [ ] tsconfig.json 配置正确
  3. [ ] 项目可编译通过
- **测试用例**:
  - **测试数据**: 无
  - **测试场景**:
    1. 运行 npm run build 成功
  - **断言示例**: 无
- **依赖**: 无

### 任务 2: 实现 add 命令
...
```

**文件位置**：项目根目录 `newneed.md`

#### 步骤 3：创建 backlog 任务（backlog-create-from-decomposed）

**技能**：`backlog-create-from-decomposed`

**动作**：
- 使用 `parse-decomposed-tasks.py` 解析 `newneed.md`
- 展示任务摘要，等待用户确认
- 使用 backlog CLI 批量创建任务：

```bash
backlog task create "初始化 TypeScript CLI 项目" \
  -d "创建 TypeScript CLI 项目结构..." \
  --ac "package.json 包含 TypeScript 依赖" \
  --ac "tsconfig.json 配置正确" \
  --ac "项目可编译通过"
```

- 记录创建结果（成功数量、任务 ID 列表）

**脚本方式**（等价）：
```bash
./.cursor/ralph-scripts/requirement-workflow.sh --decomposed newneed.md
```

#### 步骤 4：串行执行任务（backlog-serial-execute）

**技能**：`backlog-serial-execute`

**动作**：
- 在 main 分支上轮询 backlog To Do 任务列表
- 对每个任务：
  1. 抢占任务（main 上标记 In Progress）
  2. 创建/切换分支 `task/TASK-<id>`
  3. 生成 RALPH_TASK.md
  4. 运行 Ralph（`ralph-run-task-branch.sh`）
  5. 成功：推送分支、可选合并/PR
  6. 失败：标记 To Do，继续下一个

**脚本方式**（等价）：
```bash
./.cursor/ralph-scripts/backlog-serial.sh
# 或带参数：
./.cursor/ralph-scripts/backlog-serial.sh --auto-merge  # 自动合并
./.cursor/ralph-scripts/backlog-serial.sh --watch        # 持续等待新任务
```

---

## ⚙️ 执行流程：从 Backlog 任务到完成

### 场景 2：已有 Backlog To Do 任务（或从步骤 4 进入）

**示例**：TASK-129 "用户离开房间后服务端广播 MEMBER_LEFT 与前端列表移除"

#### 步骤 1：拿任务（ralph-take-task）

**技能**：`ralph-take-task`

**动作**：
- 执行 `backlog task 129 --plain` 读取任务详情
- 校验必备内容：
  - Description：有且清晰
  - Acceptance Criteria：可逐条验收
  - Test Command：能自动验证
- 输出任务上下文供后续步骤使用

**脚本方式**（已由 `ralph-run-task-branch.sh` 完成）：
```bash
backlog task 129 --plain | python3 parser.py --emit-ralph-task > RALPH_TASK.md
```

#### 步骤 2：开分支（ralph-open-branch）

**技能**：`ralph-open-branch`

**动作**：
- 创建或切换到分支 `task/TASK-129`
- 确保工作区干净（有未提交更改先提交）

**脚本方式**（已由 `ralph-run-task-branch.sh` 完成）：
```bash
git checkout -b task/TASK-129 main
```

#### 步骤 3：细化约定与写计划（spec-refine-and-plan）

**技能**：`spec-refine-and-plan`

**动作**：
- 细化 Description / AC（如需要）
- 写出 Implementation Steps（实现步骤），每步包含：
  - **做什么**：简短动作描述
  - **涉及文件/接口**：文件路径、接口名
  - **该步验收**：可验证的完成条件
- 写入 RALPH_TASK.md 的 "Implementation Steps" 小节

**示例输出**（写入 RALPH_TASK.md）：
```markdown
## Implementation Steps

### 步骤 1.1: 服务端监听 WebSocket 断开事件
- **文件**: `watch-together-server/src/websocket.ts`
- **动作**: 在 `handleDisconnect` 中检测用户离开房间
- **验收**: 断开连接时能识别用户所在房间

### 步骤 1.2: 服务端广播 MEMBER_LEFT
- **文件**: `watch-together-server/src/websocket.ts`
- **动作**: 向房间内其他连接发送 `MEMBER_LEFT` 事件（含 userId）
- **验收**: 其他成员收到 `MEMBER_LEFT` 事件，data.userId 为离开者

### 步骤 2.1: 前端监听 MEMBER_LEFT
- **文件**: `watch-together-client/src/hooks/useRoom.ts`
- **动作**: 在 WebSocket 消息处理中添加 `MEMBER_LEFT` 处理
- **验收**: 收到 `MEMBER_LEFT` 后能获取 userId

### 步骤 2.2: 前端从列表移除用户
- **文件**: `watch-together-client/src/hooks/useRoom.ts`
- **动作**: 从 `members` 状态中移除对应用户
- **验收**: `getMembersList()` 不再包含已离开用户
```

#### 步骤 4：按步执行（plan-execute-step）

**技能**：`plan-execute-step`

**动作**（对每个步骤循环）：
- 读取当前步骤（如 1.1）的「做什么」与「该步验收」
- 执行该步动作（改文件、加接口、写测试）
- 验证该步验收（调接口、跑测试、检查文件）
- 通过：提交 `git commit -m 'ralph: TASK-129 步骤 1.1 完成'`
- 未通过：在本步内迭代修复，直到验收通过
- **将本步结论总结追加到 `.ralph/progress.md`**（约定）：**追加到 progress.md 文件末尾**（Session History 段落末尾），勿写入段落开头或 Summary 下；追加 `**Step X.Y completed** - <做了什么>`，以及该步改动要点、验收结果、下一步或阻塞原因

**示例**（步骤 1.1）：
```bash
# 1. 读取步骤 1.1：服务端监听 WebSocket 断开事件
# 2. 修改 watch-together-server/src/websocket.ts
# 3. 验证：断开连接时能识别用户所在房间
# 4. 通过后提交
git add -A && git commit -m 'ralph: TASK-129 步骤 1.1 服务端监听断开事件'
```

#### 步骤 5：跑测试（task-run-test-command）

**技能**：`task-run-test-command`

**动作**：
- 从 RALPH_TASK.md 读取 Test Command：
  ```
  test_command: skill:watch-together-webapp-testing ${TASK_ID}
  ```
- 执行测试命令
- 记录结果到 `.ralph/test-results.log`
- 报告通过/失败

**示例**：
```bash
# 执行 Test Command
skill:watch-together-webapp-testing 129

# 结果写入 .ralph/test-results.log
# 若失败：对应回某一步（如步骤 2.2），在该步上迭代修复
```

**脚本方式**（已由 `ralph-loop-until-tests-pass.sh` 自动执行）：
- 每次迭代后自动跑 Test Command
- 失败时继续迭代直到通过

#### 步骤 6：对照计划审查（task-request-review，可选）

**技能**：`task-request-review`

**动作**：
- 对照 RALPH_TASK.md 的 Description / AC / Implementation Steps
- 逐项检查实现是否满足
- 按严重程度分类：
  - **Critical**：必须修复（AC 未满足）
  - **Major**：建议修复（漏测、边界未覆盖）
  - **Minor**：可选优化（风格、注释）
- 输出问题清单

**示例输出**：
```
## 审查结果

### Critical
- AC #2 未满足：成员列表移除后 UI 未更新（需检查 React 状态更新）

### Major
- 步骤 2.2 缺少边界测试：多个用户同时离开的场景

### Minor
- 代码注释可补充
```

#### 步骤 7：完成与 PR（ralph-finish-branch）

**技能**：`ralph-finish-branch`

**动作**：
- 勾选所有 AC：`backlog task edit 129 --check-ac 1 --check-ac 2 ...`
- 标 Done：`backlog task edit 129 -s Done`
- 提交收尾：`git commit -m 'ralph: TASK-129 Done'`
- 推送分支（按需）：`git push -u origin task/TASK-129`
- 创建 PR（按需）：`gh pr create --head task/TASK-129 --base main ...`

**脚本方式**（已由 `backlog-serial.sh` 完成）：
- 成功时自动推送分支
- 若 `--auto-merge`：自动合并到 main，在 main 上标记 Done
- 若 `--auto-pr`：自动创建 PR

---

## 🎯 使用方式总结

### 方式 1：完整自动化（脚本）

```bash
# 1. 前置流程：从需求到 backlog
./.cursor/ralph-scripts/requirement-workflow.sh --decomposed newneed.md

# 2. 执行流程：串行执行任务
./.cursor/ralph-scripts/backlog-serial.sh --auto-merge
```

### 方式 2：按步骤调用技能（Agent）

**前置流程**：
```
用户："构建一个 TypeScript CLI todo 应用"

Agent：
1. 调用 requirement-clarify → 澄清需求
2. 调用 requirement-to-newneed → 生成 newneed.md
3. 调用 backlog-create-from-decomposed → 创建 backlog 任务
4. 调用 backlog-serial-execute → 串行执行
```

**执行流程**（在 backlog-serial-execute 内部）：
```
Agent（按 ralph-common.sh build_prompt 指引）：
1. 调用 ralph-take-task → 拿任务（脚本已完成）
2. 调用 ralph-open-branch → 开分支（脚本已完成）
3. 调用 spec-refine-and-plan → 细化约定与写计划
4. 调用 plan-execute-step → 按步执行（循环）
5. 调用 task-run-test-command → 跑测试
6. 调用 task-request-review（可选）→ 审查
7. 调用 ralph-finish-branch → 完成与 PR
```

### 方式 3：手动执行单个任务

```bash
# 直接执行单个任务
./.cursor/ralph-scripts/ralph-run-task-branch.sh 129

# 脚本内部会：
# 1. 拿任务（生成 RALPH_TASK.md）
# 2. 开分支（task/TASK-129）
# 3. 运行 Ralph（Agent 按技能执行步骤 3-7）
```

---

## 📚 相关技能索引

### 前置流程技能
- `requirement-clarify` - 需求澄清
- `requirement-to-newneed` - 生成 newneed.md
- `requirement-decompose` - 分解任务（可选）
- `backlog-create-from-decomposed` - 创建 backlog 任务
- `backlog-serial-execute` - 串行执行任务
- `requirement-to-backlog-flow` - 前置流程编排

### 执行流程技能
- `ralph-take-task` - 拿任务
- `ralph-open-branch` - 开分支
- `spec-refine-and-plan` - 细化约定与写计划
- `plan-execute-step` - 按步执行
- `task-run-test-command` - 跑测试
- `task-request-review` - 对照计划审查（可选）
- `ralph-finish-branch` - 完成与 PR
- `openspec-backlog-flow` - 执行流程编排

### 辅助技能
- `backlogmd` - backlog CLI 操作
- `ralph-git-workflow` - Git 分支与 PR 工作流
- `watch-together-webapp-testing` - 前端/浏览器测试

---

## 🔄 流程衔接点

1. **前置流程 → 执行流程**：
   - `backlog-serial-execute` 内部调用 `ralph-run-task-branch.sh`
   - `ralph-run-task-branch.sh` 生成 RALPH_TASK.md 后，Agent 按 `openspec-backlog-flow` 执行

2. **脚本 → 技能**：
   - 脚本完成步骤 1-2（拿任务、开分支）
   - Agent 从步骤 3 起按技能执行（细化约定、按步执行等）

3. **技能 → 脚本**：
   - 技能描述中说明「与脚本的关系」
   - 脚本等价实现已标注，保持向后兼容

---

## 💡 最佳实践

1. **先约定再实现**：步骤 3（细化约定）必须完成后再进入步骤 4（按步执行）
2. **按步验收**：每步完成后验证该步验收，不通过不进入下一步
3. **测试收敛**：步骤 5（跑测试）未通过不进入步骤 7（完成）
4. **证据优先**：用测试结果和验收标准证明完成，不凭口头说明
5. **技能独立**：每个步骤是独立技能，可单独调用、测试、演进

---

## 📖 参考文档

- **前置流程编排**：`.cursor/skills/requirement-to-backlog-flow/SKILL.md`
- **执行流程编排**：`.cursor/skills/openspec-backlog-flow/SKILL.md`
- **Ralph 脚本**：`.cursor/ralph-scripts/`
- **Superpowers 参考**：https://github.com/obra/superpowers
