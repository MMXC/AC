---
title: 房主 / 成员角色与房间状态模型设计
description: 说明 Watch Together 系统中房主、普通成员的职责边界，以及 Room 数据模型中 hostId / currentUrl / operationSourceUserId 的语义和状态流转。
---

## 1. 角色定义

### 1.1 房主（Host）

- **身份来源**：房主是**创建房间的人**。在后端中，房主身份由 `Room.hostId` 字段唯一标识：
  - 创建房间时生成一个 `hostId`（例如 `user-xxxxxxxx`），同时写入：
    - `Room.hostId`
    - 对应的房主成员记录 `RoomMember.userId`（并标记 `isHost = true`）
- **唯一且不可变更**：
  - 一旦房间创建成功，`Room.hostId` **永远不变**。
  - 普通成员通过分享链接加入时，只能创建新的 `RoomMember` 记录，**不会也不能修改 `Room.hostId`**。
  - 即使房主暂时离开房间、刷新页面或重新进入房间，`Room.hostId` 仍然保持为最初创建者的用户 ID。
- **职责与能力**：
  - 决定房间的初始 URL（创建房间时即可指定，或之后通过 URL 同步接口更新）。
  - 浏览器内真实打开被共享的网页（iframe / WebView 等）。
  - 在“仅房主持有真实网页”的模式下，只有房主浏览器会直接访问被嵌入网页的 DOM。

### 1.2 普通成员（Member）

- **加入方式**：普通成员只能通过**分享链接**加入现有房间（例如 `/room/:roomId` 或 `/join/:roomId`），调用加入房间 API 或使用前端 Join 流程。
- **身份限制**：
  - 普通成员永远不会成为房主：
    - 他们的 `RoomMember.userId` 永远不会被写入 `Room.hostId`。
    - `Room.hostId` 永远指向创建房间的那位用户。
  - 即便房主临时离线，也不会因为其他成员加入而改变 `Room.hostId`。
- **能力范围**：
  - 可以通过 WebSocket 发送聊天消息、请求状态同步、发送 URL_CHANGE / 操作同步等消息。
  - **不能直接控制真实网页的 DOM**：普通成员只向服务器发送“意图”（滚动、点击、URL 变更等），由后端决定是否转发给房主浏览器执行。

### 1.3 RoomMember.isHost 的角色

- `RoomMember.isHost` 是一个**从属标记**，用于前端 UI 显示“这个成员在房间里是房主”：
  - 正确的语义是：当且仅当 `RoomMember.userId === Room.hostId` 时，该成员的 `isHost` 应为 `true`。
  - 对于所有其它成员，`isHost` 必须为 `false`。
- **Single Source of Truth 原则**：
  - **房主身份的唯一真源是 `Room.hostId`**。
  - `RoomMember.isHost` 只是 UI 友好的冗余字段，所有关于“是否为房主”的校验逻辑都应以 `Room.hostId` 为准。

## 2. 房间状态模型字段语义

### 2.1 `Room.hostId` —— 房主身份的单一真源

- **定义**：`Room.hostId: string`，房主用户的唯一标识。
- **语义**：
  - 标识“谁是这个房间的房主”。
  - 从创建房间开始就被设置，之后任何业务逻辑**都不能修改它的值**。
- **使用原则**：
  - 需要判断“某个用户是否为房主”时，应使用：
    - `userId === Room.hostId` 作为唯一判断条件。
  - 不允许通过修改 `RoomMember.isHost` 来“转移房主”，否则会违反单一真源。

### 2.2 `Room.currentUrl` —— 真实网页 URL 的单一真源

- **定义**：`Room.currentUrl: string | null`，当前被房主浏览器真实打开的共享页面 URL。
- **语义**：
  - 表示该房间当前正在被共享的网页地址。
  - WebSocket 状态同步（`SYNC_STATE`）中的 URL、URL 同步 API / WebSocket 消息，都应与此字段保持一致。
- **来源与更新路径**：
  - 房间创建时可以设置初始 URL，写入 `Room.currentUrl`。
  - 之后通过：
    - HTTP API：`PUT /api/v1/rooms/:roomId/url`
    - WebSocket：`URL_CHANGE` 消息
    更新 URL 时，最终都会更新 `Room.currentUrl`，并在 `RoomEvent` 中记录 URL 变更历史。
- **使用原则**：
  - 所有客户端在展示“当前共享网页”时，应以 `Room.currentUrl` 为唯一真源。
  - 即使某个客户端本地还没完成加载，也不能擅自认为 URL 已经变更，必须以从服务器获取的 `Room.currentUrl` 为准。

### 2.3 `Room.operationSourceUserId` —— 操作来源用户的单一真源

- **定义**：`Room.operationSourceUserId: string | null`，当前被授予“操作来源”的成员用户 ID。
- **语义**：
  - 该字段只决定**谁的输入事件会被房主端浏览器执行**。
  - 不会也不应该改变房主身份：即使 `operationSourceUserId` 指向某个普通成员，该成员也不会成为房主。
- **典型场景**：
  - 房主可以选择“把操作权交给某个成员”，此时：
    - 服务器将 `operationSourceUserId` 设置为该成员的 `userId`。
    - 服务器会将该成员发来的滚动、点击等操作，通过某种安全通道转发到房主浏览器执行。
  - 当字段为 `null` 时，表示只有房主自己可以操作页面。
