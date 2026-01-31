# 合并需求：TASK 31-41 整体范围（拆分后重跑 Ralph）

> 基于项目进度，将原 TASK 31～41 合并为一个整体任务需求，供正交拆分后重新执行 Ralph。

---

## 一、基线（已达成）

- **TASK-31 Docker 容器化**：已完成。docker-compose 包含 watch-together-server、watch-together 前端、postgres、redis，容器可正常构建与启动。

---

## 二、整体目标

把 watch-together 从「房主 iframe 内容 → 其他成员看到」升级为**基于 WebRTC 的实时视频流**：房主共享屏幕/标签页，房间内成员实时观看。

**当前阻塞**：前端 `create-room.js` 调用 `POST /api/v1/rooms`，但 watch-together-server 仅提供 `/health`，需先完成后端 REST 房间接口，再推进 WebRTC。

---

## 三、合并后的任务范围

### A. 后端接口（watch-together-server）——前置依赖

前端 create-room.js、room.js 依赖 watch-together-server 的 REST API（端口 3000）。需补齐：

| 原任务引用 | 内容 |
|-----------|------|
| - | **数据库**：PostgreSQL 容器、Prisma 迁移、Schema（Room、RoomMember、Message） |
| - | **POST /api/v1/rooms**：创建房间，返回 roomId、hostUserId、currentUrl、inviteLink 等 |
| - | **GET /api/v1/rooms/:roomId**：获取房间及成员 |
| - | **POST /api/v1/rooms/:roomId/join**：加入房间 |
| - | **PUT /api/v1/rooms/:roomId/url**：房主更新 currentUrl |
| - | **POST /api/v1/rooms/:roomId/leave**：离开房间 |

**测试**：`docker compose up -d && cd watch-together-server && npm run test:api`（或 test:api:create/get/join/url/leave）；脚本会先轮询 `$BASE/health` 等待 API 就绪。

---

### B. WebRTC 能力层（原 TASK 32-36）

| 原 TASK | 内容 | 测试 |
|---------|------|------|
| **32** | 房主端 getDisplayMedia：开始/停止共享按钮，本地预览 MediaStream | skill:watch-together-webapp-testing TASK-32 |
| **33** | 成员端 VideoPlayer：attachStream / detachStream，播放远端 MediaStream | skill:watch-together-webapp-testing TASK-33 |
| **34** | WebRTC 信令协议：WEBRTC_OFFER、WEBRTC_ANSWER、WEBRTC_ICE_CANDIDATE 等，文档或 TS 类型 | 代码评审 + TS + 单元测试 |
| **35** | 服务器端 WebRTC 信令转发：按 roomId/toUserId 透明转发 | skill:watch-together-webapp-testing TASK-35 |
| **36** | Loopback Demo：单页 pc1/pc2，offer/answer/ICE 本地交换，验证 WebRTC API | skill:watch-together-webapp-testing TASK-36 |

---

### C. WebRTC 连接与多成员（原 TASK 37-38）

| 原 TASK | 内容 | 测试 |
|---------|------|------|
| **37** | 房主 ↔ 单成员：WebSocket 交换 offer/answer/ICE，房主流 → 成员 VideoPlayer | skill:watch-together-webapp-testing TASK-37 |
| **38** | 房主 ↔ 多成员：每个成员独立 PeerConnection，增量建立/关闭 | skill:watch-together-webapp-testing TASK-38 |

---

### D. 权限与 UI（原 TASK 39-40）

| 原 TASK | 内容 | 测试 |
|---------|------|------|
| **39** | 仅房主显示共享按钮；后端/信令拒绝成员伪造 WEBRTC_OFFER | skill:watch-together-webapp-testing TASK-39 |
| **40** | 成员端状态：等待共享 / 正在播放 / 已停止，状态随 WebRTC 变化 | skill:watch-together-webapp-testing TASK-40 |

---

### E. 错误与重试（原 TASK 41）

| 原 TASK | 内容 | 测试 |
|---------|------|------|
| **41** | getDisplayMedia 拒绝、ICE 失败、信令中断：错误提示 + 有限重试 | skill:watch-together-webapp-testing TASK-41 |

---

## 四、依赖关系概览

```
[后端 API 完成] ← 阻塞前端创建房间
       ↓
[TASK-32 房主 getDisplayMedia] + [TASK-33 成员 VideoPlayer]
       ↓
[TASK-34 信令协议] + [TASK-35 信令转发] + [TASK-36 Loopback Demo]
       ↓
[TASK-37 房主↔单成员 WebRTC]
       ↓
[TASK-38 房主↔多成员] + [TASK-39 权限] + [TASK-40 播放器 UI]
       ↓
[TASK-41 错误处理]
```

---

## 五、项目当前状态（参考）

| 模块 | 状态 |
|------|------|
| docker-compose | 已有 watch-together-server、postgres、redis、watch-together |
| watch-together-server | 仅有 /health，无 Prisma、无房间 REST API |
| watch-together 前端 | 有 create-room.js、room.js、screen-streaming.js、video-player.js、webrtc-manager.js、webrtc-signaling.js、webrtc-loopback-demo.html（代码存在但可能因 git reset 不完整） |
| 测试脚本 | watch-together-server/scripts/test-rooms-api.sh（会先轮询 /health 等待 API 就绪）、skill:watch-together-webapp-testing |

---

## 六、拆分建议

1. **后端优先**：api-db1 → api-db2 → api-a1 → api-a2～api-a6 → api-a7
2. **WebRTC 基础**：32 → 33 → 34 → 35 → 36
3. **WebRTC 连接**：37 → 38
4. **体验与健壮**：39 → 40 → 41

拆分时可复用 `newneed.md` 中的任务格式（ID、描述、测试命令、依赖），或由 requirement-decomposer 正交分解后写入 newneed.md，供 `requirement-workflow.sh --decomposed` 使用。
