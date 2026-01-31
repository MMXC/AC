---
id: TASK-90
title: PostgreSQL 容器与初始化脚本
status: In Progress
assignee: []
created_date: '2026-01-31 11:13'
updated_date: '2026-01-31 11:27'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
确保 watch-together 的 PostgreSQL 容器（docker-compose postgres 服务）可正确启动，包含：1) Dockerfile.postgres 或使用 postgres 官方镜像；2) 环境变量 POSTGRES_USER、POSTGRES_PASSWORD、POSTGRES_DB 配置；3) 可选 init SQL 脚本；4) 健康检查 pg_isready。

**Test Command**: `docker compose up -d postgres && docker compose exec postgres pg_isready -U watchtogether`

**Test Command**: `docker compose up -d postgres && docker compose exec postgres pg_isready -U watchtogether`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 docker compose up postgres 能成功启动
- [ ] #2 健康检查通过，pg_isready 返回 0
- [ ] #3 可通过 DATABASE_URL=postgresql://watchtogether:watchtogether123@localhost:5432/watchtogether 连接
- [ ] #4 重启容器后数据持久化（volumes 配置正确）
<!-- AC:END -->
