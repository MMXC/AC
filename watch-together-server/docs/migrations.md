# Prisma 迁移流程

本文档说明 watch-together-server 中 Prisma 数据库迁移的创建、部署与 CI/启动前执行方式。

## 目录结构

- `prisma/schema.prisma`：数据模型定义
- `prisma/migrations/`：迁移 SQL 文件，按时间戳命名（如 `20260131000000_init/migration.sql`）

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run migrate:dev` | 开发环境：根据 schema 变更创建新迁移并应用到本地数据库（交互式） |
| `npm run migrate:deploy` | 生产/CI：仅应用已有迁移，不创建新迁移 |

## 开发时创建新迁移

1. 修改 `prisma/schema.prisma`
2. 确保本地有可用的 PostgreSQL（或使用 Docker：`docker compose up -d postgres`）
3. 设置 `DATABASE_URL` 并执行：
   ```bash
   export DATABASE_URL="postgresql://watchtogether:watchtogether123@localhost:5432/watchtogether?schema=public"
   npm run migrate:dev
   ```
4. 按提示输入迁移名称，Prisma 会生成 `prisma/migrations/<timestamp>_<name>/migration.sql` 并应用

## CI / 启动前执行迁移

在部署或启动应用前，应对目标数据库执行已有迁移：

- **Docker Compose 内**：先启动 postgres 与 watch-together-server，再在容器内执行：
  ```bash
  docker compose up -d postgres watch-together-server
  docker compose exec watch-together-server npm run migrate:deploy
  ```
- **CI 流水线**：在启动应用前一步执行 `npm run migrate:deploy`，并确保 `DATABASE_URL` 指向目标数据库。
- **容器启动时**（可选）：可在入口脚本中先执行 `npm run migrate:deploy` 再启动 `node dist/server.js`，保证每次启动前数据库已是最新迁移状态。

## 首次部署 / 空库

若数据库为空，首次运行 `migrate:deploy` 会应用 `prisma/migrations/` 下所有迁移（包含初始迁移 `20260131000000_init`），创建 Room、RoomMember、Message、RoomEvent 等表及索引、外键。

## 注意事项

- `migrate:dev` 会连接数据库并可能修改数据，仅用于开发。
- `migrate:deploy` 仅应用未执行的迁移，不会创建新迁移，适合生产与 CI。
- 迁移文件一旦提交并已被他人或环境使用，请勿再修改其内容；新的 schema 变更应通过新的迁移完成。
