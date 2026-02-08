# Watch Together 前端架构约定

本文档记录 watch-together 前端重构的架构决策、组件化与数据获取策略，以及与 ui-ux-pro-max、vercel-react-best-practices 的对应关系。验收方式：**手动评审本架构文档与目录草图**。

---

## 1. 架构决策：是否迁移到 React/Next.js

### 决策结论

**当前阶段：保留现有技术栈（多页面 HTML + 模块化 JS），不迁移到 React/Next.js。**

### 理由

- **现状**：前端已具备多页面（`index.html` 创建房间、`join.html` 房间内页）、按功能拆分的 JS 模块（`room.js`、`chat.js`、`sync.js`、`screen-streaming.js`、`video-player.js`、`webrtc-signaling.js` 等），与现有 Node/Express + WebSocket 后端配合稳定，且已有较完整的单元测试与 E2E 场景。
- **迁移成本**：若立即迁移到 React/Next.js，需重写所有页面与实时逻辑（WebSocket、WebRTC 信令、状态同步），测试与回归成本高。
- **后续选项**：若产品需要更强的组件复用、服务端渲染或 App Router 等能力，可在后续迭代中再评估迁移；届时本仓库内 backlog 已有「前端脚手架与基础结构」「按组件组合拆分页面与数据获取」等任务可与之衔接。

### 记录位置

本决策记录于 `watch-together/docs/architecture-decisions.md`（本文档）第 1 节。

---

## 2. 组件化 / 可组合页面与数据获取策略

### 2.1 当前模型：页面 = 布局 + 可组合模块

- **布局**：每个页面对应一个 HTML 文件（如 `index.html`、`join.html`），负责页面骨架、主要区块（头部、主内容区、侧边栏、视频区、聊天区等）和脚本引用顺序。
- **可组合模块**：按职责拆分的 JS 模块，在页面中通过 `<script type="module">` 或普通 `<script>` 按依赖顺序加载；模块通过 `window` 上的约定接口（如 `getMembersList`、`handleWebRTCSignalingMessage`）或自定义事件（如 `memberJoinedRoom`、`syncStateMembersUpdated`）组合，避免全局命名冲突并便于单测。各页面的**组件树与数据流**见 `docs/component-tree-and-data-flow.md`，组件边界与数据依赖可追溯。

### 2.2 数据获取策略

- **REST**：房间创建、加入、获取房间信息、离开等通过 `fetch` 调用 `watch-together-server` 的 REST API（如 `POST /api/v1/rooms`、`GET /api/v1/rooms/:roomId`、`POST /api/v1/rooms/:roomId/join`）。
- **WebSocket**：实时数据（聊天消息、成员进出、SYNC_STATE、WebRTC 信令）通过双 WebSocket 连接（chat + sync）与后端通信；前端在连接就绪后请求或接收服务端推送，避免在未就绪时发起依赖连接状态的操作。
- **与 vercel-react-best-practices 的对应**（在现有栈下的类比）：
  - **消除瀑布 (Eliminating Waterfalls)**：页面加载时并行请求房间信息与建立 WebSocket，避免「先等 A 再请求 B」的串行等待；可参考 [vercel-react-best-practices] 中 `async-parallel`、`async-defer-await` 等思路，在 JS 中用 `Promise.all` 或尽早发起独立请求。
  - **客户端数据获取**：避免重复订阅同一数据源；事件监听（如 `memberJoinedRoom`）由单一模块派发、多模块按需订阅，对应 `client-event-listeners` 去重思想。
  - **按需加载**：对非首屏必需的大块逻辑（若未来拆出）可采用动态 `import()`，对应 `bundle-dynamic-imports`。
  - 若未来迁移到 React/Next，将直接采用该 skill 中的 Server Components、SWR、Suspense 等规则。

上述策略与引用的对应关系可在实现与评审时直接查阅 skill：`vercel-react-best-practices`。

---

## 3. 与 ui-ux-pro-max 设计系统的集成方式

### 3.1 约定

