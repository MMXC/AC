---
backlog_id: backlog-11
task: Redis 连接和缓存服务
test_command: "npm test -- redis-service.test.ts
npm test -- redis-service.test.ts"
---

# Task: Redis 连接和缓存服务

## Description

配置 Redis 连接，创建缓存服务封装（房间状态缓存、WebSocket 连接管理）

**Test Command**: `npm test -- redis-service.test.ts`

**测试用例**:

**测试数据**:
1. 输入: ``SET room:123:state '{"url": "https://example.com"}' EX 3600``
   预期输出: `值成功存储，1 小时后过期`

**测试场景**:
1. 存储房间状态应该成功
2. 获取房间状态应该返回正确值
3. TTL 过期后应该自动删除

**断言示例**:
1. `await redis.set('test:key', 'value', 'EX', 60)`
2. `const value = await redis.get('test:key')`
3. `expect(value).toBe('value')`
4. `const ttl = await redis.ttl('test:key')`
5. `expect(ttl).toBeGreaterThan(0)`

**Test Command**: `npm test -- redis-service.test.ts`

## Success Criteria

- [x] Redis 客户端可以成功连接
- [x] 可以实现基本的 SET/GET 操作
- [x] 可以实现 Set 操作（用于连接管理）
- [x] TTL 设置和自动过期工作正常
- [x] 连接错误可以正确处理和重试
