# 房主 ↔ 单成员 WebRTC 连接设计说明

本文件简要说明在 `watch-together` 前端与服务器端之间，如何通过 WebSocket 信令在房主与单个成员之间建立 WebRTC 连接，将房主的 `getDisplayMedia` 屏幕流传输到成员端。

## 角色与前提

- **房主（Host）**：通过首页创建房间的用户，在房间页中拥有 `window.isHost === true`。
- **成员（Member）**：通过房间链接加入的普通用户。
- **场景约束**：本迭代聚焦于「一个房主 + 一个成员」的最小通路，房主总是选择第一个非房主成员作为 WebRTC 目标。

## 信令通路

- **WebSocket 服务器**（`watch-together-server/src/websocket.ts`）：
  - 已支持基础房间校验、成员校验以及 `CHAT_MESSAGE` / `URL_CHANGE` / `OP_SOURCE_OPERATION` 等消息。
  - 本迭代新增 **WebRTC 信令透明路由**：
    - 识别以下类型：`WEBRTC_OFFER`、`WEBRTC_ANSWER`、`WEBRTC_ICE_CANDIDATE`、`WEBRTC_END`、`WEBRTC_ERROR`。
    - 做最小结构校验：`roomId` / `fromUserId` / `toUserId` 与当前连接是否匹配。
    - 如果 `toUserId` 非空：使用 `sendToUser(roomId, toUserId, message)` 点对点转发。
    - 如果 `toUserId` 为空：使用 `broadcastToRoom(roomId, message)` 向整个房间广播。

- **前端信令工具模块**（`watch-together/js/webrtc-signaling.js`）：
  - 定义 WebRTC 信令消息类型与创建函数：`createOfferMessage` / `createAnswerMessage` / `createICECandidateMessage` / `createEndMessage` 等。
  - 在浏览器环境中，这些函数会挂载到 `window`，供其他脚本直接调用。

## 前端连接流程

### 1. 房主端：点击「开始共享画面」

入口：`watch-together/js/screen-streaming.js` 中的 `startScreenSharing`。

流程：

1. 校验房主身份（`window.isHost === true`）与 WebSocket 连接状态。
2. 调用 `navigator.mediaDevices.getDisplayMedia` 获取屏幕流 `MediaStream`，保存到 `screenStreamState.mediaStream`。
3. 调用 `startWebRTCPeerConnectionAsHost(stream)`：
   - 使用 `getMembersList()` 获取成员列表，选择第一个 `id !== window.currentUserId` 的成员作为 `targetUserId`。
   - 创建 `RTCPeerConnection`，添加屏幕流中的 `video track`。
   - 设置 `onicecandidate`，将候选通过 `createICECandidateMessage` 封装为 `WEBRTC_ICE_CANDIDATE`，发送到 `targetUserId`。
   - 调用 `createOfferMessage` 生成 `WEBRTC_OFFER`，通过 WebSocket 发送给目标成员。
4. 保留原有基于 Canvas 的帧捕获与 `SCREEN_STREAM_*` 消息作为降级方案，不影响已有测试。

### 2. 成员端：收到 `WEBRTC_OFFER`

入口：`watch-together/js/chat.js` 中的 `handleWebSocketMessage`：

- 收到 `WEBRTC_*` 消息后，会调用 `window.handleWebRTCSignalingMessage(message)`。

实现：`watch-together/js/screen-streaming.js` 中的全局处理函数：

1. `handleWebRTCOffer(message)`：
   - 只处理 `message.toUserId === window.currentUserId` 且当前用户不是房主的情况。
   - 创建 `RTCPeerConnection` 与本地 `remoteStream`，将其绑定到房间页面中的 `video#videoStream` 元素。
   - 设置 `ontrack`：将远端流中的 track 附加到 `remoteStream`，触发表面上的视频播放。
   - 设置 `onicecandidate`：通过 `createICECandidateMessage` 将候选发送回房主。
   - 设置远端 offer，调用 `createAnswer` / `setLocalDescription`，再通过 `createAnswerMessage` 生成 `WEBRTC_ANSWER` 回传给房主。

2. `handleWebRTCAnswer(message)`：
   - 仅在房主端处理（`window.isHost === true`），并且 `message.toUserId === window.currentUserId`。
   - 将 answer SDP 设为本地 `peerConnection` 的远端描述，完成 WebRTC 握手。

3. `handleWebRTCIceCandidate(message)`：
   - 当 `message.toUserId === window.currentUserId` 时，将 `message.candidate` 转换为 `RTCIceCandidate` 并添加到本地 `peerConnection`。

4. `handleWebRTCEnd(message)`：
   - 在相关连接上调用 `stopWebRTCPeerConnection(false)`，关闭本地 PeerConnection 和远端流。

### 3. 连接生命周期

- **开始**：房主点击「开始共享画面」时，除了原有 `SCREEN_STREAM_START` 外，还会初始化 WebRTC 连接并发送 `WEBRTC_OFFER`。
- **结束**：
  - 房主调用 `stopScreenSharing()` 时：
    - 关闭本地屏幕流与帧捕获。
    - 调用 `stopWebRTCPeerConnection(true)`，关闭 PeerConnection 并发送 `WEBRTC_END` 给对端。
    - 继续通过旧协议发送 `SCREEN_STREAM_STOP`，保持兼容。
  - 成员端在收到 `WEBRTC_END` 后，同样关闭本地 PeerConnection 与远端流。

## 小结

本迭代在不破坏现有基于图片帧的画面流实现的前提下，引入了 **房主 ↔ 单成员** 的 WebRTC 媒体通路：

- 服务器侧只做轻量校验与透明转发；
- 前端通过 `webrtc-signaling.js` 统一构造与解析信令；
- `screen-streaming.js` 复用现有的房主按钮与视频容器，实现最小改动下的 WebRTC 集成。

