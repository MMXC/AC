---
name: backlog-create-from-decomposed
description: 从 newneed.md 或已分解任务创建 backlog To Do 任务列表。前置流程第三步。当需要「创建 backlog 任务」「从分解结果创建任务」时使用；调用 backlog CLI。
---

# 创建 Backlog 任务（Backlog Create from Decomposed）

本技能是 **前置流程的第三步**：从 `newneed.md`（或已分解的任务 JSON）读取任务列表，使用 backlog CLI 批量创建 backlog To Do 任务。

## 触发场景

- "创建 backlog 任务"、"从 newneed.md 创建任务"、"批量创建任务"
- 流程编排指示「前置步骤 3：创建 backlog 任务」时
- newneed.md 已生成，需要创建 backlog 任务供后续执行

## 输入

- **newneed.md**：包含任务结构的文件（由 **requirement-to-newneed** 生成）
- **或：已分解任务 JSON**：若任务已解析为 JSON 格式

## 必做动作

1. **解析任务**：
   - 使用 `parse-decomposed-tasks.py` 解析 `newneed.md`，提取任务列表（ID、标题、描述、测试命令、成功标准、依赖等）

2. **展示任务摘要**：
   - 列出所有任务（ID、标题、测试命令、成功标准数量）
   - 等待用户确认（除非流程配置为自动确认）

3. **创建 backlog 任务**：
   - 对每个任务，使用 **backlogmd** 技能执行：
     ```bash
     backlog task create "<标题>" \
       -d "<描述>" \
       --ac "<成功标准 1>" \
       --ac "<成功标准 2>" \
       ...
     ```
   - 若任务有测试命令，写入任务的 Test Command 字段（通过 backlog CLI 或直接编辑任务文件）
   - 若任务有依赖，记录依赖关系（可通过标签或任务关联）

4. **记录创建结果**：
   - 统计成功创建的任务数量
   - 记录创建的任务 ID 列表
   - 若创建失败，记录失败原因

## 与脚本的关系

- `requirement-workflow.sh --decomposed newneed.md` 会执行本技能的动作：解析 newneed.md、展示摘要、用户确认、批量创建 backlog 任务。
- 本技能供「按步调用技能」的前置流程使用：在 **requirement-to-newneed** 之后、**backlog-serial-execute** 之前调用。

## 相关技能

- **backlogmd**：`backlog task create` 的创建、编辑、列表。
- **requirement-to-newneed**：上一步，生成 newneed.md。
- **backlog-serial-execute**：下一步，串行执行 backlog 任务。

## 完成标准

- 已从 newneed.md 解析任务列表。
- 已使用 backlog CLI 批量创建 To Do 任务。
- 创建结果已记录（成功数量、任务 ID 列表）。
