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

- [x] #1 房主选择共享源并点击开始共享后，信令/状态能下发到已连接的成员端
- [x] #2 成员端收到「房主已开始共享」后，不再显示「等待房主开始共享...」
- [x] #3 成员端在房主共享后展示共享画面或明确的「正在共享」状态（如占位文案/播放区域）
- [x] #4 自动化测试：双浏览器（房主+成员），房主开始共享 → 成员页在约定超时内出现共享状态或画面，断言通过

## Implementation Steps

1. **1.1 服务器转发共享状态** — done when: 收到 SCREEN_STREAM_START/STOP 时向房间内除发送者外的所有连接广播
2. **1.2 房主发送时带 roomId** — done when: sendScreenStreamStart/sendScreenStreamStop 消息体包含 roomId，便于服务器按房间广播
3. **1.3 成员端收到「已开始共享」后更新 UI** — done when: 成员收到 SCREEN_STREAM_START 或 WEBRTC_OFFER 后，不再显示「等待房主开始共享...」，显示「正在建立连接」或视频区域
4. **1.4 成员端展示共享状态或画面** — done when: 收到流前显示「房主正在共享」类占位，收到流后展示画面或「正在播放房主画面」
5. **1.5 运行测试** — done when: `skill:watch-together-webapp-testing backlog-118` 或对应 TASK_ID 在约定超时内通过
