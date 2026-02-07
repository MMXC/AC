---

# 需求概要：用户房间 UI 重设计（类似抖音直播间）

- **类型**: page
- **范围**: watch-together 项目 join.html 房间页
- **目标**: 将当前房间页重设计为类似抖音直播间的布局与交互：内容为主、全屏/近全屏主区、顶部/右侧/底部 overlay 控件、移动端优先。

---

### 任务 1: 房间页主内容区全屏布局骨架

- **ID**: room-ui-layout-main
- **描述**: 将 join.html 从「左侧边栏 + 右侧内容区」改为内容为主的布局骨架：主内容区（共享 iframe/视频）全屏或近全屏占据可视区域；左侧房间信息、成员列表、聊天改为可收起/浮层或移除固定占位，不再长期占用主区域宽度。先完成布局与主内容区占位，不要求 overlay 控件样式。
- **测试命令**: 手动：在桌面视口打开房间页，确认主内容区占满或接近占满可视区域；或 `skill:watch-together-webapp-testing ${TASK_ID}`（若已配置）
- **成功标准**:
  1. [ ] 主内容区（.browser-area / iframe 容器）在桌面视口下占据除必要边距外的主要可视区域（如 ≥80% 宽度或全宽）
  2. [ ] 原左侧边栏不再以固定宽度长期占据左侧，改为可收起、浮层或底部/侧边抽屉入口
  3. [ ] 页面仍能正常加载房间、展示共享 iframe 与现有功能入口（可暂用临时入口进入成员/聊天）
- **测试用例**:
  - **测试数据**: 无
  - **测试场景**:
    1. 房主或成员打开 join.html 进入房间，确认主内容区（iframe 区域）为视觉主体
    2. 确认左侧无固定宽侧栏长期遮挡主内容
  - **断言示例**: 主内容区宽度占比符合预期，无固定左侧栏占位
- **依赖**: 无

---

### 任务 2: 房间页顶部 overlay（返回、房主信息、观看人数）

- **ID**: room-ui-overlay-top
- **描述**: 在房间页主内容区之上增加顶部 overlay 层：含返回/关闭按钮、房主头像或房间名、观看人数（或当前成员数）。overlay 半透明或毛玻璃，不遮挡主内容过多；移动端需可点击。
- **测试命令**: 手动：在房间页检查顶部是否出现返回、房主信息、人数；或 `skill:watch-together-webapp-testing ${TASK_ID}`（若已配置）
- **成功标准**:
  1. [ ] 顶部 overlay 含返回或关闭按钮，点击可离开房间或返回上一页
  2. [ ] 顶部 overlay 展示房主头像或房间名（可从现有房间信息取数）
  3. [ ] 顶部 overlay 展示观看人数或当前成员数（可与现有成员列表数据同步）
- **测试用例**:
  - **测试数据**: 无
  - **测试场景**:
    1. 进入房间页，确认顶部有返回、房主/房间名、人数
    2. 点击返回/关闭，确认可退出或返回
  - **断言示例**: 顶部 overlay 三要素存在且返回可操作
- **依赖**: room-ui-layout-main

---

### 任务 3: 房间页右侧竖条快捷操作（点赞、分享、成员入口）

- **ID**: room-ui-overlay-right
- **描述**: 在房间页主内容区右侧增加竖条 overlay，含至少 2 个快捷操作：如点赞、分享/邀请、成员列表入口等。图标+文案或纯图标均可，点击行为与现有功能或预留接口一致。
- **测试命令**: 手动：在房间页检查右侧竖条及至少 2 个操作按钮；或 `skill:watch-together-webapp-testing ${TASK_ID}`（若已配置）
- **成功标准**:
  1. [ ] 右侧竖条 overlay 存在，不长期遮挡主内容中心区域
  2. [ ] 含至少 2 个快捷操作（如点赞、分享房间链接、成员/列表入口）
  3. [ ] 点击分享/邀请可复制房间链接或打开分享；成员入口可打开成员列表或抽屉
