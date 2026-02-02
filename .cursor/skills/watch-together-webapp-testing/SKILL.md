---
name: watch-together-webapp-testing
description: 通用的浏览器端功能测试技能，用于 watch-together 项目。项目通过 docker-compose 启动，前端在 localhost:3001。先打开页面查看结构（agent-browser snapshot），再根据 backlog 测试场景生成 agent-browser 命令或 Playwright 脚本并执行。
license: Complete terms in LICENSE.txt
---

# Watch Together Web Application Testing

通用的浏览器端功能测试技能，用于 watch-together 项目。能够根据任务描述和测试场景自动生成并执行测试。

## 推荐流程：先探查页面结构，再编写测试

1. **打开页面并查看结构**（使用 agent-browser，见 `.cursor/skills/agent-browser/SKILL.md`）  
   - 打开目标 URL（如房间页、首页）：`agent-browser open http://localhost:3001/room/<roomId>` 或 `agent-browser open http://localhost:3001`  
   - 等待加载：`agent-browser wait --load networkidle`  
   - 获取可交互元素与 refs：`agent-browser snapshot -i`（或 `snapshot -i --json` 便于解析）  
   - 若有登录/加入表单，可先填写并提交，再对结果页做一次 snapshot  

2. **根据页面结构 + backlog 测试场景生成测试**  
   - 依据 snapshot 中的 ref（如 `@e1`、`@e2`）和文案（按钮名、占位符等）确定操作对象  
   - 产出二选一或并存：  
     - **agent-browser 命令序列**：写成 shell 脚本（`open` → `wait` → `fill`/`click` 等 → `get text`/`screenshot` → `close`），可直接运行  
     - **Playwright 脚本**：沿用现有 `generate-test.py` 生成 Python 脚本，选择器可参考 snapshot 中的角色、文案、ref 对应关系  

3. **执行测试**  
   - agent-browser：直接执行生成的 shell 命令或脚本  
   - Playwright：`python3 .cursor/skills/watch-together-webapp-testing/tests/test-task-<id>.py`  

这样可避免选择器与页面脱节，提高测试可维护性。

**示例模板**：`templates/agent-browser-recon-and-test.sh`（先 open → wait → snapshot -i，再按 ref 填写/点击、get text、screenshot、close；ref 需根据实际 snapshot 修改）。

## 项目配置

- **前端**: `http://localhost:3001`
- **后端 API**: `http://localhost:3000`
- **启动方式**: `docker-compose up -d`（服务已在运行）

## 使用方式

### 1. 在 backlog task 中指定测试技能

在 backlog task 的 `**Test Command**` 中指定（使用占位符，避免写死任务 ID）：

```
**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`
```

`${TASK_ID}` 会在运行时替换为 backlog 分配的任务 ID（如 TASK-42）。由于 backlog 自动创建任务时 ID 不固定，不应写死 TASK-32 等。

或在 RALPH_TASK.md 的 frontmatter 中：

```yaml
---
test_command: "skill:watch-together-webapp-testing ${TASK_ID}"
---
```

### 2. 技能工作原理

技能会（推荐先探查再生成）：

1. **可选：先探查页面结构**  
   - 使用 agent-browser：`open` 目标 URL → `wait --load networkidle` → `snapshot -i`（或 `--json`）  
   - 根据 snapshot 中的 ref（如 `@e1`、`@e2`）和文案确定要操作的元素  

2. **读取任务与场景**  
   - 读取 backlog task 或 RALPH_TASK.md  
   - 提取测试场景和测试用例  

3. **生成测试**（二选一或并存）  
   - **agent-browser 命令**：按 snapshot 的 ref 和文案，写出 `agent-browser open/fill/click/get text/screenshot/close` 等命令序列（可保存为 `.sh` 脚本）  
   - **Playwright 脚本**：根据测试场景自动生成 Python 测试脚本；选择器可参考 snapshot 中的角色、文案或对应 ref  

4. **执行测试并返回结果**  
   - 运行生成的 agent-browser 脚本或 `python3 tests/test-task-<id>.py`

### 3. 测试场景格式

在 backlog task 的 Description 中提供测试场景：

```markdown
**测试用例**:

