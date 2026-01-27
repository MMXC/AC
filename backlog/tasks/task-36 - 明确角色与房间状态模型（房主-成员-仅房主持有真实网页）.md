---
id: TASK-36
title: 明确角色与房间状态模型（房主 / 成员 + 仅房主持有真实网页）
status: In Progress
assignee: []
created_date: '2026-01-27 09:43'
updated_date: '2026-01-27 09:48'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
设计并文档化新的角色与房间状态模型：房主是创建房间的人且唯一不可变更；普通成员只能通过分享链接加入，永远不是房主。房主浏览器内通过 iframe 打开真实网页，普通成员端不再直接嵌入 iframe，而是仅看到房主浏览器画面的实时画面（视频流或画布投影）。在数据模型层面明确 Room.currentUrl（真实网页 URL）、Room.hostId（房主 userId）、可选 Room.operationSourceUserId（被指定为“输入来源”的成员 userId），并给出状态流转说明（创建房间、房主刷新/重连、成员加入/离开）。

**Test Command**: `cat watch-together-server/TASK_VERIFICATION.md | grep "角色与房间状态模型"`

**测试用例**:

**测试场景**:
1. 打开文档即可理解当前房间中谁是房主、谁是成员，以及他们分别能做什么。

**Test Command**: `cat watch-together-server/TASK_VERIFICATION.md | grep "角色与房间状态模型"`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 有一份文档或者注释，清晰描述房主 / 普通成员的职责边界以及房主不可变更规则。
- [ ] #2 数据模型中明确存在 hostId 与 currentUrl 字段，并说明它们的单一真源语义。
- [ ] #3 文档中明确写出“普通成员只看到画面，不直接访问被嵌入网页 DOM”这一约束。
- [ ] #4 描述清楚房主刷新或重进房间时如何保持房主身份的一致性。
<!-- AC:END -->
