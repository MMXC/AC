# 包体与运行时性能约定

> 对应 backlog-142「包体与运行时性能优化」；与 vercel-react-best-practices 的类比实践。

## 1. 无 barrel 导入

- **现状**：本项目为多页 HTML + 模块化 JS，**无 bundler、无 ES 模块 barrel**。每个页面通过 `<script src="...">` 直接引用所需脚本，无单文件再导出多模块的写法。
- **关键路径**：不引入「从 index.js 再导出所有模块」的 barrel；若未来引入打包工具，可参考 Next.js 的 `optimizePackageImports` 等方式做等价优化。

## 2. 房间页（join.html）脚本加载策略

- **关键路径（首屏/连接必需）**：按顺序加载，不 defer，以尽快建立 WebSocket 与基础 UI。
  - `room.js` — API 基址、进房、成员列表、房间信息
  - `webrtc-signaling.js` — 信令工具函数（createOfferMessage 等）
  - `chat.js` — 聊天 WebSocket、消息渲染、成员列表 UI
  - `sync.js` — 同步 WebSocket、SYNC_STATE
- **非首屏/重模块（延后加载）**：使用 `defer` 或 DOMContentLoaded 后动态加载，避免阻塞 HTML 解析与首屏绘制。
  - `webrtc-manager.js` — WebRTC 信令路由
  - `screen-streaming.js` — 屏幕共享与 WebRTC（房主/成员）
  - `video-player.js` — 视频占位与 MediaStream 附加
  - `operation-source.js` — 操作来源/同步相关

上述顺序与注释在 `join.html` 的 script 标签处同步维护。

## 3. 列表渲染优化

- **成员列表**（`#membersList` / `.member-item`）、**聊天消息列表**（`#chatMessages` / `.chat-message`）：使用 `content-visibility: auto` 与合适的 `contain-intrinsic-size`，使视口外项跳过渲染，长列表时降低布局/绘制成本。
- 若后续列表项数量极大，可再评估虚拟滚动（本任务不强制）。

## 4. 验收

- 关键路径无 barrel；脚本加载策略在本文档与 join.html 中可追溯。
- 重组件/非首屏模块已通过 defer 或动态加载延后。
- 现有前端/集成测试全部通过；手动可选：对比重构前后 LCP/TTI 或脚本加载时序。
