# watch-together-server - API 服务
FROM node:18-alpine

# Prisma 引擎需要 OpenSSL
RUN apk add --no-cache openssl

WORKDIR /app

# 复制依赖定义
COPY package*.json ./

# 安装生产依赖
RUN npm install --omit=dev

# 复制 Prisma schema 与迁移（供 migrate deploy 使用）
COPY prisma/ prisma/

# 复制构建产物
COPY dist/ dist/

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

CMD ["node", "dist/server.js"]
