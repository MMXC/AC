/**
 * Watch Together - Redis 连接和缓存服务模块
 *
 * 提供 Redis 客户端单例，管理缓存服务（房间状态缓存、WebSocket 连接管理）
 */
import Redis from 'ioredis';
/**
 * 获取 Redis 客户端实例
 *
 * 如果实例不存在，创建一个新的实例并配置连接选项
 *
 * @returns Redis 客户端实例
 */
export declare function getRedisClient(): Redis;
/**
 * 连接 Redis
 *
 * 显式连接到 Redis，验证连接是否正常
 *
 * @returns Promise<void>
 * @throws 如果连接失败，抛出错误
 */
export declare function connectRedis(): Promise<void>;
/**
 * 断开 Redis 连接
 *
 * 优雅地关闭 Redis 连接，释放资源
 *
 * @returns Promise<void>
 */
export declare function disconnectRedis(): Promise<void>;
/**
 * 缓存服务封装类
 *
 * 提供房间状态缓存、WebSocket 连接管理等常用操作
 */
export declare class CacheService {
    private client;
    constructor();
    /**
     * 设置键值对（带过期时间）
     *
     * @param key 键
     * @param value 值（字符串或对象，对象会自动序列化为 JSON）
     * @param ttlSeconds 过期时间（秒），可选
     * @returns Promise<'OK'>
     */
    set(key: string, value: string | object, ttlSeconds?: number): Promise<'OK'>;
    /**
     * 获取键对应的值
     *
     * @param key 键
     * @returns Promise<string | null> 值，如果不存在返回 null
     */
    get(key: string): Promise<string | null>;
    /**
     * 获取键对应的值并解析为 JSON
     *
     * @param key 键
     * @returns Promise<T | null> 解析后的对象，如果不存在或解析失败返回 null
     */
    getJSON<T = any>(key: string): Promise<T | null>;
    /**
     * 删除键
     *
     * @param key 键
     * @returns Promise<number> 删除的键数量（0 或 1）
     */
    delete(key: string): Promise<number>;
    /**
     * 检查键是否存在
     *
     * @param key 键
     * @returns Promise<boolean> 键是否存在
     */
    exists(key: string): Promise<boolean>;
    /**
     * 获取键的剩余过期时间（TTL）
     *
     * @param key 键
     * @returns Promise<number> 剩余秒数，-1 表示永不过期，-2 表示键不存在
     */
    ttl(key: string): Promise<number>;
    /**
     * 设置键的过期时间
     *
     * @param key 键
     * @param ttlSeconds 过期时间（秒）
     * @returns Promise<number> 1 表示设置成功，0 表示键不存在
     */
    expire(key: string, ttlSeconds: number): Promise<number>;
    /**
     * 向 Set 添加成员
     *
     * @param key Set 的键
     * @param members 要添加的成员（可以是多个）
     * @returns Promise<number> 添加的新成员数量
     */
    sadd(key: string, ...members: (string | number)[]): Promise<number>;
    /**
     * 从 Set 移除成员
     *
     * @param key Set 的键
     * @param members 要移除的成员（可以是多个）
     * @returns Promise<number> 移除的成员数量
     */
    srem(key: string, ...members: (string | number)[]): Promise<number>;
    /**
     * 获取 Set 的所有成员
     *
     * @param key Set 的键
     * @returns Promise<string[]> Set 的所有成员
     */
    smembers(key: string): Promise<string[]>;
    /**
     * 检查成员是否在 Set 中
     *
     * @param key Set 的键
     * @param member 成员
     * @returns Promise<boolean> 成员是否在 Set 中
     */
    sismember(key: string, member: string | number): Promise<boolean>;
    /**
     * 获取 Set 的成员数量
     *
     * @param key Set 的键
     * @returns Promise<number> Set 的成员数量
     */
    scard(key: string): Promise<number>;
}
/**
 * 获取缓存服务实例
 *
 * @returns CacheService 实例
 */
export declare function getCacheService(): CacheService;
/**
 * 导出 Redis 客户端类型
 */
export type { Redis } from 'ioredis';
//# sourceMappingURL=redis.d.ts.map