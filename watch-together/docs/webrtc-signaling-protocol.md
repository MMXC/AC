# WebRTC 信令消息协议文档

## 概述

本文档定义了基于现有房间 WebSocket/sync 通道的 WebRTC 信令消息格式。这些消息用于在房主和成员之间建立 WebRTC 连接时进行信令交换。

## 消息格式

所有 WebRTC 信令消息都通过 WebSocket 通道发送，消息格式为 JSON。

### 基础字段

所有 WebRTC 信令消息都包含以下基础字段：

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `type` | `string` | 是 | 消息类型，取值为：`WEBRTC_OFFER`、`WEBRTC_ANSWER`、`WEBRTC_ICE_CANDIDATE`、`WEBRTC_END`、`WEBRTC_ERROR` |
| `roomId` | `string` | 是 | 房间ID，标识消息所属的房间 |
| `fromUserId` | `string` | 是 | 发送者用户ID，标识消息的发送者 |
| `toUserId` | `string \| null` | 是 | 接收者用户ID，标识消息的目标接收者。对于点对点消息，此字段为接收者ID；对于广播消息（如房主向所有成员发送），此字段为 `null` |
| `timestamp` | `number` | 是 | 消息时间戳（毫秒），Unix 时间戳 |
| `version` | `string` | 否 | 协议版本号，用于未来扩展和兼容性处理。当前版本为 `"1.0"` |

## 消息类型详解

### 1. WEBRTC_OFFER

**用途**：房主创建 WebRTC 连接时发送，包含 SDP Offer。

**消息结构**：

```json
{
  "type": "WEBRTC_OFFER",
  "roomId": "room-abc123",
  "fromUserId": "user-host001",
  "toUserId": "user-member1",
  "timestamp": 1706544000000,
  "version": "1.0",
  "sdp": "v=0\r\no=- 1234567890 1234567890 IN IP4 127.0.0.1\r\n...",
  "sdpType": "offer",
  "tracks": {
    "audioTrackId": "audio-track-001",
    "videoTrackId": "video-track-001"
  }
}
```

**字段说明**：

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `sdp` | `string` | 是 | SDP Offer 内容，WebRTC Session Description Protocol Offer 的完整字符串 |
| `sdpType` | `string` | 是 | SDP 类型，固定为 `"offer"` |
| `tracks` | `object` | 否 | 扩展字段，用于未来支持多 track（音频、视频分离）。当前版本可选 |

**使用场景**：
- 房主开始屏幕共享时，向目标成员发送 Offer
- 房主可以向单个成员发送（`toUserId` 为具体成员ID），也可以向所有成员广播（`toUserId` 为 `null`）

---

### 2. WEBRTC_ANSWER

**用途**：成员响应 Offer 时发送，包含 SDP Answer。

**消息结构**：

```json
{
  "type": "WEBRTC_ANSWER",
  "roomId": "room-abc123",
  "fromUserId": "user-member1",
  "toUserId": "user-host001",
  "timestamp": 1706544001000,
  "version": "1.0",
  "sdp": "v=0\r\no=- 9876543210 9876543210 IN IP4 127.0.0.1\r\n...",
  "sdpType": "answer",
  "tracks": {
    "audioTrackId": "audio-track-002",
    "videoTrackId": "video-track-002"
  }
}
```

**字段说明**：

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `sdp` | `string` | 是 | SDP Answer 内容，WebRTC Session Description Protocol Answer 的完整字符串 |
| `sdpType` | `string` | 是 | SDP 类型，固定为 `"answer"` |
| `tracks` | `object` | 否 | 扩展字段，用于未来支持多 track |

**使用场景**：
- 成员收到 Offer 后，创建 Answer 并发送回房主
- 成员必须指定 `toUserId` 为房主的用户ID

---

### 3. WEBRTC_ICE_CANDIDATE

**用途**：交换网络候选地址（ICE Candidate），用于建立 P2P 连接。

**消息结构**：

```json
{
  "type": "WEBRTC_ICE_CANDIDATE",
  "roomId": "room-abc123",
  "fromUserId": "user-host001",
  "toUserId": "user-member1",
  "timestamp": 1706544002000,
  "version": "1.0",
  "candidate": {
    "candidate": "candidate:1 1 UDP 2130706431 192.168.1.100 54321 typ host",
    "sdpMLineIndex": 0,
    "sdpMid": "0"
  },
  "candidateString": "candidate:1 1 UDP 2130706431 192.168.1.100 54321 typ host",
  "sdpMLineIndex": 0,
  "sdpMid": "0"
}
```

**字段说明**：

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `candidate` | `RTCIceCandidateInit \| null` | 是 | ICE Candidate 对象。当 `null` 时表示候选地址收集完成 |
| `candidateString` | `string` | 否 | 候选地址字符串（兼容格式），与 `candidate.candidate` 字段相同 |
| `sdpMLineIndex` | `number \| null` | 否 | 关联的 SDP 媒体行索引 |
| `sdpMid` | `string \| null` | 否 | 关联的 SDP 媒体行标识 |

