/**
 * Watch Together - 数据库连接模块
 *
 * 提供 Prisma Client 单例，管理数据库连接池
 */
import { PrismaClient } from '@prisma/client';
/**
 * 获取 Prisma Client 实例
 *
 * 如果实例不存在，创建一个新的实例并配置连接池
 *
 * @returns Prisma Client 实例
 */
export declare function getPrismaClient(): PrismaClient;
/**
 * 连接数据库
 *
 * 显式连接到数据库，验证连接是否正常
 *
 * @returns Promise<void>
 * @throws 如果连接失败，抛出错误
 */
export declare function connectDatabase(): Promise<void>;
/**
 * 断开数据库连接
 *
 * 优雅地关闭数据库连接，释放连接池资源
 *
 * @returns Promise<void>
 */
export declare function disconnectDatabase(): Promise<void>;
/**
 * 导出 Prisma Client 类型
 */
export type { PrismaClient } from '@prisma/client';
//# sourceMappingURL=db.d.ts.map