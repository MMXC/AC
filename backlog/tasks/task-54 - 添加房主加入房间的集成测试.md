---
id: TASK-54
title: 添加房主加入房间的集成测试
status: To Do
assignee: []
created_date: '2026-01-27 22:04'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
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
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 测试文件创建或更新完成
- [ ] #2 测试房主使用 hostUserId 加入房间的场景
- [ ] #3 验证返回的 `isHost` 为 `true`
- [ ] #4 验证 RoomMember 记录被正确复用（leftAt 为 null）
- [ ] #5 验证普通成员加入场景不受影响
- [ ] #6 所有测试用例通过
<!-- AC:END -->
