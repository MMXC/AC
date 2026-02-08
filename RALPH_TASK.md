---
backlog_id: backlog-142
task: 包体与运行时性能优化
test_command: "手动：对比重构前后 bundle 大小或 LCP/TTI；现有测试仍通过"
---

# Task: 包体与运行时性能优化

## Description

按 vercel-react-best-practices 优化包体与运行时：避免 barrel 导入、对重组件使用 dynamic import、非关键第三方在 hydration 后加载；必要时使用 SWR 或 React.cache 做请求去重与缓存；列表使用 content-visibility 或虚拟化（若适用）。不改变功能行为。

**Test Command**: `手动：对比重构前后 bundle 大小或 LCP/TTI；现有测试仍通过`

**Test Command**: `手动：对比重构前后 bundle 大小或 LCP/TTI；现有测试仍通过`

## Success Criteria

- [ ] #1 关键路径无 barrel 导入或已通过 optimizePackageImports 等等价方式优化
- [ ] #2 重组件或非首屏模块已动态加载
- [ ] #3 现有前端/集成测试全部通过

## Implementation Steps

<!-- 细化约定时填写：步骤 + 每步验收，例如 -->
<!-- 1.1 加路由 — done when: GET /api/v1/rooms 返回 200 -->
<!-- 1.2 写 handler — done when: POST 入参校验失败返回 400 -->
