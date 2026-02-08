---
backlog_id: backlog-141
task: 按组件组合拆分页面与数据获取
test_command: "手动：代码审阅 + 运行时检查无多余串行请求"
---

# Task: 按组件组合拆分页面与数据获取

## Description

将现有页面拆分为可组合的组件（如创建房间、房间内、侧边栏、聊天、共享浏览区等）；数据获取按 vercel-react-best-practices：独立请求用 Promise.all/并行，有依赖的用 better-all 或先发请求再 await；若使用 RSC，则用组件组合实现并行 fetch，避免 waterfall。文档化每个页面的组件树与数据流。

**Test Command**: `手动：代码审阅 + 运行时检查无多余串行请求`

**Test Command**: `手动：代码审阅 + 运行时检查无多余串行请求`

## Success Criteria

- [x] #1 主要页面均由多个可复用组件组合而成
- [x] #2 数据获取无不必要的串行等待（符合 vercel-react-best-practices 第 1、3 类规则）
- [x] #3 组件边界与数据依赖在文档或注释中可追溯

## Implementation Steps

1. **1.1 文档化页面组件树与数据流** — done when: 存在 `watch-together/docs/component-tree-and-data-flow.md`，描述 index（创建房间页）、join（房间内页）的组件树、各区块与脚本对应关系、数据依赖与请求顺序（并行/串行及理由）。
2. **1.2 创建房间页组件边界可追溯** — done when: index.html 在文档或注释中明确组件区块（表单、结果、错误/加载），与 create-room.js 职责对应可查。
3. **1.3 房间页组件边界可追溯** — done when: join.html 在文档或注释中明确组件区块（头部、侧栏-房间信息/成员/聊天、共享区-视频占位），与 room.js / chat.js / sync.js / screen-streaming.js 等对应可查。
4. **2.1 数据获取无不必要串行** — done when: 房间页 init 中若有可并行独立请求则用 Promise.all 或先发再 await；有依赖的串行（如 validateRoom → join）在代码或文档中说明理由；创建房间页仅单次 POST，无多余串行。
5. **2.2 验收** — done when: 代码审阅 + 运行时检查无多余串行请求；三项成功标准均满足。
