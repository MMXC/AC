---
id: TASK-48
title: 修复房主昵称自动读取功能
status: Done
assignee: []
created_date: '2026-01-27 15:49'
updated_date: '2026-01-27 17:09'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
房主创建房间时填写的昵称应在跳转后自动读取，无需重新输入。在 `create-room.js` 中将 `hostNickname` 保存到 localStorage，在 `room.js` 的 `init()` 函数中检查是否为房主，如果是则从 localStorage 读取昵称并自动加入房间。

**Test Command**: `cd watch-together && npm test -- room-init`

**测试用例**:

**测试数据**:
1. 输入: `创建房间时填写昵称 "房主A"`
   预期输出: `跳转后自动使用 "房主A" 作为昵称加入房间`

**测试场景**:
1. 房主创建房间后跳转，应自动使用创建时的昵称
2. 房主不应看到昵称输入界面
3. 普通成员进入房间应看到昵称输入界面
4. localStorage 中正确保存房主信息

**断言示例**:
1. `expect(localStorage.getItem('watch-together.hostNickname')).toBe('房主A')`
2. `expect(localStorage.getItem('watch-together.isHost')).toBe('true')`
3. `expect(document.getElementById('nicknameInputContainer').style.display).toBe('none')`

**Test Command**: `cd watch-together && npm test -- room-init`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `create-room.js` 创建房间成功后保存 `hostNickname` 到 localStorage
- [ ] #2 `room.js` 的 `init()` 函数检查 localStorage 中的 `isHost` 标识
- [ ] #3 如果是房主，从 localStorage 读取昵称
- [ ] #4 房主跳过昵称输入界面，直接调用 `joinRoomWithNickname`
- [ ] #5 普通成员仍显示昵称输入框，功能正常
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-01-28 01:09:40 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-48
task: 修复房主昵称自动读取功能
test_command: "cd watch-together && npm test -- room-init
cd watch-together && npm test -- room-init"
---

# Task: 修复房主昵称自动读取功能

## Description

房主创建房间时填写的昵称应在跳转后自动读取，无需重新输入。在 `create-room.js` 中将 `hostNickname` 保存到 localStorage，在 `room.js` 的 `init()` 函数中检查是否为房主，如果是则从 localStorage 读取昵称并自动加入房间。

**Test Command**: `cd watch-together && npm test -- room-init`

**测试用例**:

**测试数据**:
1. 输入: `创建房间时填写昵称 "房主A"`
   预期输出: `跳转后自动使用 "房主A" 作为昵称加入房间`

**测试场景**:
1. 房主创建房间后跳转，应自动使用创建时的昵称
2. 房主不应看到昵称输入界面
3. 普通成员进入房间应看到昵称输入界面
4. localStorage 中正确保存房主信息

**断言示例**:
1. `expect(localStorage.getItem('watch-together.hostNickname')).toBe('房主A')`
2. `expect(localStorage.getItem('watch-together.isHost')).toBe('true')`
3. `expect(document.getElementById('nicknameInputContainer').style.display).toBe('none')`

**Test Command**: `cd watch-together && npm test -- room-init`

## Success Criteria

- [x] `create-room.js` 创建房间成功后保存 `hostNickname` 到 localStorage
- [x] `room.js` 的 `init()` 函数检查 localStorage 中的 `isHost` 标识
- [x] 如果是房主，从 localStorage 读取昵称
- [x] 房主跳过昵称输入界面，直接调用 `joinRoomWithNickname`
- [x] 普通成员仍显示昵称输入框，功能正常
```
<!-- SECTION:NOTES:END -->
