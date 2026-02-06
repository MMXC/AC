---
name: requirement-to-newneed
description: 将澄清后的需求按格式写入 newneed.md（含需求概要与任务结构）。前置流程第二步。当需要「生成 newneed.md」「写需求文档」时使用；供 requirement-workflow.sh --decomposed 使用。
---

# 生成 newneed.md（Requirement to newneed.md）

本技能是 **前置流程的第二步**：将澄清后的需求（来自 **requirement-clarify**）按 `parse-decomposed-tasks.py` 可解析的格式写入 `newneed.md`，供后续 `requirement-workflow.sh --decomposed newneed.md` 使用。

## 触发场景

- "生成 newneed.md"、"把这个需求写进 newneed.md"、"创建需求文档"
- 流程编排指示「前置步骤 2：生成 newneed.md」时
- 需求已澄清，需要格式化为可被解析的任务结构

## 输入

- **澄清后的需求**：来自 **requirement-clarify** 或用户直接提供的结构化需求
- **可选：已分解的任务列表**：若需求已通过 **requirement-decompose** 分解，可直接使用

## 必做动作

1. **写入需求概要**（如需要）：
   - 在 `newneed.md` 顶部写入需求概要（技术栈、范围、约束等）
   - **记录需求类型**：从 **requirement-clarify** 获取 `type` 字段（`feature | page | infra | chore`），写入需求概要

2. **生成任务结构**：
   - 若需求尚未分解：先通过 **requirement-decompose** 正交分解为原子子任务
   - 对每个任务生成以下格式：

   ```markdown
   ### 任务 N: 任务标题

   - **ID**: task-id
   - **描述**: 任务的详细描述……
   - **测试命令**: `npm test -- task-id`  # 无自动命令时可写 `手动：...`
   - **成功标准**:
     1. [ ] 标准 1
     2. [ ] 标准 2
   - **测试用例**:
     - **测试数据**: 无
     - **测试场景**:
       1. 场景描述 1
     - **断言示例**: 无
   - **依赖**: 无 / task-id-1, task-id-2
   ```

3. **格式要求**：
   - 标题用 `### 任务 N: ...`，N 从 1 递增
   - "成功标准"必须是 `1. [ ] ...` 形式的有序列表（方便 `parse-decomposed-tasks.py` 提取）
   - 字段名必须是：`**ID**`、`**描述**`、`**测试命令**`、`**成功标准**`、`**测试用例**`、`**依赖**`
   - 没有内容时写"无"，不要省略字段

4. **写入文件**：
   - 将完整内容写入 `newneed.md`（项目根目录）

5. **提示后续设计步骤**（当 `type ∈ {feature, page}` 时）：
   - 在 `newneed.md` 末尾添加占位章节，提示后续步骤 2a 和 2b 将补充设计文档：
   
   ```markdown
   ## Visual Specs (JSON Canvas)
   
   > 待步骤 2a 生成：需求可视化建模（用例图/用户流程图）
   > 文件将保存到：`designs/canvas/<need-id>-*.canvas`
   
   ## UI / UX Design System
   
   > 待步骤 2b 生成：UI/UX 设计系统文档
   > 文件将保存到：`designs/ui/<need-id>-design-system.md`
   ```
   
   - 这些占位章节将在步骤 2a 和 2b 执行时被实际内容替换

## 与脚本的关系

- `requirement-workflow.sh --decomposed newneed.md` 会读取本技能生成的 `newneed.md`，解析后创建 backlog 任务。
- 本技能供「按步调用技能」的前置流程使用：在 **requirement-clarify** 之后、**backlog-create-from-decomposed** 之前调用。

## 相关技能

- **requirement-clarify**：上一步，需求澄清（输出需求类型 `type`）。
- **requirement-decompose**：可选，若需求未分解则先调用此技能。
- **json-canvas**：步骤 2a，需求可视化建模（用例图/用户流程图）。
- **ui-ux-pro-max**：步骤 2b，UI/UX 设计系统生成。
- **backlog-create-from-decomposed**：下一步，从 newneed.md 创建 backlog 任务。

## 完成标准

- `newneed.md` 已生成，包含需求概要（如需要）和任务结构。
- 格式符合 `parse-decomposed-tasks.py` 的解析要求。
