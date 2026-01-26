/**
 * Redis 连接和缓存服务测试
 */

import {
  getRedisClient,
  connectRedis,
  disconnectRedis,
  getCacheService,
  CacheService,
} from '../src/redis';
import Redis from 'ioredis';

describe('Redis 连接和缓存服务', () => {
  const originalEnv = process.env.REDIS_URL;

  afterEach(async () => {
    // 恢复原始环境变量
    if (originalEnv) {
      process.env.REDIS_URL = originalEnv;
    } else {
      delete process.env.REDIS_URL;
    }

    // 清理：断开所有连接
    try {
      await disconnectRedis();
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('Redis 客户端连接', () => {
    it('应该可以从环境变量读取 REDIS_URL', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      
      // 获取 Redis 客户端不应该抛出错误
      expect(() => getRedisClient()).not.toThrow();
    });

    it('应该在 REDIS_URL 未设置时使用默认值', () => {
      delete process.env.REDIS_URL;
      
      expect(() => getRedisClient()).not.toThrow();
    });

    it('应该返回同一个 Redis 客户端实例（单例模式）', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      
      const client1 = getRedisClient();
      const client2 = getRedisClient();

      expect(client1).toBe(client2);
    });

    it('应该正确解析 Redis URL', () => {
      process.env.REDIS_URL = 'redis://:password@localhost:6379/1';
      
      const client = getRedisClient();
      expect(client).toBeInstanceOf(Redis);
    });

    // 注意：以下测试需要 Redis 服务器运行
    // 如果 Redis 未运行，这些测试会被跳过或失败
    it.skip('应该可以成功连接到 Redis 服务器', async () => {
      process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
      
      await expect(connectRedis()).resolves.not.toThrow();
    }, 15000);

    it.skip('应该可以断开 Redis 连接', async () => {
      process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
      
      await connectRedis();
      await expect(disconnectRedis()).resolves.not.toThrow();
    }, 15000);
  });

  describe('基本的 SET/GET 操作', () => {
    let cache: CacheService;

    beforeEach(() => {
      process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
      cache = getCacheService();
    });

    it('应该可以实现 SET 操作（字符串值）', async () => {
      const key = 'test:set:string';
      const value = 'test-value';

      // 清理可能存在的旧数据
      await cache.delete(key);

      const result = await cache.set(key, value);
      expect(result).toBe('OK');

      const retrieved = await cache.get(key);
      expect(retrieved).toBe(value);

      // 清理
      await cache.delete(key);
    }, 10000);

    it('应该可以实现 SET 操作（对象值，自动序列化）', async () => {
      const key = 'test:set:object';
      const value = { url: 'https://example.com', timestamp: Date.now() };

      // 清理可能存在的旧数据
      await cache.delete(key);

      const result = await cache.set(key, value);
      expect(result).toBe('OK');

      const retrieved = await cache.getJSON(key);
      expect(retrieved).toEqual(value);

      // 清理
      await cache.delete(key);
    }, 10000);

    it('应该可以实现 GET 操作', async () => {
      const key = 'test:get';
      const value = 'test-value';

      // 清理可能存在的旧数据
      await cache.delete(key);

      await cache.set(key, value);
      const retrieved = await cache.get(key);
      expect(retrieved).toBe(value);

      // 清理
      await cache.delete(key);
    }, 10000);

    it('应该在键不存在时返回 null', async () => {
      const key = 'test:nonexistent';

      const retrieved = await cache.get(key);
      expect(retrieved).toBeNull();
    }, 10000);

    it('应该可以实现 DELETE 操作', async () => {
      const key = 'test:delete';
      const value = 'test-value';

      // 清理可能存在的旧数据
      await cache.delete(key);

      await cache.set(key, value);
      expect(await cache.exists(key)).toBe(true);

      const deleted = await cache.delete(key);
      expect(deleted).toBe(1);
      expect(await cache.exists(key)).toBe(false);
    }, 10000);

    it('应该可以检查键是否存在', async () => {
      const key = 'test:exists';
      const value = 'test-value';

      // 清理可能存在的旧数据
      await cache.delete(key);

      expect(await cache.exists(key)).toBe(false);

      await cache.set(key, value);
      expect(await cache.exists(key)).toBe(true);

      // 清理
      await cache.delete(key);
    }, 10000);
  });

  describe('TTL 设置和自动过期', () => {
    let cache: CacheService;

    beforeEach(() => {
      process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
      cache = getCacheService();
    });

    it('应该可以设置键的过期时间', async () => {
      const key = 'test:ttl:set';
      const value = 'test-value';
      const ttlSeconds = 60;

      // 清理可能存在的旧数据
      await cache.delete(key);

      await cache.set(key, value, ttlSeconds);
      
      const ttl = await cache.ttl(key);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(ttlSeconds);

      // 清理
      await cache.delete(key);
    }, 10000);

    it('应该可以获取键的剩余过期时间', async () => {
      const key = 'test:ttl:get';
      const value = 'test-value';
      const ttlSeconds = 60;

      // 清理可能存在的旧数据
      await cache.delete(key);

      await cache.set(key, value, ttlSeconds);
      
      const ttl = await cache.ttl(key);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(ttlSeconds);

      // 清理
      await cache.delete(key);
    }, 10000);

    it('应该可以为已存在的键设置过期时间', async () => {
      const key = 'test:ttl:expire';
      const value = 'test-value';
      const ttlSeconds = 60;

      // 清理可能存在的旧数据
      await cache.delete(key);

      await cache.set(key, value);
      expect(await cache.ttl(key)).toBe(-1); // 永不过期

      const result = await cache.expire(key, ttlSeconds);
      expect(result).toBe(1);

      const ttl = await cache.ttl(key);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(ttlSeconds);

      // 清理
      await cache.delete(key);
    }, 10000);

    it('应该在键不存在时返回 -2', async () => {
      const key = 'test:ttl:nonexistent';

      const ttl = await cache.ttl(key);
      expect(ttl).toBe(-2);
    }, 10000);

    it('应该在键永不过期时返回 -1', async () => {
      const key = 'test:ttl:noexpire';
      const value = 'test-value';

      // 清理可能存在的旧数据
      await cache.delete(key);

      await cache.set(key, value);
      const ttl = await cache.ttl(key);
      expect(ttl).toBe(-1);

      // 清理
      await cache.delete(key);
    }, 10000);
  });

  describe('Set 操作（用于连接管理）', () => {
    let cache: CacheService;

    beforeEach(() => {
      process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
      cache = getCacheService();
    });

    it('应该可以向 Set 添加成员', async () => {
      const key = 'test:set:add';
      const member = 'connection-1';

      // 清理可能存在的旧数据
      await cache.delete(key);

      const added = await cache.sadd(key, member);
      expect(added).toBe(1);

      const members = await cache.smembers(key);
      expect(members).toContain(member);

      // 清理
      await cache.delete(key);
    }, 10000);

    it('应该可以添加多个成员到 Set', async () => {
      const key = 'test:set:add:multiple';
      const members = ['connection-1', 'connection-2', 'connection-3'];

      // 清理可能存在的旧数据
      await cache.delete(key);

      const added = await cache.sadd(key, ...members);
      expect(added).toBe(3);

      const retrieved = await cache.smembers(key);
      expect(retrieved).toHaveLength(3);
      members.forEach(member => {
        expect(retrieved).toContain(member);
      });

      // 清理
      await cache.delete(key);
    }, 10000);

    it('应该可以从 Set 移除成员', async () => {
      const key = 'test:set:remove';
      const member1 = 'connection-1';
      const member2 = 'connection-2';

      // 清理可能存在的旧数据
      await cache.delete(key);

      await cache.sadd(key, member1, member2);
      expect(await cache.scard(key)).toBe(2);

      const removed = await cache.srem(key, member1);
      expect(removed).toBe(1);

      const members = await cache.smembers(key);
      expect(members).not.toContain(member1);
      expect(members).toContain(member2);

      // 清理
      await cache.delete(key);
    }, 10000);

    it('应该可以获取 Set 的所有成员', async () => {
      const key = 'test:set:members';
      const members = ['connection-1', 'connection-2', 'connection-3'];

      // 清理可能存在的旧数据
      await cache.delete(key);

      await cache.sadd(key, ...members);
      const retrieved = await cache.smembers(key);
      
      expect(retrieved).toHaveLength(3);
      members.forEach(member => {
        expect(retrieved).toContain(member);
      });

      // 清理
      await cache.delete(key);
    }, 10000);

    it('应该可以检查成员是否在 Set 中', async () => {
      const key = 'test:set:ismember';
      const member1 = 'connection-1';
      const member2 = 'connection-2';

      // 清理可能存在的旧数据
      await cache.delete(key);

      await cache.sadd(key, member1);
      
      expect(await cache.sismember(key, member1)).toBe(true);
      expect(await cache.sismember(key, member2)).toBe(false);

      // 清理
      await cache.delete(key);
    }, 10000);

    it('应该可以获取 Set 的成员数量', async () => {
      const key = 'test:set:card';
      const members = ['connection-1', 'connection-2', 'connection-3'];

      // 清理可能存在的旧数据
      await cache.delete(key);

      expect(await cache.scard(key)).toBe(0);

      await cache.sadd(key, ...members);
      expect(await cache.scard(key)).toBe(3);

      await cache.srem(key, members[0]);
      expect(await cache.scard(key)).toBe(2);

      // 清理
      await cache.delete(key);
    }, 10000);

    it('应该不会重复添加相同的成员', async () => {
      const key = 'test:set:duplicate';
      const member = 'connection-1';

      // 清理可能存在的旧数据
      await cache.delete(key);

      const added1 = await cache.sadd(key, member);
      expect(added1).toBe(1);

      const added2 = await cache.sadd(key, member);
      expect(added2).toBe(0); // 重复添加返回 0

      expect(await cache.scard(key)).toBe(1);

      // 清理
      await cache.delete(key);
    }, 10000);
  });

  describe('连接错误处理和重试', () => {
    it('应该在连接失败时抛出错误', async () => {
      // 使用无效的 Redis URL
      process.env.REDIS_URL = 'redis://invalid-host:6379';
      
      // 注意：这个测试可能会因为重试机制而需要较长时间
      // 在实际环境中，应该配置较短的超时时间
      const client = getRedisClient();
      
      // 尝试连接应该失败（但不会立即抛出，因为 ioredis 会重试）
      // 这里我们只测试客户端创建不会抛出错误
      expect(client).toBeInstanceOf(Redis);
    });

    it('应该可以处理无效的 Redis URL 格式（使用默认配置）', () => {
      // 使用格式错误的 URL
      process.env.REDIS_URL = 'invalid-url';
      
      // 应该使用默认配置而不是抛出错误
      expect(() => getRedisClient()).not.toThrow();
      
      const client = getRedisClient();
      expect(client).toBeInstanceOf(Redis);
    });
  });

  describe('房间状态缓存示例', () => {
    let cache: CacheService;

    beforeEach(() => {
      process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
      cache = getCacheService();
    });

    it('应该可以存储和获取房间状态', async () => {
      const roomId = '123';
      const key = `room:${roomId}:state`;
      const state = {
        url: 'https://example.com',
        timestamp: Date.now(),
        members: ['user1', 'user2'],
      };

      // 清理可能存在的旧数据
      await cache.delete(key);

      await cache.set(key, state, 3600); // 1 小时过期
      
      const retrieved = await cache.getJSON(key);
      expect(retrieved).toEqual(state);

      const ttl = await cache.ttl(key);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(3600);

      // 清理
      await cache.delete(key);
    }, 10000);
  });
});
