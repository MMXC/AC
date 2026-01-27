# Watch Together 房间角色与状态模型（角色与房间状态模型）

本文档定义后端视角下的房间与成员角色模型，并明确房主不可变更规则、`Room.hostId` / `Room.currentUrl` 的单一真源语义，以及房主刷新 / 重连、成员加入 / 离开的状态流转。前端与 WebSocket 层在实现时应严格遵守本模型，确保“只有房主持有真实网页，其它成员只观看画面”的约束。

## 1. 角色模型

### 1.1 角色类型

- **房主（Host）**
  - 定义：创建房间的人，对应唯一且不可变更的用户标识。
  - 身份标识：`Room.hostId`（详见下文）。
  - 职责与权限：
    - 唯一拥有“真实网页”的浏览器实例，在本地通过 `iframe` 或浏览器标签打开被共享的 URL。
    - 作为所有共享操作的执行端：页面加载、滚动、点击、输入等都在房主浏览器中真实发生。
    - 拥有页面控制权：可以变更 `Room.currentUrl`、切换“操作来源成员”（`Room.operationSourceUserId`），以及决定是否允许某个成员获得控制权。
    - 维护房间生命周期：可关闭房间、踢出成员等（具体接口在后续任务中实现）。
  - 不可变更规则：
    - **房主身份由 `Room.hostId` 决定，`Room.hostId` 在房间创建后不得被修改。**
    - 任意时刻全局唯一“真正的房主用户”即为 `Room.hostId` 所指向的用户；其他成员即便拥有控制权，也不是房主，只是“操作来源”。

- **普通成员（Member）**
  - 定义：通过房间分享链接加入的用户，永远不是房主。
  - 职责与权限：
    - 接收房主浏览器的“画面流”或“画布投影”，**只看到共享画面，不直接访问被嵌入网页的 DOM**。
    - 可以发送互动指令：聊天消息、请求控制权、建议跳转到某个 URL 等，但本身不直接对真实 DOM 进行操作。
    - 在被房主指定为“操作来源成员”时，其输入（例如滚动、点击、按键）会被转发给房主浏览器，由房主浏览器代为执行。
  - 身份标识：`RoomMember.userId`（与 `Room.hostId` 对比说明见下文）。

### 1.2 房主 vs 操作来源成员

- **房主 (`Room.hostId`)**
  - 系统层面的“所有者”概念，代表房间的创建者。
  - 不随成员离开 / 加入而改变。
  - 决定谁可以成为“操作来源成员”，以及是否接受其操作。

- **操作来源成员 (`Room.operationSourceUserId`，可选字段)**
  - 表示“当前由谁的输入驱动房主浏览器执行操作”。
  - 可能等于 `Room.hostId`（房主自己控制），也可能指向某个普通成员的 `userId`（房主将控制权授予该成员）。
  - 操作流程：
    - 客户端（成员）把操作意图通过 WebSocket 上报到服务器（例如 SCROLL、CLICK、KEYPRESS）。
    - 服务器根据 `Room.operationSourceUserId` 判定该成员是否拥有控制权。
    - 若有控制权，服务器将操作指令路由 / 广播到房主浏览器，由房主浏览器在真实 DOM 上执行。
  - **重要：即便 `operationSourceUserId` 指向某个普通成员，该成员仍然不是房主，只是“远程控制者”，真实页面始终在房主浏览器中。**

## 2. 数据模型与单一真源语义

### 2.1 Room 模型中的关键字段

当前 Prisma `Room` 模型（`prisma/schema.prisma`）中已经包含以下关键字段：

- `hostId: String`  
  - 含义：**房间创建时生成的房主用户 ID，是“房主身份”的单一真源（Single Source of Truth）。**
  - 语义约束：
    - 只在创建房间时写入一次。
    - 后续任何业务场景不得修改该字段（房主身份不可转移）。
    - 所有需要判断“是否为房主”的逻辑，不应直接依赖 `RoomMember.isHost`，而应以 `Room.hostId` 为准。

- `currentUrl: String?`  
  - 含义：**当前房间正在被房主浏览器打开的真实网页 URL，是“共享页面 URL”的单一真源。**
  - 语义约束：
    - 仅通过受控接口（如 `PUT /api/v1/rooms/:roomId/url` 或 WebSocket `URL_CHANGE` 消息）修改。
    - 前端所有与“当前页面”相关的显示与逻辑，必须以 `Room.currentUrl` 为最终依据，而非客户端本地状态。
    - WebSocket 状态同步（`SYNC_STATE`）中包含的 URL，必须与 `Room.currentUrl` 一致。

