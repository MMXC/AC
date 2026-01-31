# Watch Together - Dockerfile
# 多阶段构建：构建阶段 + 运行阶段

# =============================================================================
# 阶段 1: 构建阶段
# =============================================================================
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY watch-together/package*.json ./

# 安装依赖（生产依赖 + 开发依赖用于测试）
RUN npm install

# 复制源代码
COPY watch-together/ ./

# 运行测试（可选，如果测试失败则构建失败）
# 取消注释以下行以在构建时运行测试
# RUN npm test

# =============================================================================
# 阶段 2: 运行阶段
# =============================================================================
FROM node:18-alpine AS runner

# 设置工作目录
WORKDIR /app

# 创建非 root 用户（安全最佳实践）
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 从构建阶段复制 node_modules 和源代码
COPY --from=builder --chown=nodejs:nodejs /app ./

# 切换到非 root 用户
USER nodejs

# 暴露端口（可通过环境变量 PORT 配置，默认 3001）
EXPOSE 3001

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT}/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动服务器
CMD ["node", "mock-server/server.js"]
