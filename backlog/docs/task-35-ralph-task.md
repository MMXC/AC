---
backlog_id: backlog-35
task: 共享区域操作同步
test_command: "npm test -- --testNamePattern='操作同步'"
---

# Task: 共享区域操作同步

## Description

实现共享浏览区域的操作同步，成员的操作（滚动、点击等）同步给其他成员

**Test Command**: `npm test -- --testNamePattern='操作同步'`

## Success Criteria

- [x] 可以捕获 iframe 内的操作事件
- [x] 操作事件可以发送到服务器
- [x] 操作可以同步给其他成员
- [x] 滚动位置可以同步
- [x] URL 变化可以同步
