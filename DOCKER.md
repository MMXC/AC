# Docker 部署指南

本文档说明如何使用 Docker 构建和运行 Watch Together 应用。

## 快速开始

### 使用 Docker Compose（推荐）

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

应用将在 `http://localhost:3001` 运行。

### 使用 Docker 命令

#### 构建镜像

```bash
docker build -t watch-together:latest .
```

#### 运行容器

```bash
docker run -d \
  --name watch-together \
  -p 3001:3001 \
  -e PORT=3001 \
  watch-together:latest
```

#### 查看日志

```bash
docker logs -f watch-together
```

#### 停止容器

```bash
docker stop watch-together
docker rm watch-together
```

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | `3001` | 服务器监听端口 |
| `NODE_ENV` | `production` | Node.js 环境 |

### 自定义端口

```bash
# 使用 Docker Compose
docker-compose up -d -e PORT=8080

# 使用 Docker 命令
docker run -d \
  --name watch-together \
  -p 8080:8080 \
  -e PORT=8080 \
  watch-together:latest
```

## 健康检查

容器包含健康检查，每 30 秒检查一次服务器状态：

```bash
# 查看健康状态
docker ps
# 或
docker inspect watch-together | grep Health -A 10
```

## 生产环境建议

### 1. 使用特定版本标签

```dockerfile
# 在 Dockerfile 中
FROM node:18-alpine AS builder
```

### 2. 多阶段构建

Dockerfile 已使用多阶段构建，减小最终镜像大小。

### 3. 非 root 用户

容器以非 root 用户（nodejs）运行，提高安全性。

### 4. 资源限制

在生产环境中，建议设置资源限制：

```yaml
# docker-compose.yml
services:
  watch-together:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 5. 持久化数据（如需要）

如果需要持久化房间数据，可以挂载卷：

```yaml
services:
  watch-together:
    volumes:
      - ./data:/app/watch-together/data
```

## 故障排查

### 查看容器日志

```bash
docker logs watch-together
```

### 进入容器调试

```bash
docker exec -it watch-together sh
```

### 检查端口占用

```bash
# Linux/Mac
lsof -i :3001

# Windows
netstat -ano | findstr :3001
```

### 重建镜像

```bash
docker-compose build --no-cache
docker-compose up -d
```

## 镜像优化

当前镜像大小约 150-200MB（基于 node:18-alpine）。

如需进一步优化：

1. 使用更小的基础镜像（如 distroless）
2. 移除不必要的依赖
3. 使用 .dockerignore 排除文件

## 部署到云平台

### Docker Hub

```bash
# 登录
docker login

# 标记镜像
docker tag watch-together:latest yourusername/watch-together:latest

# 推送
docker push yourusername/watch-together:latest
```

### 其他平台

- **AWS ECS**: 使用 ECS Task Definition
- **Google Cloud Run**: 支持直接部署 Docker 镜像
- **Azure Container Instances**: 支持 Docker Compose
- **Kubernetes**: 使用 Deployment 和 Service

## 安全建议

1. ✅ 使用非 root 用户运行
2. ✅ 定期更新基础镜像
3. ✅ 扫描镜像漏洞：`docker scan watch-together:latest`
4. ✅ 使用 secrets 管理敏感信息
5. ✅ 启用 HTTPS（通过反向代理如 Nginx）
