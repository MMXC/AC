---
id: TASK-92
title: 数据库种子脚本（可选）
status: In Progress
assignee: []
created_date: '2026-01-31 11:14'
updated_date: '2026-01-31 11:37'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在 watch-together-server 中提供数据库种子脚本（prisma/seed.ts 或 scripts/seed.js），用于开发/测试环境初始化示例数据。配置 prisma seed 命令，支持 npx prisma db seed。

**Test Command**: `docker compose up -d postgres watch-together-server && docker compose exec watch-together-server npx prisma db seed`

**Test Command**: `docker compose up -d postgres watch-together-server && docker compose exec watch-together-server npx prisma db seed`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 prisma/seed.ts 或 scripts/seed.js 存在
- [ ] #2 schema.prisma 中配置 generator 的 seed 指向
- [ ] #3 npx prisma db seed 能成功执行
- [ ] #4 种子数据可用于本地开发或 E2E 测试
<!-- AC:END -->
