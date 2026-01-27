---
id: TASK-35
title: 共享区域操作同步
status: Done
assignee: []
created_date: '2026-01-27 07:53'
updated_date: '2026-01-27 10:42'
labels: []
dependencies: []
ordinal: 36000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现共享浏览区域的操作同步，成员的操作（滚动、点击等）同步给其他成员

**Test Command**: `npm test -- --testNamePattern='操作同步'`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 可以捕获 iframe 内的操作事件
- [ ] #2 操作事件可以发送到服务器
- [ ] #3 操作可以同步给其他成员
- [ ] #4 滚动位置可以同步
- [ ] #5 URL 变化可以同步
<!-- AC:END -->
