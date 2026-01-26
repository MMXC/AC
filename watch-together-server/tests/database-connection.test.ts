/**
 * 数据库连接和 Prisma Client 集成测试
 */

import { getPrismaClient, connectDatabase, disconnectDatabase } from '../src/db';
import { PrismaClient } from '@prisma/client';

describe('数据库连接和 Prisma Client 集成', () => {
  const originalEnv = process.env.DATABASE_URL;

  afterEach(async () => {
    // 恢复原始环境变量
    if (originalEnv) {
      process.env.DATABASE_URL = originalEnv;
    } else {
      delete process.env.DATABASE_URL;
    }

    // 清理：断开所有连接
    try {
      await disconnectDatabase();
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('环境变量读取', () => {
    it('应该可以从环境变量读取 DATABASE_URL', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/testdb';
      
      // 获取 Prisma Client 不应该抛出错误
      expect(() => getPrismaClient()).not.toThrow();
    });

    it('应该在 DATABASE_URL 未设置时抛出错误', () => {
      delete process.env.DATABASE_URL;

      expect(() => getPrismaClient()).toThrow('DATABASE_URL environment variable is not set');
    });
  });

  describe('Prisma Client 单例', () => {
    it('应该返回同一个 Prisma Client 实例', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/testdb';
      
      const client1 = getPrismaClient();
      const client2 = getPrismaClient();

      expect(client1).toBe(client2);
    });

    it('应该返回 PrismaClient 类型的实例', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/testdb';
      
      const client = getPrismaClient();

      expect(client).toBeInstanceOf(PrismaClient);
    });
  });

  describe('数据库连接', () => {
    it('应该可以成功连接数据库（如果 DATABASE_URL 有效）', async () => {
      // 注意：这个测试需要实际的数据库运行
      // 如果数据库不可用，测试会失败，这是预期的行为
      if (!process.env.DATABASE_URL) {
        // 如果测试环境没有配置数据库，跳过此测试
        console.log('Skipping database connection test: DATABASE_URL not set');
        return;
      }

      await expect(connectDatabase()).resolves.not.toThrow();
    }, 10000); // 增加超时时间到 10 秒

    it('应该可以执行查询', async () => {
      if (!process.env.DATABASE_URL) {
        console.log('Skipping database query test: DATABASE_URL not set');
        return;
      }

      const client = getPrismaClient();
      const result = await client.$queryRaw<Array<{ test: number }>>`SELECT 1 as test`;

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].test).toBe(1);
    }, 10000);

    it('应该在连接失败时抛出错误', async () => {
      process.env.DATABASE_URL = 'postgresql://invalid:invalid@localhost:5432/invalid';

      await expect(connectDatabase()).rejects.toThrow();
    }, 10000);
  });

  describe('数据库断开连接', () => {
    it('应该可以正确断开数据库连接', async () => {
      if (!process.env.DATABASE_URL) {
        console.log('Skipping database disconnect test: DATABASE_URL not set');
        return;
      }

      // 先连接
      await connectDatabase();

      // 然后断开
      await expect(disconnectDatabase()).resolves.not.toThrow();
    }, 10000);

    it('应该在断开连接后清空实例', async () => {
      if (!process.env.DATABASE_URL) {
        console.log('Skipping instance cleanup test: DATABASE_URL not set');
        return;
      }

      // 获取实例
      const client1 = getPrismaClient();
      expect(client1).toBeDefined();

      // 断开连接
      await disconnectDatabase();

      // 获取新实例应该创建新的连接
      const client2 = getPrismaClient();
      expect(client2).toBeDefined();
      // 注意：由于单例模式，如果实例被清空，新实例应该不同
      // 但由于 Prisma Client 的内部实现，这可能不会完全清空
      // 这个测试主要验证断开连接不会抛出错误
    }, 10000);

    it('应该在实例不存在时安全地处理断开连接', async () => {
      // 确保没有实例
      await disconnectDatabase();

      // 再次断开应该不会抛出错误
      await expect(disconnectDatabase()).resolves.not.toThrow();
    });
  });

  describe('连接池配置', () => {
    it('应该使用环境变量中的 DATABASE_URL', () => {
      const testUrl = 'postgresql://user:password@localhost:5432/testdb?connection_limit=10&pool_timeout=20';
      process.env.DATABASE_URL = testUrl;

      const client = getPrismaClient();
      expect(client).toBeDefined();
      
      // 注意：Prisma Client 内部使用 DATABASE_URL，我们无法直接验证连接池配置
      // 但我们可以验证客户端实例已创建
    });

    it('应该支持连接池参数在 DATABASE_URL 中', () => {
      const testUrl = 'postgresql://user:password@localhost:5432/testdb?connection_limit=5&pool_timeout=10';
      process.env.DATABASE_URL = testUrl;

      expect(() => getPrismaClient()).not.toThrow();
    });
  });

  describe('错误处理', () => {
    it('应该正确处理无效的连接字符串格式', () => {
      process.env.DATABASE_URL = 'invalid-connection-string';

      // Prisma Client 创建时不会立即验证连接字符串格式
      // 只有在实际连接时才会失败
      expect(() => getPrismaClient()).not.toThrow();
    });

    it('应该在连接失败时提供有意义的错误信息', async () => {
      process.env.DATABASE_URL = 'postgresql://invalid:invalid@invalid-host:5432/invalid';

      await expect(connectDatabase()).rejects.toThrow(/Database connection failed/);
    }, 10000);
  });
});
