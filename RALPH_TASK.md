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

- [ ] #1 主要页面均由多个可复用组件组合而成
- [ ] #2 数据获取无不必要的串行等待（符合 vercel-react-best-practices 第 1、3 类规则）
- [ ] #3 组件边界与数据依赖在文档或注释中可追溯

## Implementation Steps

<!-- 细化约定时填写：步骤 + 每步验收，例如 -->
<!-- 1.1 加路由 — done when: GET /api/v1/rooms 返回 200 -->
<!-- 1.2 写 handler — done when: POST 入参校验失败返回 400 -->
