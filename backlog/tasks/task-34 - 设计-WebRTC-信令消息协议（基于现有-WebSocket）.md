---
id: TASK-34
title: 设计 WebRTC 信令消息协议（基于现有 WebSocket）
status: Done
assignee: []
created_date: '2026-01-28 11:54'
updated_date: '2026-01-28 17:54'
labels: []
dependencies: []
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
基于现有房间 WebSocket/sync 通道，定义用于 WebRTC 的信令消息格式，包括 WEBRTC_OFFER、WEBRTC_ANSWER、WEBRTC_ICE_CANDIDATE 等类型，以及字段：roomId、fromUserId、toUserId、sdp、candidate 等。用文档或 TypeScript 类型固化这些结构。

**Test Command**: `无自动命令，代码评审 + TS 类型检查 + 单元测试`

**测试用例**:

**测试场景**:
1. 为每种信令消息构造至少一个示例 JSON，并通过单元测试断言能被类型定义正确解析
2. 在前端模拟 send/receive 信令消息的单元测试中，确保不会因字段名错误导致解析失败

**Test Command**: `无自动命令，代码评审 + TS 类型检查 + 单元测试`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 有文档或 TS 类型清晰列出所有 WebRTC 信令消息的 JSON 结构
- [ ] #2 每个字段（roomId/fromUserId/toUserId/sdp/candidate 等）都有明确含义说明
- [ ] #3 前端信令发送/接收层统一使用这些类型，不再硬编码字符串
- [ ] #4 为未来扩展（多 track、多房主）预留扩展点或版本化策略
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-01-29 01:54:06 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-34
task: 设计 WebRTC 信令消息协议（基于现有 WebSocket）
test_command: "无自动命令，代码评审 + TS 类型检查 + 单元测试"
---

# Task: 设计 WebRTC 信令消息协议（基于现有 WebSocket）

## Description

基于现有房间 WebSocket/sync 通道，定义用于 WebRTC 的信令消息格式，包括 WEBRTC_OFFER、WEBRTC_ANSWER、WEBRTC_ICE_CANDIDATE 等类型，以及字段：roomId、fromUserId、toUserId、sdp、candidate 等。用文档或 TypeScript 类型固化这些结构。

**Test Command**: `无自动命令，代码评审 + TS 类型检查 + 单元测试`

**测试用例**:

**测试场景**:
1. 为每种信令消息构造至少一个示例 JSON，并通过单元测试断言能被类型定义正确解析
2. 在前端模拟 send/receive 信令消息的单元测试中，确保不会因字段名错误导致解析失败

**Test Command**: `无自动命令，代码评审 + TS 类型检查 + 单元测试`

## Success Criteria

- [x] #1 有文档或 TS 类型清晰列出所有 WebRTC 信令消息的 JSON 结构
- [x] #2 每个字段（roomId/fromUserId/toUserId/sdp/candidate 等）都有明确含义说明
- [x] #3 前端信令发送/接收层统一使用这些类型，不再硬编码字符串
- [x] #4 为未来扩展（多 track、多房主）预留扩展点或版本化策略
```
<!-- SECTION:NOTES:END -->
