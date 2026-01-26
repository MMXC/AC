# 数据库迁移执行指南

## 概述

本指南将帮助您完成数据库迁移的完整流程。所有必要的配置文件已经准备就绪，您只需要按照以下步骤执行即可。

## 前置条件

1. ✅ Docker 和 Docker Compose 已安装
2. ✅ Node.js 和 npm 已安装
3. ✅ 项目依赖已安装（`npm install`）

## 执行步骤

### 步骤 1: 启动 PostgreSQL 数据库

在项目根目录（`/mnt/c/project/AC`）执行：

```bash
docker-compose up -d postgres
```

这将启动 PostgreSQL 容器。等待几秒钟让数据库完全启动。

**验证数据库是否启动**：

```bash
docker-compose ps
```

应该看到 `watch-together-postgres` 容器状态为 `Up`。

### 步骤 2: 配置环境变量

进入 `watch-together-server` 目录：

```bash
cd watch-together-server
```

如果 `.env` 文件不存在，从示例文件创建：

```bash
cp .env.example .env
```

`.env` 文件应该包含：

```env
DATABASE_URL="postgresql://watchtogether:watchtogether123@localhost:5432/watchtogether?schema=public"
```

### 步骤 3: 运行数据库迁移

有两种方式可以执行迁移：

#### 方式 1: 使用自动化脚本（推荐）

```bash
./scripts/setup-db.sh
```

这个脚本会自动：
- 检查数据库连接
- 生成迁移文件
- 生成 Prisma Client

#### 方式 2: 手动执行

```bash
# 生成迁移文件
npx prisma migrate dev --name init

# 生成 Prisma Client（如果迁移命令没有自动生成）
npx prisma generate
```

### 步骤 4: 验证迁移结果

迁移成功后，您应该看到：

1. **迁移文件已创建**：
   ```bash
   ls -la prisma/migrations/
   ```
   应该包含一个以 `init` 开头的迁移目录。

2. **数据库表已创建**：
   使用 Prisma Studio 查看：
   ```bash
   npm run db:studio
   ```
   或者直接查询数据库：
   ```bash
   docker exec -it watch-together-postgres psql -U watchtogether -d watchtogether -c "\dt"
   ```
   应该看到 4 张表：
   - `rooms`
   - `room_members`
   - `messages`
   - `room_events`

3. **运行测试验证**：
   ```bash
   npm test -- tests/migration.test.ts
   ```

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
- `npm run db:push` - 将 schema 直接推送到数据库（开发环境，不生成迁移文件）
- `npm run db:validate` - 验证 Prisma schema

## 常见问题

### 问题 1: 数据库连接失败

**错误信息**: `Can't reach database server`

**解决方案**:
1. 确保 Docker 正在运行
2. 检查数据库容器是否启动：`docker-compose ps`
3. 等待几秒钟让数据库完全启动
4. 检查端口 5432 是否被占用

### 问题 2: 迁移文件已存在

**错误信息**: `Migration already exists`

**解决方案**:
- 如果这是第一次迁移，删除 `prisma/migrations` 目录（如果存在）
- 如果之前已经运行过迁移，使用 `npx prisma migrate deploy` 来应用迁移

### 问题 3: 权限问题

**错误信息**: `Permission denied`

**解决方案**:
- 确保脚本有执行权限：`chmod +x scripts/setup-db.sh`
- 如果使用 Docker，确保当前用户在 docker 组中

## 下一步

迁移完成后，您可以：

1. 开始使用 Prisma Client 进行数据库操作
2. 运行测试验证数据库结构
3. 使用 Prisma Studio 查看和管理数据

## 注意事项

- ⚠️ 迁移文件生成后，不要手动修改迁移文件
- ⚠️ `.env` 文件包含敏感信息，不要提交到版本控制系统
- ⚠️ 在生产环境中，请使用更安全的数据库密码
- ⚠️ 如果修改了 `schema.prisma`，需要创建新的迁移文件
