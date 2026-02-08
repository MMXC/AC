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

- [x] #1 关键路径无 barrel 导入或已通过 optimizePackageImports 等等价方式优化
- [x] #2 重组件或非首屏模块已动态加载
- [x] #3 现有前端/集成测试全部通过

## Implementation Steps

1. **1.1 关键路径与 barrel 审计** — 确认无 barrel 导入（本项目为多页 HTML + 独立 script 引用，无单文件再导出）；在文档或注释中标明关键路径脚本（room/chat/sync/webrtc-signaling）与可延后脚本。**done when**: 文档或注释明确。
2. **1.2 非首屏/重模块延后加载** — 对 join 页中非首屏必需脚本（webrtc-manager、screen-streaming、video-player、operation-source）使用 defer 或 DOMContentLoaded 后动态加载，保证 room/chat/sync/webrtc-signaling 先执行以建立连接与基础 UI。**done when**: 首屏脚本延后执行不阻塞解析，`npm run build` 与现有测试通过。
3. **1.3 列表 content-visibility** — 对成员列表项（.member-item）与聊天消息项（.chat-message）应用 content-visibility: auto（及 contain-intrinsic-size 若需），长列表时减少渲染成本。**done when**: 样式已加，`npm run build` 与现有测试通过。
4. **2.1 验收** — `npm run build` 通过；watch-together 现有前端/集成测试全部通过；手动可选：记录脚本加载策略与列表优化说明。
