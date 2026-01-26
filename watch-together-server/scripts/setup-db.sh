#!/bin/bash

# 数据库设置和迁移脚本

set -e

echo "=== 数据库设置和迁移脚本 ==="

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "错误: 请在 watch-together-server 目录中运行此脚本"
    exit 1
fi

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "创建 .env 文件..."
    cp .env.example .env
    echo ".env 文件已创建"
fi

# 检查数据库是否在运行
echo "检查数据库连接..."
if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    echo "✓ 数据库连接正常"
else
    echo "⚠ 数据库未运行或无法连接"
    echo ""
    echo "请先启动数据库："
    echo "  cd /mnt/c/project/AC"
    echo "  docker-compose up -d postgres"
    echo ""
    echo "然后等待几秒钟让数据库完全启动，再重新运行此脚本。"
    exit 1
fi

# 生成迁移文件
echo ""
echo "生成迁移文件..."
npx prisma migrate dev --name init

# 生成 Prisma Client
echo ""
echo "生成 Prisma Client..."
npx prisma generate

echo ""
echo "✓ 数据库设置完成！"
echo ""
echo "迁移文件位置: prisma/migrations/"
echo "Prisma Client 已生成，可以在代码中使用 import { PrismaClient } from '@prisma/client'"
