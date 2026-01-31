---
id: TASK-93
title: watch-together-server 数据模型与 Prisma Schema
status: Done
assignee: []
created_date: '2026-01-31 11:14'
updated_date: '2026-01-31 17:17'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在 watch-together-server 中定义 Prisma 数据模型：Room（id、name、hostId、currentUrl、inviteLink、createdAt）、RoomMember（id、roomId、userId、nickname、isHost、joinedAt）、Message 等，并配置 DATABASE_URL，运行 prisma migrate deploy。

**Test Command**: `docker compose up -d postgres watch-together-server && docker compose exec watch-together-server npx prisma validate && docker compose exec watch-together-server npx prisma migrate deploy`

**Test Command**: `docker compose up -d postgres watch-together-server && docker compose exec watch-together-server npx prisma validate && docker compose exec watch-together-server npx prisma migrate deploy`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 prisma/schema.prisma 定义 Room、RoomMember、Message 等模型
- [ ] #2 模型字段与前端期望的 roomId、hostId、currentUrl、members 等对应
- [ ] #3 prisma migrate deploy 能成功执行
- [ ] #4 prisma generate 能生成 Prisma Client
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-02-01 01:17:44 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-93
task: watch-together-server 数据模型与 Prisma Schema
test_command: "docker compose up -d postgres watch-together-server && docker compose exec watch-together-server npx prisma validate && docker compose exec watch-together-server npx prisma migrate deploy"
---

# Task: watch-together-server 数据模型与 Prisma Schema

## Description

在 watch-together-server 中定义 Prisma 数据模型：Room（id、name、hostId、currentUrl、inviteLink、createdAt）、RoomMember（id、roomId、userId、nickname、isHost、joinedAt）、Message 等，并配置 DATABASE_URL，运行 prisma migrate deploy。

**Test Command**: `docker compose up -d postgres watch-together-server && docker compose exec watch-together-server npx prisma validate && docker compose exec watch-together-server npx prisma migrate deploy`

**Test Command**: `docker compose up -d postgres watch-together-server && docker compose exec watch-together-server npx prisma validate && docker compose exec watch-together-server npx prisma migrate deploy`

## Success Criteria

- [x] #1 prisma/schema.prisma 定义 Room、RoomMember、Message 等模型
- [x] #2 模型字段与前端期望的 roomId、hostId、currentUrl、members 等对应
- [x] #3 prisma migrate deploy 能成功执行
- [x] #4 prisma generate 能生成 Prisma Client
```
<!-- SECTION:NOTES:END -->
