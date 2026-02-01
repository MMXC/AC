
---

## 三、前端修复（根据运行日志）

---

### 任务 fix-1: 修复 join.html 中 webrtc-signaling.js 重复加载导致的 SyntaxError

- **ID**: fix-1
- **描述**: join.html 中 webrtc-signaling.js 被引入了两次（约第 525 行与第 528 行），导致 `Identifier 'WebRTCSignalingType' has already been declared`。移除重复的 script 标签，确保该脚本只加载一次。
- **测试命令**: `docker compose up -d && .cursor/skills/watch-together-webapp-testing/run-test.sh fix-frontend`
- **成功标准**:
  1. [ ] join.html 中仅保留一处 webrtc-signaling.js 引用
  2. [ ] 页面加载后控制台无 "WebRTCSignalingType has already been declared" 错误
  3. [ ] WebRTC 信令功能（如开始共享、接收远端流）仍可正常使用
- **依赖**: 无

---

### 任务 fix-2: 修复 webrtcState 重复声明导致的 SyntaxError

- **ID**: fix-2
- **描述**: webrtc-manager.js 与 screen-streaming.js 均声明顶层变量 `webrtcState`，在同一页面加载时触发 `Identifier 'webrtcState' has already been declared`。需统一状态管理：或将 webrtc-manager 整合进 screen-streaming，或改用不同变量名/命名空间，避免重复声明。
- **测试命令**: `docker compose up -d && .cursor/skills/watch-together-webapp-testing/run-test.sh fix-frontend`
- **成功标准**:
  1. [ ] 页面中仅有一处 `webrtcState` 或等效状态的顶层声明
  2. [ ] 控制台无 "webrtcState has already been declared" 错误
  3. [ ] 屏幕共享与 WebRTC 连接逻辑仍可正常工作
- **依赖**: 无

---

### 任务 fix-3: 修复 API_BASE 重复声明导致的 SyntaxError

- **ID**: fix-3
- **描述**: room.js 与 operation-source.js 均在顶层声明 `const API_BASE`，在同一页面加载时触发 `Identifier 'API_BASE' has already been declared`。改为从 `window.API_BASE` 或统一配置模块读取，仅在一处完成初始化与声明。
- **测试命令**: `docker compose up -d && .cursor/skills/watch-together-webapp-testing/run-test.sh fix-frontend`
- **成功标准**:
  1. [ ] 顶层仅在一处声明或初始化 API_BASE
  2. [ ] room.js 与 operation-source.js 均可正确获取 API 根地址
  3. [ ] 控制台无 "API_BASE has already been declared" 错误
- **依赖**: 无

---

### 任务 fix-4: 修复 WebSocket 连接时 userId 格式校验与后端不一致

- **ID**: fix-4
- **描述**: 加入房间后，后端返回 UUID 格式的 userId（如 `8f0bb8e5-9711-419b-8481-accbdf28ace2`），但 chat.js 与 sync.js 中 WebSocket 连接前校验 userId 为正则 `/^user-[a-z0-9]{8}$/`，导致「userId 格式不正确」而无法连接。需将校验规则更新为同时支持 UUID 格式（或与后端约定一致），使新成员能正常连接聊天与操作同步 WebSocket。
- **测试命令**: `docker compose up -d && .cursor/skills/watch-together-webapp-testing/run-test.sh fix-frontend`
- **成功标准**:
  1. [ ] chat.js 中 userId 格式校验接受后端返回的 UUID 格式
  2. [ ] sync.js 中 userId 格式校验接受后端返回的 UUID 格式
  3. [ ] 新成员加入房间后，能成功连接聊天 WebSocket 与操作同步 WebSocket
  4. [ ] 控制台无「userId 格式不正确」相关错误
- **依赖**: 无