- **测试用例**:
  - **测试数据**: 无
  - **测试场景**:
    1. 进入房间页，确认右侧竖条存在且至少 2 个按钮可点
    2. 点击分享与成员入口，确认有对应反馈（如复制成功、列表展开）
  - **断言示例**: 右侧竖条存在，至少 2 个操作可用
- **依赖**: room-ui-layout-main

---

### 任务 4: 房间页聊天/评论以底部或 overlay 展示且可收起

- **ID**: room-ui-overlay-chat
- **描述**: 将现有聊天区域从固定侧栏改为底部区域或 overlay 形式：可收起/展开，不长期遮挡主内容；展开时显示原有聊天消息与输入框，行为与现有 chat 逻辑一致。
- **测试命令**: 手动：在房间页展开/收起聊天，发一条消息确认展示与发送正常；或 `skill:watch-together-webapp-testing ${TASK_ID}`（若已配置）
- **成功标准**:
  1. [ ] 聊天以底部区域或浮层形式展示，默认可收起或半高，不长期占满主内容
  2. [ ] 有明确入口（如底部「评论/聊天」按钮）展开聊天区域
  3. [ ] 展开后聊天消息列表与输入框可用，发送与接收与现有逻辑一致
- **测试用例**:
  - **测试数据**: 无
  - **测试场景**:
    1. 进入房间，确认聊天可收起/展开
    2. 展开后发送一条消息，确认自己与对方（若有）可见
  - **断言示例**: 聊天可收起/展开，发送接收正常
- **依赖**: room-ui-layout-main

---

### 任务 5: 房间页 375px 移动端视口适配

- **ID**: room-ui-mobile-viewport
- **描述**: 在 375px 宽度视口（或 320px）下，房间页布局正常：主内容区、顶部 overlay、右侧竖条、聊天入口均可用，无横向溢出，主要按钮可点击。
- **测试命令**: 手动：将视口设为 375px 宽度，检查布局与主要操作；或 `skill:watch-together-webapp-testing ${TASK_ID}`（若已配置）
- **成功标准**:
  1. [ ] 375px 视口下无横向滚动条，无内容明显溢出
  2. [ ] 顶部 overlay、右侧竖条、聊天入口在移动视口下可见且可点
  3. [ ] 主内容区在移动端仍为主体，可读/可用
- **测试用例**:
  - **测试数据**: 无
  - **测试场景**:
    1. 将浏览器视口调整为 375px 宽，打开房间页
    2. 依次点击顶部返回、右侧操作、聊天入口，确认无错位与遮挡导致无法点击
  - **断言示例**: 375px 下无横向溢出，主要控件可操作
- **依赖**: room-ui-layout-main

---

# 需求概要：消除「无效的 WebSocket 消息格式: undefined」控制台报错

- **类型**: chore（缺陷修复）
- **范围**: watch-together 前端 screen-streaming.js 与同一 WebSocket 的消息处理
- **问题**: 控制台持续出现 `screen-streaming.js:230 无效的 WebSocket 消息格式: undefined`。同一 WebSocket 被 chat.js、screen-streaming.js、webrtc-manager.js 共用；handleWebSocketMessage 在 `event.data` 为 undefined 时进入 else 并打印错误。可能原因：浏览器对 ping/空帧等触发的 message 事件、或某处派发了无 data 的 message 事件。

---

### 任务 1: 对无 data 的 WebSocket message 事件静默忽略并消除报错

- **ID**: screen-streaming-ws-message-undefined-silent
- **描述**: 在 screen-streaming.js 的 handleWebSocketMessage 中，当 event 或 event.data 为 null/undefined 时静默返回，不再打印「无效的 WebSocket 消息格式: undefined」；可选：在开发环境下用 console.debug 记录一次便于排查根因。修复后控制台不再持续出现该错误。
- **测试命令**: 手动：进入房间并保持连接（可开启屏幕共享、收发聊天），观察控制台是否仍出现「无效的 WebSocket 消息格式: undefined」；或 `skill:watch-together-webapp-testing ${TASK_ID}`（若已配置）
- **成功标准**:
  1. [ ] 当 event 或 event.data 为 null/undefined 时，handleWebSocketMessage 直接 return，不执行 console.error
  2. [ ] 正常房间内操作（加入、聊天、共享）不受影响，SCREEN_STREAM_* 等消息仍能正常处理
  3. [ ] 控制台在相同操作下不再出现「无效的 WebSocket 消息格式: undefined」
