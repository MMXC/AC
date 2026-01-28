---
backlog_id: backlog-54
task: 添加房主加入房间的集成测试
test_command: "cd watch-together-server && npm test -- rooms-join-host
cd watch-together-server && npm test -- rooms-join-host"
---

# Task: 添加房主加入房间的集成测试

## Description

在 `watch-together-server/tests/` 中添加或更新测试文件，测试房主使用 `hostUserId` 加入房间的场景。验证房主身份识别、RoomMember 记录复用、返回数据正确性。

**Test Command**: `cd watch-together-server && npm test -- rooms-join-host`

**测试用例**:

**测试数据**:
1. 输入: `创建房间后，使用 hostUserId 调用 `/join` 接口`
   预期输出: `返回 `isHost: true`，RoomMember 记录更新`

**测试场景**:
1. 房主首次加入房间（创建时已创建 RoomMember）
2. 房主重新加入房间（RoomMember 的 leftAt 不为 null）
3. 普通成员加入房间（不应受影响）

**断言示例**:
1. `expect(response.body.data.isHost).toBe(true)`
2. `expect(member.leftAt).toBeNull()`
3. `expect(member.lastActiveAt).toBeDefined()`

**Test Command**: `cd watch-together-server && npm test -- rooms-join-host`

## Success Criteria

- [x] 测试文件创建或更新完成
- [x] 测试房主使用 hostUserId 加入房间的场景
- [x] 验证返回的 `isHost` 为 `true`
- [x] 验证 RoomMember 记录被正确复用（leftAt 为 null）
- [x] 验证普通成员加入场景不受影响
- [x] 所有测试用例通过
