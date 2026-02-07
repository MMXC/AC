---
task: 房主端去掉 iframe/URL，仅显示视频占位；创建房间去掉 URL 输入
source: newneed / 用户需求（非 backlog）
---

# Task: 房主端 iframe/URL 移除，统一为视频占位

## Description

房主端去掉 iframe 加载 URL 网页，改为与成员端一致只显示视频占位（等待画面流；房主开始共享后显示画面）。同时去掉创建房间时的「目标网址 URL」输入项。

**范围**：创建房间页、房间页（join.html）主区域、room.js 房主端逻辑；服务端创建房间 API 将 url 改为可选。

## Acceptance Criteria

- **AC1**：创建房间页面（index.html）不再包含「目标网址 URL」输入框；创建房间 API 不要求 url，房间 currentUrl 可为空。
- **AC2**：房主进入房间后，主区域只显示视频占位（与成员端一致的 video-container + placeholder），不显示 iframe、不显示 URL 输入框、不显示「修改 URL」按钮。
- **AC3**：房主点击「开始共享」后，画面在视频区域显示（与现有 screen-streaming 行为一致）；成员端仍通过 WebRTC 收到画面。

## Implementation Steps

### Step 1: 创建房间去掉 URL（前端）
- **做什么**：index.html 移除「目标网址 URL」表单项；create-room.js 不再传 url、不再校验 url，createRoom(roomName, hostNickname) 无第三参；本地存储不再存 currentUrl。
- **涉及**：watch-together/index.html, watch-together/js/create-room.js
- **验收**：打开创建房间页无 URL 输入框；提交后房间创建成功并跳转；POST /api/v1/rooms 请求体可不含 url 或 url 为空且服务端不报错（依赖 Step 2）。

### Step 2: 服务端创建房间 API 将 url 改为可选
- **做什么**：POST /api/v1/rooms 的 body 中 url 改为可选；无 url 或无效时 currentUrl 存为 null/空；返回 data 中 currentUrl 可为 null。
- **涉及**：watch-together-server/dist/app.js
- **验收**：POST /api/v1/rooms 不传 url 返回 201，房间 currentUrl 为 null；传 url 仍可正常创建并保存 currentUrl。

### Step 3: join.html 去掉 iframe 与 URL 相关 UI
- **做什么**：移除或永久隐藏 urlInputContainer、urlControlContainer、browserFrame（iframe）的展示；房主端与成员端统一只保留 video-container（含 video/placeholder）可见。可保留 iframe 节点但 display:none 且不再设置 src，避免脚本报错。
- **涉及**：watch-together/join.html
- **验收**：房主进入房间后主区域仅见视频占位（等待画面流），无 URL 输入、无「修改 URL」、无 iframe 可见内容。

### Step 4: room.js 房主端只走视频占位逻辑
- **做什么**：房主进入房间后不再调用 loadUrlIntoIframe、showUrlInputContainer、showUrlControlButton；与成员端一致：hideUrlInputContainer、hideUrlControlButton、hideBrowserFrame、showVideoContainer，placeholder 文案为「等待画面流」或「点击开始共享」。
- **涉及**：watch-together/js/room.js
- **验收**：房主进入房间后仅显示 video-container 与占位文案；开始共享后画面出现在视频区域。

### Step 5: 清理 room.js 中 URL/iframe 相关事件与冗余（可选）
- **做什么**：移除或精简仅被 URL/iframe 流程调用的 DOM 事件（如 urlInput 的 submit、changeUrlButton 的 click）；updateRoomUrl、loadUrlIntoIframe 等可保留为空实现或内联隐藏逻辑，避免控制台报错。
- **涉及**：watch-together/js/room.js
- **验收**：房主/成员进房、开始共享、观看无报错；无残留的 URL 按钮或输入框可点击。

## Test Command

- 手动：创建房间（无 URL）→ 进房 → 房主见视频占位 → 开始共享 → 房主与成员均见画面。
- 可选：现有前端/API 测试脚本若涉及创建房间 URL，需改为不传 url 或传空。
