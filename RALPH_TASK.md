---
backlog_id: backlog-46
task: 修复 WebSocket 消息 JSON 解析错误
test_command: "cd watch-together && npm test -- screen-streaming
cd watch-together && npm test -- screen-streaming"
---

# Task: 修复 WebSocket 消息 JSON 解析错误

## Description

修复 `screen-streaming.js` 中 WebSocket 消息解析错误。`chat.js` 已经解析了 `event.data` 为对象，但 `screen-streaming.js` 再次尝试 `JSON.parse` 导致错误。需要检查 `event.data` 类型，如果已是对象则直接使用。

**Test Command**: `cd watch-together && npm test -- screen-streaming`

**测试用例**:

**测试数据**:
1. 输入: `WebSocket 消息（字符串或对象格式）`
   预期输出: `消息正确解析，无 JSON 解析错误`

**测试场景**:
1. 接收字符串格式的 WebSocket 消息应正确解析
2. 接收对象格式的 WebSocket 消息应直接使用
3. 画面流相关消息应正确处理

**断言示例**:
1. `expect(() => handleWebSocketMessage({data: '{"type":"test"}'})).not.toThrow()`
2. `expect(() => handleWebSocketMessage({data: {type: 'test'}})).not.toThrow()`

**Test Command**: `cd watch-together && npm test -- screen-streaming`

## Success Criteria

- [ ] `screen-streaming.js` 的 `handleWebSocketMessage` 函数检查 `event.data` 类型
- [ ] 如果 `event.data` 是字符串，使用 `JSON.parse` 解析
- [ ] 如果 `event.data` 已经是对象，直接使用
- [ ] 浏览器控制台无 `"[object Object]" is not valid JSON` 错误
- [ ] 画面流功能正常工作
