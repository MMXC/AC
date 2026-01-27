---
id: TASK-51
title: 修改加入房间接口支持房主身份识别
status: In Progress
assignee: []
created_date: '2026-01-27 22:04'
updated_date: '2026-01-27 22:05'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
修改 `POST /api/v1/rooms/:roomId/join` 接口，支持可选的 `userId` 参数。如果请求中传入 `userId` 且该 `userId` 等于 `Room.hostId`，则识别为房主，复用现有的 RoomMember 记录（更新 `leftAt` 为 null，`lastActiveAt` 为当前时间），返回 `isHost: true`。如果 `userId` 不等于 `hostId` 或未传入，则按现有逻辑创建新成员。

**Test Command**: `cd watch-together-server && npm test -- rooms-join`

**测试用例**:

**测试场景**:
1. 房主使用 hostUserId 加入房间应识别为房主
2. 普通成员加入房间应创建新成员
3. 传入无效 userId 应创建新成员
4. 不传 userId 应保持向后兼容

**断言示例**:
1. `expect(response.body.data.isHost).toBe(true)`
2. `expect(response.body.data.userId).toBe(hostUserId)`
3. `const member = await prisma.roomMember.findUnique({ where: { userId: hostUserId } })`
4. `expect(member.leftAt).toBeNull()`

**Test Command**: `cd watch-together-server && npm test -- rooms-join`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `/join` 接口支持可选的 `userId` 请求参数
- [ ] #2 当传入的 `userId` 等于 `Room.hostId` 时，识别为房主
- [ ] #3 房主加入时复用现有 RoomMember 记录，更新 `leftAt` 为 null
- [ ] #4 房主加入时返回 `isHost: true`
- [ ] #5 普通成员加入时仍生成新的 `userId`，返回 `isHost: false`
- [ ] #6 传入无效的 `userId`（不等于 hostId）时，仍创建新成员
- [ ] #7 接口向后兼容，不传 `userId` 时行为不变
<!-- AC:END -->
