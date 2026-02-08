# 页面组件树与数据流

本文档描述 watch-together 主要页面的**组件边界**、**脚本职责**与**数据获取顺序**，满足「按组件组合拆分页面与数据获取」的架构约定，并与 vercel-react-best-practices 中「独立请求并行、有依赖串行」的规则对齐。

---

## 1. 创建房间页（index.html）

### 1.1 组件树

```
Page: index.html
├── 布局容器 (.container > .container-inner)
│   ├── 标题区：h1 + .subtitle
│   ├── 组件：创建房间表单 (#createRoomForm)
│   │   ├── 表单组：房间名称 (#roomName)
│   │   ├── 表单组：房主昵称 (#hostNickname)
│   │   ├── 提交按钮 (#createBtn)
│   │   ├── 加载状态 (#loading)
│   │   └── 错误信息 (#error)
│   └── 组件：创建结果 (#result)
│       ├── 房间信息展示 (#roomId, #roomNameDisplay)
│       └── 分享链接区 (#roomLink, #copyBtn)
```

### 1.2 脚本与组件对应

| 区块 | DOM 标识 | 脚本 | 职责 |
|------|----------|------|------|
| 创建房间表单 | #createRoomForm, #createBtn, #loading, #error | create-room.js | 表单校验、单次 POST /api/v1/rooms、结果展示、复制链接 |
| 创建结果 | #result, #roomLink, #copyBtn | create-room.js | 显示 roomId/name、生成并复制房间链接 |

### 1.3 数据流

- **唯一网络请求**：用户点击「创建房间」后，`createRoom(roomName, hostNickname)` 发起 **单次** `POST /api/v1/rooms`。
- **无串行依赖**：本页无多步数据依赖，无并行/串行选择问题；符合「单请求页」最佳实践。

---

## 2. 房间内页（join.html）

### 2.1 组件树

```
Page: join.html (Shell 布局)
├── 头部 .header.shell__nav
│   ├── 标题 .shell__nav-title
│   └── 房间信息 #roomInfo
├── 主内容 .main-container.shell__content.shell__main
│   ├── 侧栏 .sidebar.shell__sidebar
│   │   ├── 组件：房间信息区 (.sidebar-section)
│   │   │   ├── #sidebarRoomId, #shareRoomButton
│   │   │   └── 脚本：room.js（房间信息、分享链接）
│   │   ├── 组件：我的信息 (#userInfoSection)
│   │   │   ├── #currentUserId, #nicknameInputContainer, #nicknameDisplay, #joinRoomButton, #changeNicknameButton
│   │   │   └── 脚本：room.js（进房/昵称/离开）
│   │   ├── 组件：成员列表 (#membersList)
│   │   │   └── 脚本：room.js（addMember/removeMember/setMembersList/updateMembersDisplay）、chat.js（SYNC_STATE/MEMBER_JOINED/MEMBER_LEFT 更新列表）
│   │   └── 组件：聊天区 (.chat-section)
│   │       ├── #chatMessages, #chatInput, #chatSendButton
│   │       └── 脚本：chat.js（WebSocket 聊天、消息渲染、成员列表事件派发）
│   └── 组件：共享浏览区 .browser-area.shell__area
│       └── 视频/占位区 #videoContainer, #videoStream, #videoPlaceholder
│           └── 脚本：video-player.js, screen-streaming.js（WebRTC 画面）、webrtc-manager.js（信令路由）
```

### 2.2 脚本与组件对应

| 区块 | DOM 标识 | 脚本 | 职责 |
|------|----------|------|------|
| 头部/房间信息 | #roomInfo, #sidebarRoomId, #shareRoomButton | room.js | 展示 roomId、复制房间链接 |
| 我的信息/进房 | #userInfoSection, #joinRoomButton, #nicknameInput | room.js | validateRoom、joinRoomWithNickname、离开房间 |
| 成员列表 | #membersList | room.js, chat.js | room：列表数据与 UI 更新；chat：WS 事件驱动列表更新 |
| 聊天 | #chatMessages, #chatInput, #chatSendButton | chat.js | 聊天 WS、消息收发与渲染、成员进出事件派发 |
| 共享区/视频 | #videoContainer, #videoStream, #videoPlaceholder | video-player.js, screen-streaming.js, webrtc-manager.js | 画面占位、WebRTC 流、信令路由 |
| 操作同步 | iframe（已隐藏） | sync.js, operation-source.js | 操作同步 WS、操作来源 API |

### 2.3 数据流与请求顺序

- **页面加载（init）**  
  - `getRoomIdFromPath()`：同步，无请求。  
  - `validateRoom(roomId)`：**一次** `GET /api/v1/rooms/:roomId`，用于校验房间是否存在。  
  - **依赖关系**：必须先得到「房间有效」才能执行加入；因此 **validateRoom → joinRoomWithNickname** 为**有意的串行**，符合 vercel-react-best-practices「有依赖的用 await」。
- **加入房间**  
  - 房主（从 localStorage 识别）：自动调用 `joinRoomWithNickname(roomId, userId, hostNickname)`，**一次** `POST /api/v1/rooms/:roomId/join`。  
  - 成员：用户点击「加入房间」后同上一请求。  
- **加入成功后**  
  - chat.js、sync.js 使用 `window.currentUserId` 与 `getRoomIdFromPath()` 建立 WebSocket（聊天 / 同步）。  
  - 成员列表轮询：`startMembersPolling(roomId)` 每 3s 请求 `GET /api/v1/rooms/:roomId` 作为兜底，与 WebSocket 并行存在，不阻塞首屏。
- **无多余串行**：首屏仅「validate → join」两步且为业务依赖；未出现「先等 A 再请求 B」的无关串行。独立请求（如轮询）与 WS 独立运行。

---

## 3. 与 vercel-react-best-practices 的对应

- **第 1 类（消除瀑布）**：房间页 init 中仅 validateRoom 与 join 为串行且为依赖关系；无「可并行却串行」的请求。  
- **第 3 类（客户端数据获取）**：成员列表由单一来源（room 模块状态 + chat WS 事件）更新，轮询仅为兜底；事件由 chat 派发、room 订阅，避免重复订阅。  
- **文档可追溯**：本文档 + 各脚本顶部注释或区块注释标明组件边界与数据依赖，便于审阅与运行时检查无多余串行请求。