- **测试用例**:
  - **测试数据**: 无
  - **测试场景**:
    1. 房主进入房间，开启屏幕共享，成员加入，收发聊天，保持一段时间
    2. 观察控制台：不应再出现「无效的 WebSocket 消息格式: undefined」
  - **断言示例**: 控制台无该错误输出，画面与聊天功能正常
- **依赖**: 无

---

# 需求概要：成员端收不到房主画面流（一直显示「正在建立连接」）

- **类型**: chore（缺陷修复）
- **范围**: watch-together 房主端 WebRTC 信令与成员列表同步
- **现象**: 成员端一直显示「房主正在共享，正在建立连接」、控制台有「画面流开始」但无画面；服务端持续打印「信令目标用户不在线」且 toUserId 为 82f7a853、48be06ae 等（非当前成员 ID）。
- **原因分析**:
  1. 房主端成员列表未随 MEMBER_LEFT 更新，或房主仍向历史/已离开用户（82f7a853、48be06ae）重复发送 WebRTC Offer，导致服务端报「信令目标用户不在线」且浪费信令。
  2. 新加入成员（如 ed244f6b）未收到 Offer：可能 MEMBER_JOINED 未在房主端触发 handleMemberJoinedRoom、或 SYNC_STATE 先于 MEMBER_JOINED 到达且当前仅 MEMBER_JOINED 会触发「向新成员发 Offer」，SYNC_STATE 未对「已在共享时」的成员列表中尚无 PeerConnection 的成员补发 Offer。

---

### 任务 1: 房主收到 SYNC_STATE 且正在共享时向尚无 PeerConnection 的成员补发 Offer

- **ID**: host-sync-state-send-offer-to-new-members
- **描述**: 房主端收到 SYNC_STATE 时，若当前正在共享（screenStreamState.isStreaming 为 true），则对当前 getMembersList() 中除自己外、且尚未建立 PeerConnection 的成员逐个调用 addPeerConnectionForMember，补发 WebRTC Offer。这样即使 MEMBER_JOINED 未到达或晚于 SYNC_STATE，新成员也能在 SYNC_STATE 全量同步成员列表后收到画面流。可与 chat.js 中 SYNC_STATE 处理成员列表后派发自定义事件、或 screen-streaming 监听 SYNC_STATE 后执行补发逻辑；实现时需避免重复向已有连接的成员发 Offer。
- **测试命令**: 手动：房主先开启共享，再让新成员加入房间，确认成员端在「画面流开始」后能收到画面；或 `skill:watch-together-webapp-testing ${TASK_ID}`（若已配置）
- **成功标准**:
  1. [ ] 房主收到 SYNC_STATE 且正在共享时，对列表中尚无 PeerConnection 的成员补发 WebRTC Offer
  2. [ ] 新成员加入后（仅靠 SYNC_STATE 同步列表）成员端能在约定时间内收到画面，不再一直显示「正在建立连接」
  3. [ ] 已有 PeerConnection 的成员不会被重复发 Offer（无重复连接）
- **测试用例**:
  - **测试数据**: 无
  - **测试场景**:
    1. 房主进入房间并开启屏幕共享
    2. 新成员加入房间（或模拟 SYNC_STATE 先于 MEMBER_JOINED 到达）
    3. 确认成员端在几秒内出现房主画面，服务端无向该成员「信令目标用户不在线」
  - **断言示例**: 成员端有画面流、无「信令目标用户不在线」针对当前成员 ID
- **依赖**: 无（与 member-left-broadcast-and-list-remove、webrtc-signal-current-members-only 协同可进一步减少向已离开用户发信令）

## Visual Specs (JSON Canvas)

> 待步骤 2a 生成：需求可视化建模（用例图/用户流程图）
> 文件将保存到：`designs/canvas/<need-id>-*.canvas`

## UI / UX Design System

> 待步骤 2b 生成：UI/UX 设计系统文档
> 文件将保存到：`designs/ui/<need-id>-design-system.md`