- `operationSourceUserId: String?`（将在后续任务中在 `Room` 中新增）
  - 含义：当前被房主授予操作权限的成员 `userId`。
  - 语义约束：
    - 若为空，表示只有房主自己可以操作页面。
    - 若不为空，表示该成员拥有操作控制权，其输入通过服务器转发给房主浏览器执行。
    - 不改变 `Room.hostId`，仅影响“谁在控制鼠标 / 键盘”。

### 2.2 RoomMember 模型中的补充字段

`RoomMember` 模型中的关键字段：

- `roomId: String`：所属房间。
- `userId: String`：成员级别的用户标识，用于区分不同连接 / 会话。
- `isHost: Boolean`：
  - 语义约束：
    - 在新模型下，`isHost` 应始终与 `Room.hostId` 一致：  
      某个 `RoomMember` 的 `userId === Room.hostId` 时，其 `isHost` 必须为 `true`；其他成员必须为 `false`。
    - `isHost` 是方便查询与前端展示的“派生字段”（Derived Data），真正的权威来源仍然是 `Room.hostId`。

> **总结：**  
> - `Room.hostId`：房主身份的唯一真源。  
> - `Room.currentUrl`：共享页面 URL 的唯一真源。  
> - `Room.operationSourceUserId`：当前操作来源成员的唯一真源（可选）。  
> - `RoomMember.isHost`：从 `Room.hostId` 派生的便捷标记，不应反向驱动业务规则。

## 3. 交互与状态流转

本节从时间维度描述房间在典型场景中的状态流转，确保“房主 / 成员角色”和上述数据字段在任何时刻都有清晰、一致的含义。

### 3.1 创建房间

1. **房主在前端创建房间**
   - 前端通过 `POST /api/v1/rooms`（以及后续任务中的扩展版本：创建时即指定初始 `url`）向后端发起请求。
   - 后端生成：
     - `roomId = room-xxxxxxxx`
     - `hostId = user-xxxxxxxx`（新生成的房主用户 ID）
   - 在数据库中写入：
     - `Room` 记录：
       - `id = roomId`
       - `hostId = hostId`（**此后不再更改**）
       - `currentUrl = 初始 URL（可选，后续任务中强制要求）`
     - `RoomMember` 记录：
       - `roomId = roomId`
       - `userId = hostId`
       - `isHost = true`
   - 可选：`Room.operationSourceUserId` 初始化为 `hostId`，表示初始由房主自己控制页面。

2. **房主前端初始化**
   - 房主浏览器：
     - 以 `Room.currentUrl` 为基准，在本地 `iframe` 中加载真实网页。
     - 建立 WebSocket 连接，携带 `roomId` 与 `userId = hostId`。
   - 服务器：
     - 将该连接登记为“房主连接”，并与 `Room.hostId` 关联。
     - 为后续画面采集与操作同步做好准备。

### 3.2 普通成员加入房间

1. **成员通过房间链接加入**
   - 前端通过 `POST /api/v1/rooms/:roomId/join` 接口加入，后端创建新的 `RoomMember` 记录：
     - `roomId = roomId`
     - `userId = user-xxxxxxxx`
     - `isHost = false`

2. **成员前端初始化**
   - 成员浏览器：
     - 仅渲染“共享画面”的容器（例如 `<video>` 标签或 `<canvas>`），**不在本地加载真实网页的 iframe，也不访问被共享页面的 DOM**。
     - 建立 WebSocket 连接，订阅房间内的画面流、URL 变更、聊天消息和状态同步。

3. **成员请求控制权（可选）**
   - 成员通过 WebSocket 发送“请求控制权”的消息。
   - 房主端 UI 决定是否授予：
     - 若同意，后端将 `Room.operationSourceUserId` 更新为该成员的 `userId`。
     - 之后，该成员的操作指令（滚动、点击、输入）将被路由到房主浏览器执行。

> **关键约束：** 普通成员全程只与“画面流 / 投影”和高层操作协议打交道，**绝不直接访问被共享网页的 DOM**。所有真实 DOM 操作都在房主浏览器中进行。

### 3.3 房主刷新或重进房间

房主刷新页面或临时断线重连时，必须保持其“房主身份”的一致性，不能因为刷新而变成普通成员。

1. **身份凭证与重连流程（推荐方案）**
   - 在房间创建成功后，后端返回：
     - `roomId`
     - `hostId`（房主用户 ID）
     - 可选的 `hostToken`（加密的房主令牌，用于后续鉴权）
   - 前端将 `hostId` / `hostToken` 安全地保存到本地（例如 `localStorage` 或安全存储）。
   - 当房主刷新或重新打开链接时：
     - 前端会携带 `roomId + hostId`（或 `hostToken`）再次调用“加入房间 / 重连”接口。
     - 后端根据 `Room.hostId` 与传入的 `hostId` / `hostToken` 进行校验：
       - 若匹配，则：
         - 为该连接创建新的 `RoomMember` 记录（或者恢复原有记录），并保证：
           - `userId === Room.hostId`
           - `isHost = true`
         - 将旧的房主连接标记为离线（`leftAt` 填充）。
       - 若不匹配，则视为普通成员（`isHost = false`），不得修改 `Room.hostId`。

