---
id: TASK-45
title: watch-together-server 数据模型与 Prisma Schema
status: To Do
assignee: []
created_date: '2026-01-31 05:39'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在 watch-together-server 中定义 Prisma 数据模型：Room（id、name、hostId、currentUrl、inviteLink、createdAt）、RoomMember（id、roomId、userId、nickname、isHost、joinedAt）、Message 等，并配置 DATABASE_URL，运行 prisma migrate deploy。

**Test Command**: `cd watch-together-server && npx prisma validate && npx prisma migrate deploy`

**Test Command**: `cd watch-together-server && npx prisma validate && npx prisma migrate deploy`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 prisma/schema.prisma 定义 Room、RoomMember、Message 等模型
- [ ] #2 模型字段与前端期望的 roomId、hostId、currentUrl、members 等对应
- [ ] #3 prisma migrate deploy 能成功执行
- [ ] #4 prisma generate 能生成 Prisma Client
<!-- AC:END -->
