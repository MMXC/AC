## TASK-131 房主端成员列表实时同步笔记

- **问题现象**：自动化测试中，新成员加入后房主端成员列表未出现「测试成员」，导致 `skill:watch-together-webapp-testing TASK-131` 场景 1 失败。
- **根因分析**：成员列表的真实数据源在 `room.js`（`membersList` + `setMembersList`），而聊天 WebSocket 在 `chat.js` 中使用 `addMember/removeMember` 增量更新；当存在时序与多连接组合时，可能导致列表未完全与服务端 SYNC_STATE 对齐。
- **修复策略**：在 `chat.js` 处理 `SYNC_STATE` 时，优先调用 `setMembersList`，将服务端返回的 `{ userId, nickname }` 规范化为 `{ id, name }` 全量覆盖成员列表；仅在 `setMembersList` 不可用时退回到旧的 `addMember/removeMember` 增量同步逻辑。
- **预期效果**：每次收到 `SYNC_STATE` 后，房主端和成员端的成员列表都会与服务端状态完全一致，新成员加入后房主端成员列表稳定显示该成员，满足 TASK-131 的自动化测试场景。

