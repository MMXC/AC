---
id: TASK-40
title: 创建房间前端页面改造（强制填写 URL 并作为房主进入房间）
status: In Progress
assignee: []
created_date: '2026-01-27 09:43'
updated_date: '2026-01-27 13:27'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
更新 `watch-together/js/create-room.js` 与对应 HTML：在创建房间表单中增加“目标网址 URL”必填输入框（前端校验 http/https），请求体发送 { name?, hostNickname?, url } 给后端的创建房间接口。成功后，根据响应中的 roomId 和 hostUserId 直接跳转到房间页面（/room/:roomId），并在 URL 或本地存储中保存必要的标识以便房主端初始化使用。

**Test Command**: `cd watch-together && npm test -- create-room-ui`

**Test Command**: `cd watch-together && npm test -- create-room-ui`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 前端在 URL 为空或非法时阻止提交，并给出友好错误提示。
- [ ] #2 正确填写时会调用新的创建房间接口并成功获取 roomId、currentUrl。
- [ ] #3 创建完成后浏览器自动打开房主房间页面，且无需再额外手动拼接 ?url。
- [ ] #4 浏览器控制台无新增报错，E2E 测试通过。
<!-- AC:END -->
