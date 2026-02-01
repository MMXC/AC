---
backlog_id: backlog-118
task: 修复房主开始共享后成员端仍显示「等待房主开始共享...」
test_command: "skill:watch-together-webapp-testing ${TASK_ID}"
---

# Task: 修复房主开始共享后成员端仍显示「等待房主开始共享...」

## Description

房主点击开始共享并选择共享画面后，成员端依旧显示「等待房主开始共享...」。需修复共享状态/信令的同步：房主开始共享后，通过 WebSocket 或 WebRTC 信令将「已开始共享」状态通知成员端，成员端收到后更新 UI（展示共享画面或「正在共享」状态），并隐藏「等待房主开始共享...」。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

## Success Criteria

- [ ] #1 房主选择共享源并点击开始共享后，信令/状态能下发到已连接的成员端
- [ ] #2 成员端收到「房主已开始共享」后，不再显示「等待房主开始共享...」
- [ ] #3 成员端在房主共享后展示共享画面或明确的「正在共享」状态（如占位文案/播放区域）
- [ ] #4 自动化测试：双浏览器（房主+成员），房主开始共享 → 成员页在约定超时内出现共享状态或画面，断言通过

## Implementation Steps

<!-- 细化约定时填写：步骤 + 每步验收，例如 -->
<!-- 1.1 加路由 — done when: GET /api/v1/rooms 返回 200 -->
<!-- 1.2 写 handler — done when: POST 入参校验失败返回 400 -->
