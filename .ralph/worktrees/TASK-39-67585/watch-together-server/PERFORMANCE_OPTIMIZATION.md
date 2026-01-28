# 性能优化说明

## 数据库查询优化

### 索引优化

所有数据库表都已配置了适当的索引，以优化查询性能：

#### Room 表
- `hostId` 索引：优化按房主查询
- `createdAt` 索引：优化按创建时间排序
- `deletedAt` 索引：优化软删除查询

#### RoomMember 表
- `roomId` 索引：优化按房间查询成员
- `userId` 索引：优化按用户查询
- `lastActiveAt` 索引：优化按最后活动时间查询
- `(roomId, userId)` 唯一索引：确保成员唯一性，同时优化查询

#### Message 表
- `(roomId, createdAt DESC)` 复合索引：优化按房间和时间倒序查询消息（最常见的查询模式）
- `userId` 索引：优化按用户查询消息

#### RoomEvent 表
- `(roomId, createdAt DESC)` 复合索引：优化按房间和时间倒序查询事件
- `eventType` 索引：优化按事件类型查询

### 连接池配置

数据库连接池配置通过 `DATABASE_URL` 环境变量中的参数设置：

```
postgresql://user:password@host:port/database?connection_limit=10&pool_timeout=20
```

建议配置：
- `connection_limit`: 10-20（根据服务器资源调整）
- `pool_timeout`: 20（秒）

### 缓存优化

已实现房间信息缓存服务（`src/services/roomCache.ts`），使用 Redis 缓存房间信息：
- 缓存 TTL：1 小时
- 自动失效：房间更新时自动清除缓存
- 减少数据库查询：缓存命中时直接返回，无需查询数据库

## 性能测试

运行性能测试：

```bash
npm run test:performance
```

测试包括：
1. REST API P95 响应时间测试（目标 < 200ms）
2. WebSocket 消息延迟 P95 测试（目标 < 50ms）
3. 并发 WebSocket 连接测试（目标 10,000+）
4. REST API QPS 测试（目标 1,000+）
5. 数据库查询性能测试

## 性能优化建议

1. **数据库连接池**：根据实际负载调整连接池大小
2. **Redis 缓存**：确保 Redis 正常运行，以利用缓存优化
3. **索引监控**：定期检查慢查询日志，必要时添加新索引
4. **查询优化**：避免 N+1 查询问题，使用 Prisma 的 `include` 或 `select` 优化查询
