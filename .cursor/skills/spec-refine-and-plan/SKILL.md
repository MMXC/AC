---
name: spec-refine-and-plan
description: 细化任务约定并写出可执行的实现计划（含每步验收）。Ralph 流程第三步，对应 Superpowers 的 brainstorming + writing-plans。当需要「细化约定」「写实现计划」「先约定再实现」时使用。
---

# 细化约定与写计划（Spec Refine and Plan）

本技能是 **Ralph 任务流程的第三步**：在动手写代码前，把「要做什么、验收条件、实现步骤与每步验收」写清楚，产出可被 **plan-execute-step** 按步执行的计划。对应 Superpowers 的 **brainstorming**（澄清与细化）与 **writing-plans**（拆成带验收的小步骤）。

## 触发场景

- "细化约定"、"写实现计划"、"先约定再实现"
- 流程编排指示「步骤 3：细化约定与写计划」时
- RALPH_TASK.md 尚无「Implementation Steps」或尚无**每步验收**

## 输入

- 当前任务的 **Description**、**Acceptance Criteria**、**Test Command**（来自 RALPH_TASK.md 或 backlog）。

## 必做动作

1. **细化 Description / AC**（如需要）：
   - 确认任务里已有清晰的 Description（做什么、范围、约束）和可逐条勾选的 AC。
   - 没有则补：`backlog task edit <id> -d "..." --ac "..."`，并同步到 RALPH_TASK.md 或任务文件。

2. **写出 Implementation Steps（实现步骤）**：
   - 将任务拆成 **2–5 分钟粒度** 的小步骤（如 1.1 加路由、1.2 写 handler、2.1 写测试、2.2 跑 Test Command）。
   - 每一步必须包含：
     - **做什么**：简短动作描述。
     - **涉及文件/接口**：尽量写出文件路径、接口名或数据模型要点。
     - **该步验收**：可验证的「完成条件」（如「1.1 完成当：GET /api/v1/rooms 返回 200」；「2.1 完成当：npm run test:api 通过」）。

3. **写入可被消费的载体**：
   - 将上述「实现步骤 + 每步验收」写入 **RALPH_TASK.md** 的「Implementation Steps」小节，或任务的 Implementation Notes / plan，以便 **plan-execute-step** 和 Agent 按步执行、按步验证。

4. **不写实现代码**：本技能只产出计划与验收标准，不写业务代码。

## 验收标准（本技能完成）

- RALPH_TASK.md（或任务正文）中已有「Implementation Steps」。
- 每一步都有明确的「该步验收」条件。
- 后续步骤可以据此执行并判断「当前步是否完成」。

## 相关技能

- **plan-execute-step**：下一步，按步执行并验证每步验收。
- **requirement-clarifier**：若任务描述模糊，可先做需求澄清再写计划。
- **backlogmd**：编辑任务 AC、plan、notes。

## 完成标准

- 实现步骤与每步验收已写清并写入 RALPH_TASK.md（或约定位置）。
- 细化约定完成，可进入「按步实现」。
