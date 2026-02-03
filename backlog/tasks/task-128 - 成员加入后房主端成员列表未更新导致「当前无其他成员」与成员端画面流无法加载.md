---
id: TASK-128
title: 成员加入后房主端成员列表未更新导致「当前无其他成员」与成员端画面流无法加载
status: Done
assignee: []
created_date: '2026-02-03 02:43'
updated_date: '2026-02-03 02:56'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
房主端调用 `startWebRTCPeerConnectionAsHost(stream)` 时通过 `getMembersList()` 获取成员并逐个建立 PeerConnection。若成员加入后房主端成员列表未更新，则 `getMembersList()` 仍为空，控制台会输出「当前无其他成员，有新成员加入时将自动建立连接」；且依赖 `memberJoinedRoom` 的 `handleMemberJoinedRoom` 可能因成员列表/消息未同步而无法正确为新成员建立 WebRTC，导致成员端画面流无法加载。需修复：（1）房主端成员列表在成员加入后的同步（确保 MEMBER_JOINED 被房主收到并调用 addMember/updateMembersDisplay，或 SYNC_STATE 等机制使 getMembersList() 与后端一致）；（2）成员加入后房主端可靠地为其建立 PeerConnection 并发送 Offer，成员端能收到并显示房主画面流。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**测试用例**:

**测试场景**:
1. 房主进入房间并点击「共享画面」、授权共享；此时若无成员，控制台可输出「当前无其他成员，有新成员加入时将自动建立连接」
2. 成员加入同一房间
3. 在房主端检查：成员列表是否出现该成员；控制台是否出现为该成员发送 Offer 等日志（不应仍仅显示「当前无其他成员」）
4. 在成员端检查：画面区域是否在数秒内出现房主共享画面

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 成员加入房间后，房主端成员列表在约定时间内显示该成员（getMembersList() 含该成员）
- [ ] #2 房主已开启共享时，新成员加入后房主端不再仅输出「当前无其他成员」，且会为新成员建立 WebRTC 连接
- [ ] #3 在上述场景下，成员端画面区域能在约定时间内收到并显示房主共享画面
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-02-03 10:56:58 - 任务完成，RALPH_TASK.md 已归档

---

## 测试通过 (Test Passed)

- **测试时间**: 2026-02-03 10:56:58
- **测试结果截图** (保存在 `backlog/test-results/task-128/`):
  - [final.png](backlog/test-results/task-128/final.png)
  - [initial.png](backlog/test-results/task-128/initial.png)
  - [member-joined.png](backlog/test-results/task-128/member-joined.png)

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-128
task: 成员加入后房主端成员列表未更新导致「当前无其他成员」与成员端画面流无法加载
test_command: "skill:watch-together-webapp-testing ${TASK_ID}"
---

# Task: 成员加入后房主端成员列表未更新导致「当前无其他成员」与成员端画面流无法加载

## Description

房主端调用 `startWebRTCPeerConnectionAsHost(stream)` 时通过 `getMembersList()` 获取成员并逐个建立 PeerConnection。若成员加入后房主端成员列表未更新，则 `getMembersList()` 仍为空，控制台会输出「当前无其他成员，有新成员加入时将自动建立连接」；且依赖 `memberJoinedRoom` 的 `handleMemberJoinedRoom` 可能因成员列表/消息未同步而无法正确为新成员建立 WebRTC，导致成员端画面流无法加载。需修复：（1）房主端成员列表在成员加入后的同步（确保 MEMBER_JOINED 被房主收到并调用 addMember/updateMembersDisplay，或 SYNC_STATE 等机制使 getMembersList() 与后端一致）；（2）成员加入后房主端可靠地为其建立 PeerConnection 并发送 Offer，成员端能收到并显示房主画面流。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**测试用例**:

**测试场景**:
1. 房主进入房间并点击「共享画面」、授权共享；此时若无成员，控制台可输出「当前无其他成员，有新成员加入时将自动建立连接」
2. 成员加入同一房间
3. 在房主端检查：成员列表是否出现该成员；控制台是否出现为该成员发送 Offer 等日志（不应仍仅显示「当前无其他成员」）
4. 在成员端检查：画面区域是否在数秒内出现房主共享画面

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

## Success Criteria

- [x] #1 成员加入房间后，房主端成员列表在约定时间内显示该成员（getMembersList() 含该成员）
- [x] #2 房主已开启共享时，新成员加入后房主端不再仅输出「当前无其他成员」，且会为新成员建立 WebRTC 连接
- [x] #3 在上述场景下，成员端画面区域能在约定时间内收到并显示房主共享画面

## Implementation Steps

1. **1.1 房主端成员列表同步**
   - 确保服务端在成员加入时向房间内所有连接（含房主）广播 MEMBER_JOINED，并随后广播 SYNC_STATE；新连接加入房间时向该连接单独发送 SYNC_STATE，使 getMembersList() 与后端一致。
   - **验收**: 成员加入后房主端收到 MEMBER_JOINED 或 SYNC_STATE，addMember/updateMembersDisplay 被调用，成员列表显示该成员。

2. **1.2 前端处理 MEMBER_JOINED**
   - 前端 chat.js 在收到 MEMBER_JOINED 时调用 addMember(userId, nickname)，nickname 可为空时使用兜底显示名；并派发 memberJoinedRoom 事件。
   - **验收**: 房主端控制台有「成员加入」「已添加成员到列表」等日志，成员列表 UI 更新。

3. **2.1 新成员加入后房主为其建立 WebRTC**
   - screen-streaming.js 的 handleMemberJoinedRoom 在房主正在共享时为新成员调用 addPeerConnectionForMember，发送 Offer。
   - **验收**: 房主已开启共享时新成员加入后，控制台出现为该成员发送 Offer 的日志，不再仅显示「当前无其他成员」。

4. **2.2 成员端收到并显示房主画面**
   - 成员端 handleWebRTCOffer → createAnswer → WEBRTC_ANSWER，ICE 候选交换后 connectionState 为 connected，ontrack 触发 VideoPlayer.attachStream。
   - **验收**: 成员端画面区域在约定时间内显示房主共享画面（自动化测试可降级为成员列表/信令日志断言）。

5. **3.1 测试与断言**
   - 更新或生成 test-task-128.py，对「房主共享 → 成员加入 → 房主端成员列表含该成员」「房主为新成员建立连接」「成员端画面/占位」做真实断言。
   - **验收**: 运行 skill:watch-together-webapp-testing 128 或对应测试命令通过或场景断言明确。
```
<!-- SECTION:NOTES:END -->
