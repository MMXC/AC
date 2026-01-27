---
id: TASK-29
title: 缓存策略优化
status: Done
assignee: []
created_date: '2026-01-26 06:38'
updated_date: '2026-01-26 20:03'
labels: []
dependencies: []
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现房间状态缓存（Redis），减少数据库查询，提高性能

**Test Command**: `npm test -- --testNamePattern='缓存优化'`

**测试用例**:

**测试数据**:
1. 输入: `多次查询同一房间`
   预期输出: `第一次查询数据库，后续查询缓存`

**测试场景**:
1. 首次查询应该查询数据库并缓存
2. 后续查询应该使用缓存
3. 更新房间应该失效缓存

**断言示例**:
1. `const room1 = await getRoom(roomId) // 查询数据库`
2. `const room2 = await getRoom(roomId) // 使用缓存`
3. `expect(dbQueryCount).toBe(1) // 只查询一次数据库`

**Test Command**: `npm test -- --testNamePattern='缓存优化'`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 房间信息缓存到 Redis（TTL 1 小时）
- [ ] #2 缓存命中时减少数据库查询
- [ ] #3 房间更新时自动失效缓存
- [ ] #4 缓存未命中时从数据库加载并缓存
- [ ] #5 性能提升：P95 响应时间 < 200ms
<!-- AC:END -->