- **使用原则**：
  - 客户端只应依据该字段决定“是否启用本地操作采集与发送”，而不是据此推断“我是不是房主”。
  - 身份判断依然只看 `Room.hostId`。

## 3. “仅房主持有真实网页”的前后端协作

### 3.1 房主端浏览器

- 房主端负责：
  - 通过 iframe 或类似技术**真实打开目标网页**。
  - 捕获本地的滚动、点击、URL 变化等操作，并通过 WebSocket 发送到服务器。
  - 根据服务器下发的同步消息更新本地状态（例如成员列表、聊天消息等）。

### 3.2 普通成员端浏览器

- 普通成员端的关键约束：
  - **不直接嵌入真实网页 iframe，不访问被嵌入网页的 DOM**。
  - 只能看到房主画面的实时投影（例如视频流或画布绘制）。
- 交互方式：
  - 成员的操作（滚动、点击等）会被封装为同步事件，通过 WebSocket 发送到服务器。
  - 服务器判断该成员是否当前 `operationSourceUserId`，若是，则将这些事件转发给房主浏览器执行。
  - 这样可以保证**只有房主浏览器真正访问目标网页**，其余成员只是“远程遥控 + 观看”。

### 3.3 安全与隔离

- 因为普通成员不直接触碰被嵌入网页的 DOM，带来以下好处：
  - 降低 XSS / CSRF 风险：被嵌入网页只在房主浏览器中运行。
  - 降低对第三方网站的压力：实际访问数与房主浏览器数量相同，而不是房间成员数量。
  - 更容易统一处理 Cookie、登录状态等。

## 4. 状态流转说明

### 4.1 创建房间

1. 客户端调用 `POST /api/v1/rooms` 创建房间。
2. 服务器生成：
   - `roomId`（房间 ID）
   - `hostId`（房主用户 ID）
3. 将 `hostId` 写入：
   - `Room.hostId`
   - 对应的 `RoomMember` 记录（`userId = hostId, isHost = true`）。
4. 可以同时设置初始 `currentUrl`，或后续通过 URL 同步接口设置。
5. 响应中返回 `hostId`，前端应妥善保存（例如 LocalStorage），以便房主刷新/重连时继续使用同一 `userId`。

### 4.2 房主刷新或重进房间

房主刷新页面或关闭浏览器后重新打开时，关键目标是**保持房主身份的一致性**：

1. 前端应从本地存储中读取之前的 `hostId`，并在重新加入房间或建立 WebSocket 连接时继续使用这个 `userId`。
2. 服务器端的判断逻辑：
   - 只要请求中携带的 `userId` 等于 `Room.hostId`，就认定该连接属于房主。
   - 即使期间房主曾经离线、`RoomMember` 记录的 `leftAt` 有变化，`Room.hostId` 依然不变。
3. WebSocket 层：
   - 连接参数中的 `userId` 若等于 `Room.hostId`，则该连接被视为“房主连接”，是唯一真正持有真实网页的浏览器。
   - 其它连接即使拥有操作来源权限（`operationSourceUserId` 指向它们），也只是通过房主浏览器间接操作。

### 4.3 成员加入 / 离开

1. **加入房间**：
   - 普通成员通过分享链接进入，调用 `POST /api/v1/rooms/:roomId/join`。
   - 服务器为其生成新的 `userId` 和 `RoomMember` 记录，并确保：
     - `Room.hostId` 不会被修改。
     - 该成员的 `isHost` 为 `false`（仅当 `userId === Room.hostId` 时才允许为 `true`）。
2. **离开房间**：
   - 调用 `POST /api/v1/rooms/:roomId/leave`，服务器为对应的 `RoomMember` 设置 `leftAt`。
   - WebSocket 断开时，服务器也会更新 `lastActiveAt` 并广播 `MEMBER_LEFT`。
3. **房主离开与回归**：
   - 当当前的房主连接断开时，服务器不会修改 `Room.hostId`。
   - 当房主重新连接并携带同一个 `hostId`（即 `Room.hostId`），其房主身份自然恢复。

### 4.4 URL 同步与操作来源

1. **URL 同步**：
   - 通过 HTTP API（`PUT /api/v1/rooms/:roomId/url`）或 WebSocket 消息（`URL_CHANGE`）发起。
   - 服务器更新 `Room.currentUrl`，并记录 `RoomEvent`。
   - 通过 WebSocket 广播 `URL_CHANGED` 消息给所有成员。
2. **操作来源切换**（依赖 `operationSourceUserId`）：
   - 房主可以在 UI 上切换“谁是当前操作来源”，后端将 `Room.operationSourceUserId` 更新为对应的 `userId`。
   - 服务器仅转发来自 `operationSourceUserId` 的操作事件给房主浏览器执行。
   - 这样可以在保持房主身份不变的前提下，实现“指定谁来遥控页面”的能力。

## 5. 总结

- **房主身份**：`Room.hostId` 是唯一真源，自创建后不可变更，任何角色判断都以此为准。
- **共享 URL**：`Room.currentUrl` 是共享网页 URL 的唯一真源，所有同步机制围绕它展开。
- **操作来源**：`Room.operationSourceUserId` 只决定“谁的输入被执行”，不影响房主身份。
- **前端约束**：普通成员只看到房主画面投影，不直接访问嵌入网页 DOM，从而在安全性、性能和一致性上都更可控。

