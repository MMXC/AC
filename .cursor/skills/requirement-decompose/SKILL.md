---
name: requirement-decompose
description: 正交分解需求为可测试的原子子任务。前置流程可选步骤。当需要「分解需求」「拆分子任务」时使用；与 requirement-decomposer 配合。
---

# 分解任务（Requirement Decompose）

本技能是 **前置流程的可选步骤**：将澄清后的需求正交分解为可测试的原子子任务，确保每个子任务都有明确的测试通过标准。可在 **requirement-to-newneed** 内部调用，或独立使用。

## 触发场景

- "分解这个需求"、"拆分子任务"、"正交分解"
- 流程编排指示「可选步骤：分解任务」时
- 需求已澄清，需要拆分为可并行执行的子任务

## 输入

- **澄清后的需求**：来自 **requirement-clarify** 的结构化需求

## 必做动作

1. **需求分析**：
   - 理解用户需求的完整上下文
   - 识别功能模块、依赖关系

2. **正交分解**：
   - 将需求拆分为相互独立、可并行执行的子任务（正交原则：任务之间无依赖）
   - 每个子任务应该是不可再分的单元（原子性）
   - 有明确的输入和输出

3. **定义测试标准**：
   - 为每个子任务定义：
     - **测试命令**：可执行的测试命令（自包含，包含所有前置条件）
     - **成功标准**：明确的验收条件（Success Criteria）
   - 测试结果应该是二元的（通过/失败）
   - 测试应该可以自动化执行

4. **输出任务列表**：
   - 生成结构化的任务列表（含 ID、标题、描述、测试命令、成功标准、依赖）
   - 供 **requirement-to-newneed** 写入 newneed.md，或供 **backlog-create-from-decomposed** 直接创建 backlog 任务

## 分解原则

- **正交性**：子任务之间应该相互独立，可以并行执行，无依赖关系
- **原子性**：每个子任务应该是不可再分的单元，有明确的完成标准
- **可测试性**：每个子任务必须有明确的测试命令，测试结果应该是二元的

## 测试命令规范

- **自包含**：测试命令应包含所有必要的前置条件（如启动服务、设置环境变量）
- **数据库相关**：使用 `docker compose exec` 在容器内执行，或内联环境变量
- **API 测试**：确保服务启动后再测试，脚本需等待 API 就绪
- **前端 E2E**：使用技能占位符 `skill:watch-together-webapp-testing ${TASK_ID}`

## 与脚本的关系

- `requirement-workflow.sh` 在非 `--decomposed` 模式下会调用 `decompose_requirement.py` 进行分解。
- 本技能供「按步调用技能」的前置流程使用：可在 **requirement-to-newneed** 内部调用，或独立使用后再写入 newneed.md。

## 相关技能

- **requirement-decomposer**：更完整的分解流程（含验证正交性、生成 backlog 格式）。
- **requirement-clarify**：上一步，需求澄清。
- **requirement-to-newneed**：下一步，将分解结果写入 newneed.md。

## 完成标准

- 需求已正交分解为可测试的原子子任务。
- 每个子任务都有明确的测试命令和成功标准。
- 任务列表已输出，可写入 newneed.md 或直接创建 backlog 任务。
