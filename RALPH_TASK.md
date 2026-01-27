---
backlog_id: backlog-47
task: 修复房主跳转和分享房间链接功能
test_command: "cd watch-together && npm test -- create-room-ui
cd watch-together && npm test -- create-room-ui"
---

# Task: 修复房主跳转和分享房间链接功能

## Description

修复创建房间后房主未自动跳转的问题，确保创建成功后正确跳转到 `/room/:roomId` 页面。在房间页面添加分享房间链接按钮，房主可见。

**Test Command**: `cd watch-together && npm test -- create-room-ui`

**测试用例**:

**测试数据**:
1. 输入: `创建房间表单提交`
   预期输出: `自动跳转到房间页面，显示分享按钮`

**测试场景**:
1. 创建房间后应自动跳转到房间页面
2. 房主进入房间后应看到分享链接按钮
3. 普通成员进入房间后不应看到分享按钮
4. 点击分享按钮应复制房间链接到剪贴板

**断言示例**:
1. `expect(window.location.pathname).toBe(`/room/${roomId}`)`
2. `expect(document.getElementById('shareRoomButton')).not.toBeNull()`

**Test Command**: `cd watch-together && npm test -- create-room-ui`

## Success Criteria

- [x] 创建房间成功后，房主自动跳转到 `/room/:roomId` 页面
- [x] 跳转逻辑正确执行，无错误阻止跳转
- [x] 房间页面显示分享房间链接按钮（仅房主可见）
- [x] 点击分享按钮可以复制房间链接
- [x] 普通成员不显示分享按钮
