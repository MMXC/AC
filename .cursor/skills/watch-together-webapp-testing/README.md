# Watch Together Web Application Testing Skill

通用的浏览器端功能测试技能，用于 watch-together 项目。能够根据 backlog task 的描述和测试场景**自动生成并执行**测试（支持 **agent-browser 命令序列** 或 **Playwright 脚本**）。

## 核心特性

✅ **先探查再生成**：推荐先用 agent-browser 打开页面并 `snapshot -i` 查看结构，再根据页面 ref/文案与测试场景生成测试，避免选择器与页面脱节  
✅ **双产出**：可生成 agent-browser 命令（shell 脚本）或 Playwright 测试脚本  
✅ **自动生成**：根据任务描述和测试场景自动生成测试代码或命令  
✅ **通用性**：适用于任何浏览器端功能测试任务，不限于特定任务  
✅ **灵活扩展**：生成的测试可以手动完善和定制

## 推荐流程：先看页面结构，再写测试

1. **打开页面并查看结构**（使用 [agent-browser](.cursor/skills/agent-browser/SKILL.md)）  
   ```bash
   agent-browser open http://localhost:3001/room/<roomId>   # 或首页等
   agent-browser wait --load networkidle
   agent-browser snapshot -i   # 得到可交互元素与 ref（@e1, @e2...）
   ```  
   若有加入/登录表单，可先 `fill`/`click` 再 `snapshot -i` 一次。

2. **根据 snapshot + backlog 测试场景生成测试**  
   - **agent-browser 命令**：按 ref 和文案写出 `open` → `fill`/`click` → `get text`/`screenshot` → `close` 等，保存为 `.sh` 直接运行。  
   - **Playwright 脚本**：运行 `generate-test.py` 生成 Python 脚本；选择器可参考 snapshot 中的角色、文案。

3. **执行测试**  
   - agent-browser：执行生成的 shell 脚本。  
   - Playwright：`python3 .cursor/skills/watch-together-webapp-testing/tests/test-task-<id>.py`。

**示例脚本**：`templates/agent-browser-recon-and-test.sh`（先 open → wait → snapshot -i，再按 ref 填写/点击、get text、screenshot、close；可根据实际 snapshot 修改 ref）。

**换行符**：所有 `templates/*.sh` 使用 **LF**（Unix 换行），以便在 WSL/Git Bash 下正常执行。仓库已通过 `.gitattributes` 的 `.cursor/skills/**/*.sh text eol=lf` 统一；若在 Windows 编辑后出现 `bad interpreter` 或语法错误，可用 `sed -i 's/\r$//' 脚本名` 或编辑器「以 LF 保存」修复。

## 快速开始

### 1. 在 backlog task 中指定测试技能

在 backlog task 的 `**Test Command**` 字段中指定：

```markdown
**Test Command**: `skill:watch-together-webapp-testing TASK-<id>`
```

### 2. 提供测试场景（可选但推荐）

在 backlog task 的 Description 中添加测试场景：

```markdown
**测试用例**:

**测试场景**:
1. 点击"开始共享"按钮后浏览器弹出屏幕/标签页选择对话框
2. 选择内容后，本地预览 <video> 可以实时显示采集到的画面
3. 点击"停止共享"后，预览 <video> 停止播放且 MediaStream 轨道已关闭
```

### 3. 运行 ralph-run-task-branch

```bash
ralph-run-task-branch.sh <task-id>
```

脚本会自动：
1. 从 backlog task 读取任务描述和测试场景
2. 生成 RALPH_TASK.md
3. 识别技能引用格式 `skill:watch-together-webapp-testing TASK-<id>`
4. **自动生成测试脚本**（如果不存在；可选先跑 agent-browser snapshot 再生成）
5. 执行测试并返回结果

## 两种测试产出

| 产出 | 适用 | 生成方式 | 运行方式 |
|------|------|----------|----------|
| **agent-browser 命令** | 快速验证、CLI 友好、与 snapshot ref 一致 | 根据 snapshot + 测试场景手写或由 AI 生成 | 直接执行 shell 命令或 `.sh` 脚本 |
| **Playwright 脚本** | CI、批量、双浏览器等复杂场景 | `generate-test.py` 根据任务/场景生成 | `python3 tests/test-task-<id>.py` |

建议：先 `agent-browser open` + `snapshot -i` 拿到页面结构，再决定用 agent-browser 命令还是 Playwright，或两者都生成。

## 测试脚本生成

测试脚本会自动生成在 `.cursor/skills/watch-together-webapp-testing/tests/` 目录下：

- `test-task-32.py` - 自动生成的 TASK-32 测试脚本
- `test-task-<id>.py` - 其他任务的自动生成测试脚本

如果测试脚本已存在，会直接使用现有脚本；如果不存在，会自动生成。

## 测试结果图片与归档

- **保存位置**：测试截图按任务保存在单独文件夹中：`backlog/test-results/task-<id>/`（例如 `backlog/test-results/task-32/`）。
- **关联到归档**：任务完成时，`finalize_completed_task` 会扫描该目录下的 `.png` 文件，并在 **Implementation Notes**（任务归档内容）的「**测试通过 (Test Passed)**」条目下列出所有截图链接。
- **效果**：在 backlog 任务笔记或 `backlog/docs/task-<id>-ralph-task.md` 中可看到测试时间与截图链接，便于追溯和审查。

## 手动运行测试

### 方式 1: 使用技能运行器（自动生成 + 运行）

```bash
# 自动生成测试脚本（如果不存在）并运行
.cursor/skills/watch-together-webapp-testing/run-test.sh TASK-32

# 指定 RALPH_TASK.md 路径（用于生成更准确的测试）
.cursor/skills/watch-together-webapp-testing/run-test.sh TASK-32 /path/to/RALPH_TASK.md
```

### 方式 2: 手动生成测试脚本

```bash
# 从 backlog task 生成
python3 .cursor/skills/watch-together-webapp-testing/generate-test.py TASK-32

# 从 RALPH_TASK.md 生成
python3 .cursor/skills/watch-together-webapp-testing/generate-test.py TASK-32 /path/to/RALPH_TASK.md
```

### 方式 3: 直接运行已生成的测试脚本

```bash
# 确保 docker-compose 服务正在运行
docker-compose ps

# 运行测试
python3 .cursor/skills/watch-together-webapp-testing/tests/test-task-32.py
```

## 项目配置

- **前端**: `http://localhost:3001`
- **后端 API**: `http://localhost:3000`
- **启动方式**: `docker-compose up -d`

## 测试限制

由于 `getDisplayMedia()` 需要用户交互来选择屏幕/标签页，测试采用**半自动化**方式：

1. **自动化部分**：
   - 按钮存在性和可见性检查
   - DOM 状态验证
   - MediaStream 轨道状态检查
   - 错误处理验证

2. **手动部分**：
   - 屏幕/标签页选择对话框（用户需要手动选择）

3. **验证部分**：
   - 预览视频是否正确显示
   - MediaStream 是否正确关闭

## 技能引用格式

### 在 backlog task 中

```markdown
**Test Command**: `skill:watch-together-webapp-testing TASK-32`
```

### 在 RALPH_TASK.md 的 frontmatter 中

```yaml
---
backlog_id: backlog-32
task: 房主端实现屏幕/标签页采集预览（getDisplayMedia）
test_command: "skill:watch-together-webapp-testing TASK-32"
---
```

## 测试场景格式

为了生成更准确的测试脚本，建议在 backlog task 的 Description 中提供测试场景：

```markdown
**测试用例**:

**测试场景**:
1. 点击"开始共享"按钮后浏览器弹出屏幕/标签页选择对话框
2. 选择内容后，本地预览 <video> 可以实时显示采集到的画面
3. 点击"停止共享"后，预览 <video> 停止播放且 MediaStream 轨道已关闭
4. 多次开始/停止共享不会造成异常
```

技能会根据这些场景自动生成相应的测试代码。

## 支持的测试场景类型

- **按钮交互**：自动识别并点击按钮
- **视频元素**：检查视频播放状态
- **对话框/弹出窗口**：处理用户交互需求
- **MediaStream**：验证媒体流状态
- **通用场景**：生成基础测试框架供手动完善

## 参考

- **agent-browser 技能**：`.cursor/skills/agent-browser/SKILL.md`（先打开页面、snapshot 查看结构，再编写/生成测试命令）
- 基础技能：`.cursor/skills/webapp-testing/SKILL.md`
- Playwright 文档：https://playwright.dev/python/
- getDisplayMedia API：https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia
