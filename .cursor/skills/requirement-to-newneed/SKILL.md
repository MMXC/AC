---
name: requirement-to-newneed
description: 从自然语言需求出发，先澄清、再正交拆分，最后以 parse-decomposed-tasks.py 可解析的「任务 N」格式写入 newneed.md，供 requirement-workflow.sh --decomposed 使用。
---

# Requirement → newneed.md 工作流

## 触发条件

- 用户说“把这个需求拆成任务写进 newneed.md”
- 用户想直接用 `requirement-workflow.sh --decomposed newneed.md` 创建 backlog 任务

## 步骤

1. **澄清需求（可选）**  
   - 参考 `requirement-clarifier`，补齐：
     - 技术栈、范围、约束、用户场景
   - 生成一段「需求概要」，写在 `newneed.md` 顶部。

2. **正交分解需求**  
   - 参考 `requirement-decomposer`，先在对话里列出若干原子任务：
     - 每个任务有：标题 + 描述 + 测试命令 + 若干成功标准；
   - 理清依赖关系（尽量少，必要时用 ID 表达）。

3. **按下述模板转成“任务 N” Markdown 结构并写入 newneed.md**

   对每个任务生成（示例）：

   ### 任务 1: 任务标题

   - **ID**: webrtc-a1
   - **描述**: 任务的详细描述……
   - **测试命令**: `npm test -- webrtc-a1`  # 无自动命令时可写 `手动：...`
   - **成功标准**:
     1. [ ] 标准 1
     2. [ ] 标准 2
   - **测试用例**:
     - **测试数据**: 无
     - **测试场景**:
       1. 场景描述 1
     - **断言示例**: 无
   - **依赖**: 无 / webrtc-a1, webrtc-b2

   **模板要求：**

   - 标题用 `### 任务 N: ...`，N 从 1 递增；
   - “成功标准”必须是 `1. [ ] ...` 形式的有序列表（方便 parse-decomposed-tasks.py 提取）；
   - 字段名必须是：`**ID**`、`**描述**`、`**测试命令**`、`**成功标准**`、`**测试用例**`、`**依赖**`；
   - 没有内容时写“无”，不要省略字段。

4. **提示用户运行工作流**  

   在写完 `newneed.md` 后，提示用户可执行：

   ./.cursor/ralph-scripts/requirement-workflow.sh --decomposed newneed.md
   