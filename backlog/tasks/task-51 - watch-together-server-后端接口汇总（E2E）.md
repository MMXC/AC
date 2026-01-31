---
id: TASK-51
title: watch-together-server 后端接口汇总（E2E）
status: To Do
assignee: []
created_date: '2026-01-31 05:41'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
汇总 api-a1～api-a6，使 watch-together-server 提供完整 REST 房间接口。前端 create-room、room 等页面可正常调用 localhost:3000，创建房间、加入房间、获取房间、更新 URL、离开房间流程可端到端跑通。

**Test Command**: `cd watch-together-server && npm run test:api`

**Test Command**: `cd watch-together-server && npm run test:api`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 POST /api/v1/rooms 创建房间成功
- [ ] #2 GET /api/v1/rooms/:roomId 获取房间成功
- [ ] #3 POST join、PUT url、POST leave 均能正常执行
- [ ] #4 前端创建房间后能跳转到 /room/:roomId 并加载房间内容
<!-- AC:END -->
