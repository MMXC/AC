---
id: TASK-37
title: 后端数据模型调整（Room / RoomMember / 可选 operationSourceUserId）
status: To Do
assignee: []
created_date: '2026-01-27 09:43'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
基于任务 1 的模型设计，更新 Prisma schema 与数据库迁移：确保 Room 表中存在 hostId、currentUrl 字段；RoomMember 表中有 isHost 字段且仅在创建时设置，不允许后续随意修改。如需要支持“指定操作来源成员”，为 Room 增加 operationSourceUserId 字段（或单独状态表）。确保迁移脚本在现有数据上安全运行，同时更新 TypeScript 类型定义与相关服务（如 roomCacheService）。

**Test Command**: `cd watch-together-server && npm test -- schema`

**Test Command**: `cd watch-together-server && npm test -- schema`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Prisma schema 中 Room 与 RoomMember 结构与任务 1 的模型设计一致。
- [ ] #2 运行数据库迁移脚本不会破坏已有数据，且新字段非空策略合理（必要时有默认值或可为空）。
- [ ] #3 TypeScript 代码中引用 Room / RoomMember 的地方都能正常编译通过（无类型错误）。
- [ ] #4 获取房间详情接口返回的数据结构包括 hostId 与 currentUrl。
<!-- AC:END -->
