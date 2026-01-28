---
id: TASK-52
title: 更新前端房主加入逻辑
status: Done
assignee: []
created_date: '2026-01-27 22:04'
updated_date: '2026-01-28 04:01'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
修改 `watch-together/js/room.js` 中的 `joinRoomWithNickname` 函数，当检测到房主身份时（通过 localStorage 中的 `isHost` 标识），在调用 `/join` 接口时传入 `userId` 参数（从 localStorage 读取的 `watch-together.userId`）。确保房主使用正确的 `hostUserId` 加入房间。

**Test Command**: `cd watch-together && npm test -- room-init`

**测试用例**:

**测试数据**:
1. 输入: `localStorage 中有 `watch-together.isHost: 'true'` 和 `watch-together.userId: 'user-abc123'``
   预期输出: `API 请求包含 `{ nickname: "alex", userId: "user-abc123" }`，返回 `isHost: true``

**测试场景**:
1. 房主自动加入时应传入 hostUserId
2. 普通成员加入时不应传入 userId
3. 房主加入后应显示房主界面
4. 普通成员加入后应显示成员界面

**断言示例**:
1. `expect(requestBody.userId).toBe(hostUserId)`
2. `expect(joinData.data.isHost).toBe(true)`
3. `expect(window.isHost).toBe(true)`

**Test Command**: `cd watch-together && npm test -- room-init`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `joinRoomWithNickname` 函数检查是否为房主（通过 localStorage 或参数）
- [ ] #2 如果是房主，在 API 请求中传入 `userId` 参数
- [ ] #3 传入的 `userId` 来自 localStorage 中的 `watch-together.userId`
- [ ] #4 普通成员加入时不传 `userId` 参数
- [ ] #5 房主加入后正确识别为房主（`isHost: true`）
- [ ] #6 房主加入后显示房主界面（iframe、修改 URL 按钮等）
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-01-28 12:01:09 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-52
task: 更新前端房主加入逻辑
test_command: "cd watch-together && npm test -- room-init
cd watch-together && npm test -- room-init"
---

# Task: 更新前端房主加入逻辑

## Description

修改 `watch-together/js/room.js` 中的 `joinRoomWithNickname` 函数，当检测到房主身份时（通过 localStorage 中的 `isHost` 标识），在调用 `/join` 接口时传入 `userId` 参数（从 localStorage 读取的 `watch-together.userId`）。确保房主使用正确的 `hostUserId` 加入房间。

**Test Command**: `cd watch-together && npm test -- room-init`

**测试用例**:

**测试数据**:
1. 输入: `localStorage 中有 `watch-together.isHost: 'true'` 和 `watch-together.userId: 'user-abc123'``
   预期输出: `API 请求包含 `{ nickname: "alex", userId: "user-abc123" }`，返回 `isHost: true``

**测试场景**:
1. 房主自动加入时应传入 hostUserId
2. 普通成员加入时不应传入 userId
3. 房主加入后应显示房主界面
4. 普通成员加入后应显示成员界面

**断言示例**:
1. `expect(requestBody.userId).toBe(hostUserId)`
2. `expect(joinData.data.isHost).toBe(true)`
3. `expect(window.isHost).toBe(true)`

**Test Command**: `cd watch-together && npm test -- room-init`

## Success Criteria

- [x] `joinRoomWithNickname` 函数检查是否为房主（通过 localStorage 或参数）
- [x] 如果是房主，在 API 请求中传入 `userId` 参数
- [x] 传入的 `userId` 来自 localStorage 中的 `watch-together.userId`
- [x] 普通成员加入时不传 `userId` 参数
- [x] 房主加入后正确识别为房主（`isHost: true`）
- [x] 房主加入后显示房主界面（iframe、修改 URL 按钮等）
```
<!-- SECTION:NOTES:END -->
