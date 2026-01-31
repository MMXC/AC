---
backlog_id: backlog-6
task: 房间路由和导航
test_command: "npm test -- --testNamePattern='路由导航'"
---

# Task: 房间路由和导航

## Description

实现前端路由，支持首页和房间页面的导航，处理房间链接参数

**Test Command**: `npm test -- --testNamePattern='路由导航'`

## Success Criteria

- [x] 首页路由 / 可以正常访问
- [x] 房间路由 /room/:roomId 可以正常访问
- [x] 通过房间链接可以正确跳转到房间页面
- [x] URL 参数可以正确解析
- [x] 无效房间号显示错误提示
