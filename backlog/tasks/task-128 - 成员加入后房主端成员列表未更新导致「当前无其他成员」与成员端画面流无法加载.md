---
id: TASK-128
title: 成员加入后房主端成员列表未更新导致「当前无其他成员」与成员端画面流无法加载
status: In Progress
assignee: []
created_date: '2026-02-03 02:43'
updated_date: '2026-02-03 02:44'
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
