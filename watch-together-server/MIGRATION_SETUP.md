# 数据库迁移设置说明

## 前置条件

在生成迁移文件之前，需要先启动 PostgreSQL 数据库。

## 步骤

1. **启动数据库**：
   ```bash
   cd /mnt/c/project/AC
   docker-compose up -d postgres
   ```

2. **等待数据库就绪**（通常需要几秒钟）：
   ```bash
   docker-compose ps
   ```

3. **生成迁移文件**：
   ```bash
   cd watch-together-server
   npx prisma migrate dev --name init
   ```

4. **生成 Prisma Client**（如果迁移命令没有自动生成）：
   ```bash
   npx prisma generate
   ```

## 验证

迁移成功后，`prisma/migrations/` 目录中应该包含迁移文件。

## 注意事项

- 确保 `.env` 文件中的 `DATABASE_URL` 配置正确
- 如果遇到权限问题，可能需要使用 `sudo` 或添加用户到 docker 组
- 迁移文件生成后，不要手动修改迁移文件
