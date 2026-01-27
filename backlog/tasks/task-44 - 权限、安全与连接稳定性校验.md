---
id: TASK-44
title: 权限、安全与连接稳定性校验
status: To Do
assignee: []
created_date: '2026-01-27 09:44'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
对整个系统的权限链路与连接策略做一次收尾检查：确保所有关键接口（创建房间、更新 URL、设置操作来源、画面流通路）在后端都有硬性权限校验，前端 UI 只是“提示”，不是安全边界。针对 WebSocket 连接数限制（如每 IP 最大 10 个）完善前端重连策略：在 1008 关闭码时停止重连并给出提示（如“连接过多，请关闭多余页面后刷新”），避免重连风暴。补充必要的日志与文档说明。

**Test Command**: `cd watch-together-server && npm test -- security && cd ../watch-together && npm test -- ws-stability`

**Test Command**: `cd watch-together-server && npm test -- security && cd ../watch-together && npm test -- ws-stability`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 用 curl 或自制脚本伪造非房主请求关键接口均被拒绝（403 或 ERROR）。
- [ ] #2 WebSocket 在 1008 情况下不会无限重连，前端有清晰提示。
- [ ] #3 多 tab / 多设备同时访问同一房间时，系统行为可预期且不会压垮后端。
- [ ] #4 TASK_VERIFICATION.md 中有对应验证步骤说明，便于回归测试。
<!-- AC:END -->