- **设计规则来源**：在设计与前端实现时，以 **ui-ux-pro-max** 作为 UI/UX 规则与设计智力的参考；新建或改版页面、组件、主题时，优先查阅该 skill 的规则分类（无障碍、触控与交互、性能、布局与响应式、字体与色彩、动效等）。
- **集成方式**：
  - **设计阶段**：选型颜色、字体、布局、动效时，从 ui-ux-pro-max 的 palettes、font pairings、layout 等建议中选取并文档化（如 `INDEX_DESIGN_NOTES.md` 已记录首页字体与配色）。
  - **实现阶段**：通过 CSS 变量（如 `--color-primary`、`--font-heading`）集中管理主题与间距，便于与 ui-ux-pro-max 的「设计系统」产出对齐；新组件需满足其 CRITICAL 类规则（如无障碍 contrast、focus、aria-label）。
  - **持久化**：设计系统产出（色板、字级、间距 scale、z-index scale）持久化在仓库内：
    - **设计系统主文件**：`design-system/MASTER.md`（由 task-138 / ui-ux-pro-max 生成），含 Pattern、Style、Colors、Typography、Effects、Anti-patterns；页面级覆盖：`design-system/watch-together/pages/<page>.md`。
    - 现有：`watch-together/INDEX_DESIGN_NOTES.md`、页面内 CSS 变量；后续可增加 `watch-together/docs/design-tokens.md` 与 MASTER 对齐。
- **评审**：UI/UX 相关任务完成时，可对照 ui-ux-pro-max 的 Rule Categories（Accessibility、Touch & Interaction、Layout & Responsive 等）做自检或评审清单。

### 3.2 与 backlog 的对应

- **task-138（使用-ui-ux-pro-max-生成并持久化设计系统）**：负责将 ui-ux-pro-max 的产出物生成并落盘，本约定则说明「如何在本前端项目中引用与集成」该设计系统。
- **task-140（应用设计系统到布局与主题）**：在布局与主题实现时应用上述集成方式。

---

## 4. 目录结构草图

当前 watch-together 前端目录结构（与上述「页面 = 布局 + 可组合模块」一致）：

```
watch-together/
├── index.html              # 创建房间页（布局）
├── join.html               # 房间内页（布局：视频区、聊天区、成员列表等）
├── webrtc-loopback-demo.html
├── js/
│   ├── create-room.js      # 创建房间页逻辑
│   ├── room.js             # 房间内通用：API 基址、进房、成员列表、URL 等
│   ├── chat.js             # 聊天 WebSocket、消息渲染、成员列表 UI 更新
│   ├── sync.js             # 同步 WebSocket、SYNC_STATE、操作同步
│   ├── screen-streaming.js # 屏幕共享与 WebRTC（房主/成员）
│   ├── video-player.js     # 视频占位与 MediaStream 附加
│   ├── webrtc-manager.js   # WebRTC 信令路由（委托 screen-streaming 处理屏幕共享）
│   ├── webrtc-signaling.js # WebRTC 信令类型与消息构造
│   ├── webrtc-signaling-types.ts
│   └── operation-source.js # 操作来源/同步相关
├── docs/
│   ├── architecture-decisions.md  # 本文档
│   ├── webrtc-signaling-protocol.md
│   ├── webrtc-host-single-member.md
│   ├── INDEX_DESIGN_NOTES.md      # 首页设计说明（可迁至 docs 或保留根目录）
│   └── ...
├── __tests__/              # 单元与集成测试
├── mock/                    # Mock 数据
├── mock-server/             # 开发用 Mock 服务
├── package.json
└── README.md
```

**路由约定**（当前）：

- `/` 或 `index.html`：创建房间。
- `/room/:roomId`（或 `join.html?room=...`）：房间内页；入口由创建房间后跳转或邀请链接进入。

**说明**：若后续引入前端路由（如 hash 或 history），可在本文档或单独 `docs/routing.md` 中补充；当前以多页 + 查询参数为主。

---

## 文档变更与评审

- 本文档随架构决策或目录调整更新；重大变更时同步更新 RALPH_TASK / backlog 相关任务的验收条件。
- **测试命令**：本任务验收为「手动：评审架构文档与目录草图」，无自动化测试；评审时确认上述三节（架构决策、组件化与数据获取、ui-ux-pro-max 集成）与目录草图完整且与实现一致即可。
