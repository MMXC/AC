---
id: TASK-53
title: 更新加入房间接口的请求验证 Schema
status: Done
assignee: []
created_date: '2026-01-27 22:04'
updated_date: '2026-01-28 07:51'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
更新 `watch-together-server/src/validation/schemas.ts` 中的 `joinRoomSchema`，添加可选的 `userId` 字段验证。确保 `userId` 格式正确（如果提供），并更新接口文档注释。

**Test Command**: `cd watch-together-server && npm test -- validation`

**测试用例**:

**测试场景**:
1. 有效的 userId 格式应通过验证
2. 无效的 userId 格式应返回 400
3. 不传 userId 应通过验证

**断言示例**:
1. `expect(() => joinRoomSchema.parse({ nickname: "test", userId: "user-abc123" })).not.toThrow()`
2. `expect(() => joinRoomSchema.parse({ nickname: "test", userId: "invalid" })).toThrow()`

**Test Command**: `cd watch-together-server && npm test -- validation`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `joinRoomSchema` 包含可选的 `userId` 字段
- [ ] #2 `userId` 字段验证格式（如果提供）
- [ ] #3 接口文档注释更新，说明 `userId` 参数的用途
- [ ] #4 验证逻辑正确，无效 `userId` 格式返回 400
- [ ] #5 向后兼容，不传 `userId` 时验证通过
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-01-28 15:51:47 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-53
task: 更新加入房间接口的请求验证 Schema
test_command: "cd watch-together-server && npm test -- validation
cd watch-together-server && npm test -- validation"
---

# Task: 更新加入房间接口的请求验证 Schema

## Description

更新 `watch-together-server/src/validation/schemas.ts` 中的 `joinRoomSchema`，添加可选的 `userId` 字段验证。确保 `userId` 格式正确（如果提供），并更新接口文档注释。

**Test Command**: `cd watch-together-server && npm test -- validation`

**测试用例**:

**测试场景**:
1. 有效的 userId 格式应通过验证
2. 无效的 userId 格式应返回 400
3. 不传 userId 应通过验证

**断言示例**:
1. `expect(() => joinRoomSchema.parse({ nickname: "test", userId: "user-abc123" })).not.toThrow()`
2. `expect(() => joinRoomSchema.parse({ nickname: "test", userId: "invalid" })).toThrow()`

**Test Command**: `cd watch-together-server && npm test -- validation`

## Success Criteria

- [x] `joinRoomSchema` 包含可选的 `userId` 字段
- [x] `userId` 字段验证格式（如果提供）
- [x] 接口文档注释更新，说明 `userId` 参数的用途
- [x] 验证逻辑正确，无效 `userId` 格式返回 400
- [x] 向后兼容，不传 `userId` 时验证通过
```
<!-- SECTION:NOTES:END -->
