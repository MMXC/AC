---
backlog_id: backlog-130
task: WebRTC 信令仅面向当前在线成员（避免历史 toUserId）
test_command: "skill:watch-together-webapp-testing ${TASK_ID}"
---

# Task: WebRTC 信令仅面向当前在线成员（避免历史 toUserId）

## Description

后台日志「信令目标用户不在线」表明房主端发送的 toUserId 是历史/已离开用户 ID，而新加入成员的 ID 未收到过画面流信令。需修复：房主端发送 WebRTC 信令（Offer/ICE 等）时仅使用当前 getMembersList() 中的成员 ID，不向已离开或不在列表中的 userId 发送；若存在重试/缓存逻辑使用旧 ID，需改为仅从当前成员列表取目标。配合任务 5 后，列表随 MEMBER_LEFT 更新，自然不再向已离开用户发信令。

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

**测试用例**:

**测试场景**:
1. 房主开启共享，成员 A 加入后收到画面；成员 A 离开，房主端列表移除 A（任务 5）
2. 成员 B 新加入，房主端列表含 B，向 B 发送 Offer；成员 B 端收到信令并显示画面
3. 检查服务端日志：不应再出现向已离开用户（如 A）的「信令目标用户不在线」

**Test Command**: `skill:watch-together-webapp-testing ${TASK_ID}`

## Success Criteria

- [x] #1 房主端建立/重试 WebRTC 连接时，仅向 getMembersList() 中且非当前用户的 member.id 发送 Offer
- [x] #2 新加入成员在房主端列表更新后能收到房主发出的 WebRTC 信令（Offer），成员端能建立画面流
- [x] #3 用户离开后，房主端不再向该 userId 发送信令（服务端「信令目标用户不在线」日志不再出现或仅偶发）

## Implementation Steps

1. **1.1 房主端建立/重试时仅向当前成员列表发 Offer** — done when: startWebRTCPeerConnectionAsHost 与 addPeerConnectionForMember 重试前均仅使用 getMembersList() 中且非 currentUserId 的 member.id 作为目标；重试时若 targetUserId 已不在列表中则不再重试。
2. **1.2 新成员加入后能收到 Offer** — done when: handleMemberJoinedRoom 在房主正在共享时对新成员调用 addPeerConnectionForMember(userId)，且 getMembersList() 已含该成员（由 MEMBER_JOINED/列表更新保证）。
3. **1.3 离开后不再向该 userId 发信令** — done when: handleMemberLeftRoom 已关闭对应 PC；重试逻辑在目标已离开时跳过重试，服务端「信令目标用户不在线」日志不再因已离开用户出现。
4. **2.1 运行测试** — done when: skill:watch-together-webapp-testing 130 或 watch-together 单元测试通过。
