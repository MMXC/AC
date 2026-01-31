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
