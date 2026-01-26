# Prisma 数据库设置说明

## 已完成的工作

1. ✅ Prisma schema 文件已创建：`prisma/schema.prisma`
2. ✅ 定义了 4 个数据模型：Room, RoomMember, Message, RoomEvent
3. ✅ 所有字段类型和约束已正确配置（主键、外键、索引等）
4. ✅ Prisma Client 已生成，可以导入使用
5. ✅ PostgreSQL 服务已添加到 `docker-compose.yml`
6. ✅ 环境变量配置文件已创建：`.env` 和 `.env.example`

## 下一步操作

### 1. 启动 PostgreSQL 数据库

在项目根目录执行：

```bash
docker-compose up -d postgres
```

这将启动 PostgreSQL 容器。等待几秒钟让数据库完全启动。

### 2. 运行数据库迁移

在 `watch-together-server` 目录下执行：

```bash
cd watch-together-server
npm run db:migrate
```

或者直接使用：

```bash
npx prisma migrate dev --name init
```

这将：
- 创建数据库表（rooms, room_members, messages, room_events）
- 创建所有索引和外键约束
- 生成迁移文件到 `prisma/migrations/` 目录

### 3. 验证数据库表

迁移完成后，可以验证表是否创建成功：

```bash
# 使用 Prisma Studio 查看数据库
npm run db:studio
```

或者在 PostgreSQL 中查询：

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

应该看到 4 张表：
- `rooms`
- `room_members`
- `messages`
- `room_events`

## 数据库连接信息

- **主机**: localhost
- **端口**: 5432
- **数据库名**: watchtogether
- **用户名**: watchtogether
- **密码**: watchtogether123
- **连接字符串**: `postgresql://watchtogether:watchtogether123@localhost:5432/watchtogether?schema=public`

## 可用的 npm 脚本

- `npm run db:migrate` - 运行数据库迁移
- `npm run db:generate` - 生成 Prisma Client
- `npm run db:studio` - 打开 Prisma Studio（数据库可视化工具）
- `npm run db:push` - 将 schema 直接推送到数据库（开发环境）
- `npm run db:validate` - 验证 Prisma schema

## 注意事项

- 确保 Docker 和 Docker Compose 已安装并运行
- 如果端口 5432 已被占用，可以修改 `docker-compose.yml` 中的端口映射
- `.env` 文件包含敏感信息，不要提交到版本控制系统（已在 `.gitignore` 中）
