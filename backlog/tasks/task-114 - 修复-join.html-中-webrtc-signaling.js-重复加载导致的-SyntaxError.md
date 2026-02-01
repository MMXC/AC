---
id: TASK-114
title: 修复 join.html 中 webrtc-signaling.js 重复加载导致的 SyntaxError
status: To Do
assignee: []
created_date: '2026-02-01 06:22'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
join.html 中 webrtc-signaling.js 被引入了两次（约第 525 行与第 528 行），导致 `Identifier 'WebRTCSignalingType' has already been declared`。移除重复的 script 标签，确保该脚本只加载一次。

**Test Command**: `docker compose up -d && .cursor/skills/watch-together-webapp-testing/run-test.sh fix-frontend`

**Test Command**: `docker compose up -d && .cursor/skills/watch-together-webapp-testing/run-test.sh fix-frontend`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 join.html 中仅保留一处 webrtc-signaling.js 引用
- [ ] #2 页面加载后控制台无 "WebRTCSignalingType has already been declared" 错误
- [ ] #3 WebRTC 信令功能（如开始共享、接收远端流）仍可正常使用
<!-- AC:END -->