2. **状态与数据一致性**
   - **房主身份一致性：**
     - 无论房主刷新多少次，只要携带有效的 `hostId` / `hostToken`，后端均应保证：
       - `Room.hostId` 不变；
       - 当前在线的“房主连接”与 `Room.hostId` 对应。
   - **URL 一致性：**
     - 房主重连后，前端根据 `Room.currentUrl` 重新加载页面。
     - WebSocket 状态同步（`SYNC_STATE`）会在连接建立时下发当前 `Room.currentUrl` 和成员列表，确保所有人视图一致。

3. **房主完全离线的情况**

当房主浏览器关闭且长时间不再重连时，可以有两种策略（由产品策略决定，本文仅定义约束）：

- **策略 A：房间保持存在，等待房主回归**
  - `Room.hostId` 仍然保留。
  - 普通成员可以继续在聊天区交流或查看最后一帧画面，但无法控制页面。
  - 当房主重新连接时，按上述“重连流程”恢复控制权。

- **策略 B：房间自动结束**
  - 当检测到房主长时间离线（例如 30 分钟），自动将 `Room.deletedAt` 置位或标记房间结束。
  - 普通成员被通知房间已关闭。

无论采用哪种策略，**都不允许将房主身份转移给其他成员，也不允许修改 `Room.hostId`。**

### 3.4 成员离开房间

1. **主动离开**
   - 成员调用 `POST /api/v1/rooms/:roomId/leave`。
   - 后端将该成员的 `RoomMember.leftAt` 设置为当前时间。
   - 若该成员正是 `Room.operationSourceUserId`，则需要：
     - 将 `Room.operationSourceUserId` 置空，或切回 `Room.hostId`，以确保后续操作不会再来自已离线成员。

2. **异常断开**
   - WebSocket 心跳检测发现连接超时（如 5 分钟无 `pong`），服务器主动断开连接并更新：
     - `RoomMember.leftAt` 或 `lastActiveAt`。
     - 如为 `operationSourceUserId`，同样需要回收控制权。

3. **对房间状态的影响**
   - 普通成员离开不会影响：
     - `Room.hostId`（房主身份不变）。
     - `Room.currentUrl`（共享页面仍保持）。
   - 当所有普通成员离开，仅剩房主时，房间仍然有效；是否自动关闭由业务策略另行定义。

## 4. “普通成员只看到画面，不直接访问 DOM” 的约束

为了保证安全性与一致性，需要明确以下约束：

- **前端约束**
  - 房主页面：
    - 在本地创建并维护真实 `iframe` 或浏览器标签。
    - 负责捕获用户操作（包括来自 `operationSourceUserId` 的远程操作）并作用于真实 DOM。
  - 普通成员页面：
    - 仅包含用于展示的“画面容器”（`<video>` / `<canvas>` / WebRTC 渲染视图等）。
    - 不加载真实网页的 HTML / JS，不执行第三方脚本，不访问 DOM。

- **后端与 WebSocket 约束**
  - 任何来自普通成员的“操作消息”（如点击、滚动、键盘输入）都被视为**高层协议事件**，其含义是“请求房主浏览器执行某个动作”，而非“直接修改远端 DOM”。
  - WebSocket 层通过 `Room.operationSourceUserId` 判断是否接受该操作，并在必要时将其转发给房主浏览器。
  - 后端不向普通成员下发真实 DOM 结构，只下发与画面流 / 状态同步相关的高层数据（例如当前 URL、成员列表、聊天消息、光标位置等）。

> **结论：**  
> - **真实网页只在房主浏览器中存在**，普通成员永远不直接接触该 DOM。  
> - 任何对真实页面的操作都必须通过房主浏览器中运行的代码来完成。  
> - 服务器与 WebSocket 层只负责“状态同步与操作路由”，不暴露底层页面实现细节。

## 5. 小结

- 本文档定义了三类关键标识及其单一真源语义：
  - `Room.hostId`：房主身份唯一标识，不可变更。
  - `Room.currentUrl`：当前共享页面的真实 URL，所有客户端以此为准。
  - `Room.operationSourceUserId`：当前拥有操作控制权的成员标识（可选）。
- 明确了房主 / 普通成员的职责边界，并强调：
  - 房主创建房间并永久作为该房间的唯一房主。
  - 普通成员只能通过分享链接加入，永远不是房主。
  - 普通成员只看到房主浏览器的画面投影，不直接访问被嵌入网页的 DOM。
- 描述了创建房间、房主刷新 / 重连、成员加入 / 离开的完整状态流转，为后续后端接口与前端实现提供统一的语义基础。