**使用场景**：
- 在 Offer/Answer 交换后，双方持续发送 ICE Candidate 直到找到可用的网络路径
- 当 `candidate` 为 `null` 时，表示候选地址收集完成

---

### 4. WEBRTC_END

**用途**：主动关闭 WebRTC 连接。

**消息结构**：

```json
{
  "type": "WEBRTC_END",
  "roomId": "room-abc123",
  "fromUserId": "user-host001",
  "toUserId": "user-member1",
  "timestamp": 1706544003000,
  "version": "1.0",
  "reason": "用户主动停止共享"
}
```

**字段说明**：

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `reason` | `string` | 否 | 结束原因，用于调试和日志记录 |

**使用场景**：
- 房主停止屏幕共享时发送
- 成员离开房间时发送
- 连接出现问题时主动关闭连接

---

### 5. WEBRTC_ERROR

**用途**：信令过程中的错误通知。

**消息结构**：

```json
{
  "type": "WEBRTC_ERROR",
  "roomId": "room-abc123",
  "fromUserId": "user-host001",
  "toUserId": "user-member1",
  "timestamp": 1706544004000,
  "version": "1.0",
  "errorCode": "ICE_CONNECTION_FAILED",
  "errorMessage": "ICE 连接失败，无法建立 P2P 连接",
  "errorDetails": {
    "iceConnectionState": "failed",
    "lastError": "Connection timeout"
  }
}
```

**字段说明**：

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `errorCode` | `string` | 否 | 错误代码，用于程序化处理错误 |
| `errorMessage` | `string` | 是 | 错误消息，人类可读的错误描述 |
| `errorDetails` | `object` | 否 | 错误详情，包含额外的调试信息 |

**使用场景**：
- WebRTC 连接建立失败时通知对方
- ICE 连接失败时发送
- SDP 解析错误时发送

---

## 消息流转示例

### 场景：房主向单个成员建立连接

1. **房主发送 Offer**：
   ```json
   {
     "type": "WEBRTC_OFFER",
     "roomId": "room-abc123",
     "fromUserId": "user-host001",
     "toUserId": "user-member1",
     "timestamp": 1706544000000,
     "sdp": "...",
     "sdpType": "offer"
   }
   ```

2. **成员发送 Answer**：
   ```json
   {
     "type": "WEBRTC_ANSWER",
     "roomId": "room-abc123",
     "fromUserId": "user-member1",
     "toUserId": "user-host001",
     "timestamp": 1706544001000,
     "sdp": "...",
     "sdpType": "answer"
   }
   ```

3. **双方交换 ICE Candidate**（多次）：
   ```json
   {
     "type": "WEBRTC_ICE_CANDIDATE",
     "roomId": "room-abc123",
     "fromUserId": "user-host001",
     "toUserId": "user-member1",
     "timestamp": 1706544002000,
     "candidate": { ... }
   }
   ```

4. **连接建立成功**（或失败时发送 ERROR）

5. **结束连接**：
   ```json
   {
     "type": "WEBRTC_END",
     "roomId": "room-abc123",
     "fromUserId": "user-host001",
     "toUserId": "user-member1",
     "timestamp": 1706544003000,
     "reason": "用户主动停止共享"
   }
   ```

### 场景：房主向所有成员广播

房主发送 Offer 时，将 `toUserId` 设置为 `null`，服务器会将消息广播给房间内所有成员。

---

## 扩展性设计

### 版本化策略

- 所有消息都包含可选的 `version` 字段
- 当前版本为 `"1.0"`
- 未来版本升级时，可以通过版本号进行兼容性处理

### 多 Track 支持

- `WEBRTC_OFFER` 和 `WEBRTC_ANSWER` 消息中包含可选的 `tracks` 字段
- 未来可以扩展为支持音频和视频 track 的独立管理

### 多房主支持

- 当前设计支持单个房主，但消息结构已预留扩展空间
- 未来可以通过 `fromUserId` 和权限系统支持多房主场景

---

## 实现建议

1. **类型安全**：使用 TypeScript 类型定义（见 `webrtc-signaling-types.ts`）确保类型安全
2. **消息验证**：在接收消息时，使用 `validateWebRTCSignalingMessage` 函数验证消息格式
3. **错误处理**：始终处理 `WEBRTC_ERROR` 消息，并向用户显示友好的错误提示
4. **超时处理**：为 Offer/Answer 交换设置超时，避免长时间等待
5. **重连机制**：连接失败时，可以重新发送 Offer 尝试建立连接

---

## 参考

- [WebRTC Specification](https://www.w3.org/TR/webrtc/)
- [SDP Format](https://datatracker.ietf.org/doc/html/rfc4566)
- [ICE Protocol](https://datatracker.ietf.org/doc/html/rfc8445)