**测试场景**:
1. 点击"开始共享"按钮后浏览器弹出屏幕/标签页选择对话框
2. 选择内容后，本地预览 <video> 可以实时显示采集到的画面
3. 点击"停止共享"后，预览 <video> 停止播放且 MediaStream 轨道已关闭
4. 多次开始/停止共享不会造成异常
```

技能会根据这些场景自动生成测试代码。

### 3. 自动生成测试脚本

技能会自动根据任务描述和测试场景生成测试脚本：

1. **读取任务信息**：从 backlog task 或 RALPH_TASK.md 读取任务描述
2. **提取测试场景**：从 `**测试场景**` 部分提取测试用例
3. **生成测试代码**：根据场景自动生成 Playwright 测试脚本
4. **执行测试**：运行生成的测试脚本

如果测试脚本不存在，运行器会自动调用 `generate-test.py` 生成。

## 测试限制

### getDisplayMedia 的限制

由于 `getDisplayMedia()` 需要用户交互来选择屏幕/标签页，完全自动化测试存在限制：

1. **Chromium**: 可以使用特定 flags 在非 headless 模式下测试，但仍需要用户手动选择屏幕源
2. **WebKit/Firefox**: 不支持自动化测试

### 推荐测试策略

1. **半自动化测试**：
   - 自动化可测试部分：按钮存在性、DOM 状态、错误处理
   - 手动部分：屏幕选择对话框（用户手动选择）
   - 自动化验证：预览视频显示、MediaStream 关闭状态

2. **使用非 headless 模式**：
   - 必须使用 `headless=False`
   - 添加必要的 Chrome flags 来模拟权限接受

## 支持的测试场景类型

技能能够识别并自动生成以下类型的测试：

1. **按钮交互测试**：识别包含"按钮"的场景，自动查找并点击
2. **视频元素测试**：识别包含"视频"、"预览"的场景，检查视频播放状态
3. **对话框测试**：识别包含"对话框"、"弹出"的场景，处理用户交互
4. **MediaStream 测试**：识别包含"停止"、"关闭"的场景，验证 MediaStream 状态
5. **通用场景**：其他场景会生成基础测试框架，需要手动完善

## 测试脚本生成规则

- **优先使用页面结构**：若已用 agent-browser 做过 `snapshot -i`，优先用 snapshot 中的 ref（`@e1`、`@e2`）或角色/文案生成 agent-browser 命令；生成 Playwright 时可将 ref 对应到 `role`、`text=`、`placeholder=` 等选择器  
- **按钮测试**：自动提取按钮文本，使用 `button:has-text()` 或 agent-browser `find role button click --name "..."`  
- **视频测试**：检查多个常见选择器（`video#videoStream`, `video[srcObject]` 等）或 agent-browser `get text "#videoPlaceholder"`  
- **权限相关**：如果场景涉及权限，自动添加相应的浏览器 flags 和权限设置  
- **用户交互**：如果涉及 `getDisplayMedia` 等 API，使用非 headless 模式并等待用户操作

## 运行测试

### 方式 1: 通过技能引用（推荐）

在 backlog task 或 RALPH_TASK.md 中指定：

```yaml
---
test_command: "skill:watch-together-webapp-testing TASK-32"
---
```

然后运行：

```bash
ralph-run-task-branch.sh 32
# 或
ralph-loop-until-tests-pass.sh
```

### 方式 2: 手动运行技能运行器

```bash
# 自动生成并运行测试
.cursor/skills/watch-together-webapp-testing/run-test.sh TASK-32

# 指定 RALPH_TASK.md 路径
.cursor/skills/watch-together-webapp-testing/run-test.sh TASK-32 /path/to/RALPH_TASK.md
```

### 方式 3: 手动生成测试脚本

```bash
# 生成测试脚本
python3 .cursor/skills/watch-together-webapp-testing/generate-test.py TASK-32

# 运行生成的测试脚本
python3 .cursor/skills/watch-together-webapp-testing/tests/test-task-32.py
```

## 参考

- **agent-browser 技能**：`.cursor/skills/agent-browser/SKILL.md`（先 `open` → `snapshot -i` 查看页面结构，再编写/生成测试命令）
- 基础技能：`.cursor/skills/webapp-testing/SKILL.md`
- Playwright 文档：https://playwright.dev/python/
- getDisplayMedia API：https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia
