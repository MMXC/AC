---
name: backlog-task-md-to-json
description: Convert Backlog.md task markdown (backlog/tasks/task-<id>*.md) into a stable JSON object and optionally generate RALPH_TASK.md content. Use when the user asks to “md转json”, “task转json”, “逆向json”, “生成RALPH_TASK”, or when parsing Backlog task files reliably is needed.
---

# Backlog Task Markdown → JSON

## 目标

把 `backlog/tasks/task-<id>*.md`（Backlog.md 的任务文件）稳定解析成结构化 JSON，避免用脆弱的字符串切片/awk 依赖运行环境差异。

可选：基于 JSON 生成 `RALPH_TASK.md`（frontmatter + Success Criteria checkboxes）。

## 输入

- 单个任务文件路径（优先）：`backlog/tasks/task-<id>*.md`
- 或用户给的 `TASK-<id>`，需要先定位到对应文件

## 输出 JSON 规范（稳定字段）

输出一个 JSON 对象（**字段名固定**）：

- **id**: `"TASK-56"`
- **title**: 任务标题
- **status**: `"To Do" | "In Progress" | "Done"`（来自 frontmatter）
- **created_date / updated_date**: 字符串（来自 frontmatter，如存在）
- **labels**: string[]（来自 frontmatter）
- **dependencies**: string[]（来自 frontmatter，形如 `["TASK-55"]`）
- **description**: 描述正文（优先 DESCRIPTION section；无则退化为 `## Description` 区块）
- **test_command**: 从 description 中提取 `**Test Command**: \`...\`` 的反引号内容；提取不到则空字符串
- **acceptance_criteria**: string[]（每条去掉 `- [ ]` / `- [x]`、保留 `#1` 文本或去掉编号都行，但要一致；推荐保留原文）
- **source_path**: 解析来源文件路径

> 一致性原则：**宁可少字段，也不要字段含义漂移**。

## 解析规则（按优先级）

### 1) Frontmatter（`---` 包围）

- `id:` → `id`
- `title:` → `title`
- `status:` → `status`
- `labels:` → `labels`（`[]` 或列表）
- `dependencies:` → `dependencies`（`[]` 或列表）
- 其它字段可按需补充，但不要改变上面的字段名

### 2) Description

优先取：
- `<!-- SECTION:DESCRIPTION:BEGIN -->` 与 `<!-- SECTION:DESCRIPTION:END -->` 之间的内容（去掉包围注释）

取不到再退化为：
- `## Description` 标题到下一个 `## ` 标题之间的内容

### 3) Acceptance Criteria

优先取：
- `<!-- AC:BEGIN -->` 与 `<!-- AC:END -->` 之间的所有 checkbox 行（匹配 `- [ ]` / `- [x]`）

取不到则判定“任务文件格式不符合 Backlog 约定”，输出错误并指出文件路径与缺失点（不要瞎猜）。

### 4) Test Command 提取

从 `description` 中用正则提取：
- `**Test Command**: \`([^`]+)\``

提取不到则 `test_command: ""`

## 生成 RALPH_TASK.md（可选）

当用户要求“生成 RALPH_TASK.md”时，用 JSON 生成：

frontmatter:
- `backlog_id: backlog-<numeric>`（若能从 `id` 提取数字）
- `task: <title>`
- `test_command: "<test_command>"`

正文：
- `# Task: <title>`
- `## Description`：放 `description`
- `## Success Criteria`：把 `acceptance_criteria` 转成 `- [ ] ...`（全部置为未完成）

## 快速检查清单

- [ ] `id/title/status/dependencies` 解析正确
- [ ] `description` 不包含包围注释标记
- [ ] `acceptance_criteria` 数量与原文件一致
- [ ] `test_command` 能提取则提取，不能则空字符串

## 示例（来自 Backlog 任务文件）

输入：`backlog/tasks/task-56 ... .md`

输出（示意，字段必须齐全）：

```json
{
  "id": "TASK-56",
  "title": "优化创建房间页面设计（index.html）- 动画与微交互",
  "status": "To Do",
  "labels": [],
  "dependencies": [],
  "description": "为 `watch-together/index.html` 页面添加优雅的动画效果和微交互。...",
  "test_command": "cd watch-together && python -m http.server 8000",
  "acceptance_criteria": [
    "#1 添加页面加载动画：容器和表单元素错落式出现（使用 animation-delay）",
    "#2 优化按钮交互动画：悬停、点击、禁用状态的过渡效果"
  ],
  "source_path": "backlog/tasks/task-56 - ..."
}
```

