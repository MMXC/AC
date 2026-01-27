---
id: TASK-42
title: 画面流/屏幕投影通路设计与最小实现（房主 → 普通成员）
status: In Progress
assignee: []
created_date: '2026-01-27 09:44'
updated_date: '2026-01-27 14:28'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
设计并实现一条“房主浏览器画面 → 普通成员前端”的画面同步通路的最小可行版本，例如：房主端使用 getDisplayMedia 或 Canvas 截图+编码，将画面推送到服务器或直接通过 WebRTC/WebSocket 推送给普通成员；普通成员前端只负责在 video/canvas 容器中播放该画面。此任务重点是确定技术路线与基本 API 形态，代码可以先实现简单低帧率版本确认整体链路可行。

**Test Command**: `cd watch-together && npm test -- screen-streaming-basic`

**Test Command**: `cd watch-together && npm test -- screen-streaming-basic`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 在开发环境中，房主端点击“开始共享画面”后，至少一名普通成员页面能看到房主浏览器的大致实时画面（允许有延迟与低帧率）。
- [ ] #2 普通成员全程未直接访问被嵌入网页的 DOM，仅操作画面容器。
- [ ] #3 房主停止共享或离开房间时，普通成员端能收到合理的停止提示或回退为占位画面。
- [ ] #4 画面链路的错误情况（权限拒绝、浏览器不支持等）有日志或 UI 提示。
<!-- AC:END -->
