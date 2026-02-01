---
id: TASK-91
title: Prisma 迁移脚本与 deploy 流程
status: Done
assignee: []
created_date: '2026-01-31 11:14'
updated_date: '2026-02-01 05:37'
labels: []
dependencies: []
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在 watch-together-server 中建立 Prisma 迁移脚本流程：1) 创建 migrations 目录与初始迁移；2) 在 package.json 配置 migrate:deploy、migrate:dev；3) CI/启动前可执行 migrate deploy；4) 文档化迁移流程。

**Test Command**: `docker compose up -d postgres watch-together-server && docker compose exec watch-together-server npm run migrate:deploy`

**Test Command**: `docker compose up -d postgres watch-together-server && docker compose exec watch-together-server npm run migrate:deploy`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 prisma/migrations 目录存在且包含迁移文件
- [ ] #2 npm run migrate:deploy 能成功执行
- [ ] #3 package.json 中有 migrate:deploy、migrate:dev 等 scripts
- [ ] #4 README 或 docs 说明迁移流程
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-01-31 19:35:27 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-91
task: Prisma 迁移脚本与 deploy 流程
test_command: "docker compose up -d postgres watch-together-server && docker compose exec watch-together-server npm run migrate:deploy"
---

# Task: Prisma 迁移脚本与 deploy 流程

## Description

在 watch-together-server 中建立 Prisma 迁移脚本流程：1) 创建 migrations 目录与初始迁移；2) 在 package.json 配置 migrate:deploy、migrate:dev；3) CI/启动前可执行 migrate deploy；4) 文档化迁移流程。

**Test Command**: `docker compose up -d postgres watch-together-server && docker compose exec watch-together-server npm run migrate:deploy`

**Test Command**: `docker compose up -d postgres watch-together-server && docker compose exec watch-together-server npm run migrate:deploy`

## Success Criteria

- [x] #1 prisma/migrations 目录存在且包含迁移文件
- [x] #2 npm run migrate:deploy 能成功执行
- [x] #3 package.json 中有 migrate:deploy、migrate:dev 等 scripts
- [x] #4 README 或 docs 说明迁移流程
```
<!-- SECTION:NOTES:END -->
