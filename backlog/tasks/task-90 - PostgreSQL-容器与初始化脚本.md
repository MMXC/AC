---
id: TASK-90
title: PostgreSQL 容器与初始化脚本
status: Done
assignee: []
created_date: '2026-01-31 11:13'
updated_date: '2026-02-01 07:49'
labels: []
dependencies: []
ordinal: 20000
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-01-31 19:31:23 - 任务完成，RALPH_TASK.md 已归档

---

## RALPH_TASK.md 归档内容

```
---
backlog_id: backlog-90
task: PostgreSQL 容器与初始化脚本
test_command: "docker compose up -d postgres && docker compose exec postgres pg_isready -U watchtogether"
---

# Task: PostgreSQL 容器与初始化脚本

## Description

确保 watch-together 的 PostgreSQL 容器（docker-compose postgres 服务）可正确启动，包含：1) Dockerfile.postgres 或使用 postgres 官方镜像；2) 环境变量 POSTGRES_USER、POSTGRES_PASSWORD、POSTGRES_DB 配置；3) 可选 init SQL 脚本；4) 健康检查 pg_isready。

**Test Command**: `docker compose up -d postgres && docker compose exec postgres pg_isready -U watchtogether`

**Test Command**: `docker compose up -d postgres && docker compose exec postgres pg_isready -U watchtogether`

## Success Criteria

- [x] #1 docker compose up postgres 能成功启动
- [x] #2 健康检查通过，pg_isready 返回 0
- [x] #3 可通过 DATABASE_URL=postgresql://watchtogether:watchtogether123@localhost:5432/watchtogether 连接
- [x] #4 重启容器后数据持久化（volumes 配置正确）
```
<!-- SECTION:NOTES:END -->
