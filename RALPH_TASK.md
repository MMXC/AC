---
backlog_id: backlog-43
task: “指定操作来源成员”与房主端执行逻辑（仅房主执行真实操作）
test_command: "cd watch-together && npm test -- operation-source
cd watch-together && npm test -- operation-source"
---

# Task: “指定操作来源成员”与房主端执行逻辑（仅房主执行真实操作）

## Description

基于前述数据模型与画面流，完整实现“指定操作来源成员”的逻辑：在 Room 中维护 operationSourceUserId（或状态表），提供 `POST /api/v1/rooms/:roomId/operation-source` 接口（仅房主可调用）设置/清除操作来源。前端成员列表增加右键或菜单项“设为操作来源/取消”，房主可选择某成员。被指定成员端，仅在“画面层”监听点击/拖动等操作，将这些输入事件封装为 OP_SOURCE_OPERATION WebSocket 消息发给服务器，服务器仅转发给房主连接。房主端收到后，在本地真实 iframe 页面内模拟这些操作，最终效果通过画面流自然同步给所有成员。

**Test Command**: `cd watch-together && npm test -- operation-source`

**Test Command**: `cd watch-together && npm test -- operation-source`

## Success Criteria

- [x] 只有房主可以成功设置/取消 operationSourceUserId，普通成员调用返回 403 或 ERROR。
- [x] 被指定成员在画面上点击/拖动时，房主真实页面产生对应操作，其它成员只通过画面看到结果，无 DOM 级事件。
- [x] 未被指定成员在画面上点击不会触发任何远程执行。
- [x] 取消操作来源后，之前的成员再操作画面不会再触发房主端执行。
