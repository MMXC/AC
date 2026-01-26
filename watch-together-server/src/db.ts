/**
 * Watch Together - 数据库连接模块
 * 
 * 提供 Prisma Client 单例，管理数据库连接池
 */

import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client 单例
 * 
 * 使用单例模式确保整个应用只有一个 Prisma Client 实例，
 * 避免连接池耗尽问题
 */
let prisma: PrismaClient | null = null;

/**
 * 获取 Prisma Client 实例
 * 
 * 如果实例不存在，创建一个新的实例并配置连接池
 * 
 * @returns Prisma Client 实例
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    // 从环境变量读取 DATABASE_URL
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL environment variable is not set. ' +
        'Please set it in your .env file or environment variables.'
      );
    }

    // 创建 Prisma Client 实例，配置连接池
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      // 连接池配置
      // 注意：Prisma 的连接池配置通过 DATABASE_URL 中的参数设置
      // 例如：postgresql://user:password@host:port/database?connection_limit=10&pool_timeout=20
    });
  }

  return prisma;
}

/**
 * 连接数据库
 * 
 * 显式连接到数据库，验证连接是否正常
 * 
 * @returns Promise<void>
 * @throws 如果连接失败，抛出错误
 */
export async function connectDatabase(): Promise<void> {
  const client = getPrismaClient();
  
  try {
    // 执行简单查询验证连接
    await client.$queryRaw`SELECT 1 as test`;
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 断开数据库连接
 * 
 * 优雅地关闭数据库连接，释放连接池资源
 * 
 * @returns Promise<void>
 */
export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    try {
      await prisma.$disconnect();
      console.log('Database disconnected successfully');
      prisma = null;
    } catch (error) {
      console.error('Error disconnecting from database:', error);
      // 即使断开连接失败，也清空实例引用
      prisma = null;
      throw error;
    }
  }
}

/**
 * 导出 Prisma Client 类型
 */
export type { PrismaClient } from '@prisma/client';
