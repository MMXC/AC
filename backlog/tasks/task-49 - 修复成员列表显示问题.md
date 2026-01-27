---
id: TASK-49
title: 修复成员列表显示问题
status: To Do
assignee: []
created_date: '2026-01-27 15:49'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
修复成员列表显示问题，确保相同房间内所有成员都能完整显示，包括同 IP 打开多个标签页的情况。检查 WebSocket 消息中的成员列表同步逻辑，确保 `MEMBER_JOINED` 事件正确触发并更新成员列表。

**Test Command**: `cd watch-together && npm test -- room-init`

**测试用例**:

**测试数据**:
1. 输入: `多个用户（包括同 IP）加入同一房间`
   预期输出: `成员列表显示所有成员`

**测试场景**:
1. 打开多个标签页加入同一房间，所有成员应显示在列表中
2. 成员加入时应触发 `MEMBER_JOINED` 事件
3. 成员离开时应从列表中移除
4. 成员列表应实时更新

**断言示例**:
1. `expect(membersList.length).toBeGreaterThan(0)`
2. `expect(membersList.find(m => m.id === userId)).toBeDefined()`

**Test Command**: `cd watch-together && npm test -- room-init`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WebSocket `MEMBER_JOINED` 事件正确触发
- [ ] #2 成员列表正确更新，显示所有已加入的成员
- [ ] #3 同 IP 多个标签页的成员都能正确显示
- [ ] #4 成员离开时正确从列表移除
- [ ] #5 成员列表 UI 正确渲染
<!-- AC:END -->
