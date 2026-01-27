# Watch Together Server - Dockerfile
# 多阶段构建：构建阶段 + 运行阶段

# =============================================================================
# 阶段 1: 构建阶段
# =============================================================================
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./
COPY tsconfig.json ./

# 安装依赖（包括开发依赖，用于编译 TypeScript）
RUN npm ci

# 复制 Prisma schema
COPY prisma ./prisma

# 生成 Prisma Client
RUN npx prisma generate

# 复制源代码和脚本
COPY src ./src
COPY scripts ./scripts

# 编译 TypeScript
RUN npm run build

# =============================================================================
# 阶段 2: 运行阶段
# =============================================================================
FROM node:18-alpine AS runner

# 设置工作目录
WORKDIR /app

# 创建非 root 用户（安全最佳实践）
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 从构建阶段复制必要文件
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# 复制启动脚本
COPY --from=builder --chown=nodejs:nodejs /app/scripts ./scripts

# 创建 logs 目录并设置权限（在切换到非 root 用户之前）
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

# 确保启动脚本可执行
RUN chmod +x /app/scripts/start.sh

# 切换到非 root 用户
USER nodejs

# 暴露端口（可通过环境变量 PORT 配置，默认 3000）
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT}/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动服务器（使用启动脚本，会自动运行迁移）
CMD ["/app/scripts/start.sh"]
