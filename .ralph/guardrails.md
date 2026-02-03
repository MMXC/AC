# Ralph Guardrails (Signs)

> Lessons learned from past failures. READ THESE BEFORE ACTING.

## Core Signs

### Sign: Read Before Writing
- **Trigger**: Before modifying any file
- **Instruction**: Always read the existing file first
- **Added after**: Core principle

### Sign: Test After Changes
- **Trigger**: After any code change
- **Instruction**: Run tests to verify nothing broke
- **Added after**: Core principle

### Sign: Commit Checkpoints
- **Trigger**: Before risky changes
- **Instruction**: Commit current working state first
- **Added after**: Core principle

---

## Learned Signs

### Sign: No Interactive Commands
- **Trigger**: Before running any command that might require user input
- **Instruction**: NEVER run commands that require interactive input (git push, npm login, password prompts, etc.). These will block execution indefinitely. Only commit locally, never push.
- **Added after**: Session blocking on git push authentication (2026-01-25)

### Sign: Must Create Files
- **Trigger**: At the start of EVERY session
- **Instruction**: You MUST create at least one file in each session. Do NOT just read files and exit. Start with the first unchecked criterion and immediately create the required files. If the first criterion is "create package.json", then CREATE package.json file with actual content right away.
- **Added after**: Multiple sessions (20+) finishing without creating any files (2026-01-25)

### Sign: Generator Code vs Generated Code
- **Trigger**: When editing a code generator (e.g. generate-test.py) that both emits source strings and uses the same names (e.g. `os`) in its own logic
- **Instruction**: Ensure every module used in the generator's own code (e.g. `os.path.join`, `os.chmod`) is imported at the top of the generator file. Imports inside the generated string do not satisfy the running script.
- **Added after**: Iteration 2 - generate-test.py NameError (os not defined) at line 90 (2026-02-01)

### Sign: WebSocket 行为与测试环境脱钩时不要过度补丁
- **Trigger**: 当后端数据库与 API 已确认状态正确（例如房间成员列表包含新成员），但浏览器自动化测试中 WebSocket 驱动的 UI 状态长期与之不一致，且多次代码调整（前端/后端/轮询/测试脚本兜底）仍无法让测试通过
- **Instruction**: 将精力优先放在验证服务端与核心数据结构的正确性（如直接查询数据库、调用 HTTP API），不要持续叠加复杂前端兜底逻辑或将测试脚本写成“第二套业务实现”。在确认是环境/多连接/时序问题后，应记录现象与验证步骤，更新 backlog/文档并交由人工或后续更适合的代理处理，而不是继续引入高复杂度补丁。
- **Added after**: Iteration 3 - TASK-131 成员列表在数据库与 API 中正确，但 WebSocket/浏览器自动化环境下房主端列表始终不显示新成员，多轮前端/测试修改仍无法让测试通过 (2026-02-03)

