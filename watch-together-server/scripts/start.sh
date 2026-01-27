#!/bin/sh
set -e

echo "=== 启动 Watch Together Server ==="

# 等待数据库就绪（最多等待 60 秒）
echo "等待数据库连接..."
for i in $(seq 1 60); do
  # 使用 Node.js 脚本检查数据库连接（更可靠）
  if node -e 'const {PrismaClient}=require("@prisma/client");const p=new PrismaClient();p.$queryRaw`SELECT 1`.then(()=>{p.$disconnect();process.exit(0)}).catch(()=>{p.$disconnect();process.exit(1)})' > /dev/null 2>&1; then
    echo "✓ 数据库连接成功"
    break
  fi
  if [ $i -eq 60 ]; then
    echo "✗ 数据库连接超时"
    echo "请检查："
    echo "  1. PostgreSQL 容器是否正在运行"
    echo "  2. DATABASE_URL 环境变量是否正确"
    echo "  3. 数据库服务是否已完全启动"
    exit 1
  fi
  if [ $((i % 5)) -eq 0 ]; then
    echo "  等待中... ($i/60)"
  fi
  sleep 1
done

# 运行数据库迁移
echo ""
echo "运行数据库迁移..."

# 检查迁移文件是否存在
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "发现迁移文件，使用 migrate deploy..."
  npx prisma migrate deploy || {
    echo "✗ 数据库迁移失败"
    exit 1
  }
else
  echo "⚠ 未找到迁移文件，使用 db push（仅用于开发环境）..."
  echo "生产环境请先创建迁移文件：npx prisma migrate dev --name init"
  npx prisma db push --accept-data-loss || {
    echo "✗ 数据库推送失败"
    exit 1
  }
fi

# 启动服务器
echo ""
echo "启动服务器..."
exec node dist/index.js
