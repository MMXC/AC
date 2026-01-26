#!/bin/bash
# 检查迁移状态脚本
# 用于验证数据库迁移是否已经执行

set -e

echo "检查迁移状态..."
echo ""

# 检查数据库连接
echo "1. 检查数据库连接..."
if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    echo "   ✓ 数据库连接成功"
else
    echo "   ✗ 数据库连接失败 - 请先启动数据库: docker-compose up -d postgres"
    exit 1
fi

# 检查迁移文件
echo ""
echo "2. 检查迁移文件..."
MIGRATIONS_DIR="prisma/migrations"
if [ -d "$MIGRATIONS_DIR" ] && [ "$(ls -A $MIGRATIONS_DIR 2>/dev/null)" ]; then
    echo "   ✓ 迁移文件已存在"
    ls -la "$MIGRATIONS_DIR"
else
    echo "   ✗ 迁移文件不存在"
    echo "   请运行: npx prisma migrate dev --name init"
fi

# 检查数据库表
echo ""
echo "3. 检查数据库表..."
TABLES=$(npx prisma db execute --stdin <<< "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('rooms', 'room_members', 'messages', 'room_events');" 2>/dev/null | grep -c "rooms\|room_members\|messages\|room_events" || echo "0")

if [ "$TABLES" -ge "4" ]; then
    echo "   ✓ 所有表已创建 (找到 $TABLES 张表)"
else
    echo "   ✗ 表未创建或未完全创建 (找到 $TABLES 张表)"
    echo "   请运行: npx prisma migrate dev --name init"
fi

# 检查 Prisma Client
echo ""
echo "4. 检查 Prisma Client..."
if [ -d "node_modules/@prisma/client" ]; then
    echo "   ✓ Prisma Client 已生成"
else
    echo "   ✗ Prisma Client 未生成"
    echo "   请运行: npx prisma generate"
fi

echo ""
echo "检查完成！"
