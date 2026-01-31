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
