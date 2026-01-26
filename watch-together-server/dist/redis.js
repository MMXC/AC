"use strict";
/**
 * Watch Together - Redis 连接和缓存服务模块
 *
 * 提供 Redis 客户端单例，管理缓存服务（房间状态缓存、WebSocket 连接管理）
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
exports.getRedisClient = getRedisClient;
exports.connectRedis = connectRedis;
exports.disconnectRedis = disconnectRedis;
exports.getCacheService = getCacheService;
const ioredis_1 = __importDefault(require("ioredis"));
/**
 * Redis 客户端单例
 *
 * 使用单例模式确保整个应用只有一个 Redis 客户端实例，
 * 避免连接池耗尽问题
 */
let redis = null;
/**
 * 获取 Redis 客户端实例
 *
 * 如果实例不存在，创建一个新的实例并配置连接选项
 *
 * @returns Redis 客户端实例
 */
function getRedisClient() {
    if (!redis) {
        // 从环境变量读取 REDIS_URL，如果没有则使用默认值
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        // 尝试解析 Redis URL，如果失败则使用默认配置
        let options = redisUrl;
        try {
            // 验证 URL 格式是否有效
            new URL(redisUrl);
            // 如果 URL 格式有效，直接使用 URL 字符串（ioredis 会自动解析）
            options = redisUrl;
        }
        catch (error) {
            // 如果 URL 格式无效，使用默认配置
            console.warn(`Invalid REDIS_URL format: ${redisUrl}, using default configuration`);
            options = {
                host: 'localhost',
                port: 6379,
            };
        }
        // 添加连接选项（如果 options 是字符串，这些选项会被合并）
        const connectionOptions = {
            // 连接重试配置
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            // 最大重试次数
            maxRetriesPerRequest: 3,
            // 连接超时（毫秒）
            connectTimeout: 10000,
            // 启用自动重连
            enableReadyCheck: true,
            // 日志配置（仅在开发环境）
            lazyConnect: false,
        };
        // 如果 options 是字符串，合并连接选项；否则合并两个对象
        if (typeof options === 'string') {
            redis = new ioredis_1.default(options, connectionOptions);
        }
        else {
            redis = new ioredis_1.default({ ...options, ...connectionOptions });
        }
        // 监听连接事件
        redis.on('connect', () => {
            console.log('Redis client connected');
        });
        redis.on('ready', () => {
            console.log('Redis client ready');
        });
        redis.on('error', error => {
            console.error('Redis client error:', error);
        });
        redis.on('close', () => {
            console.log('Redis client connection closed');
        });
        redis.on('reconnecting', (time) => {
            console.log(`Redis client reconnecting in ${time}ms`);
        });
    }
    return redis;
}
/**
 * 连接 Redis
 *
 * 显式连接到 Redis，验证连接是否正常
 *
 * @returns Promise<void>
 * @throws 如果连接失败，抛出错误
 */
async function connectRedis() {
    const client = getRedisClient();
    try {
        // 执行 PING 命令验证连接
        const result = await client.ping();
        if (result !== 'PONG') {
            throw new Error('Redis PING failed: unexpected response');
        }
        console.log('Redis connected successfully');
    }
    catch (error) {
        console.error('Failed to connect to Redis:', error);
        throw new Error(`Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * 断开 Redis 连接
 *
 * 优雅地关闭 Redis 连接，释放资源
 *
 * @returns Promise<void>
 */
async function disconnectRedis() {
    if (redis) {
        try {
            await redis.quit();
            console.log('Redis disconnected successfully');
            redis = null;
        }
        catch (error) {
            console.error('Error disconnecting from Redis:', error);
            // 即使断开连接失败，也清空实例引用
            redis = null;
            throw error;
        }
    }
}
/**
 * 缓存服务封装类
 *
 * 提供房间状态缓存、WebSocket 连接管理等常用操作
 */
class CacheService {
    client;
    constructor() {
        this.client = getRedisClient();
    }
    /**
     * 设置键值对（带过期时间）
     *
     * @param key 键
     * @param value 值（字符串或对象，对象会自动序列化为 JSON）
     * @param ttlSeconds 过期时间（秒），可选
     * @returns Promise<'OK'>
     */
    async set(key, value, ttlSeconds) {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        if (ttlSeconds !== undefined) {
            return await this.client.set(key, stringValue, 'EX', ttlSeconds);
        }
        else {
            return await this.client.set(key, stringValue);
        }
    }
    /**
     * 获取键对应的值
     *
     * @param key 键
     * @returns Promise<string | null> 值，如果不存在返回 null
     */
    async get(key) {
        return await this.client.get(key);
    }
    /**
     * 获取键对应的值并解析为 JSON
     *
     * @param key 键
     * @returns Promise<T | null> 解析后的对象，如果不存在或解析失败返回 null
     */
    async getJSON(key) {
        const value = await this.client.get(key);
        if (!value) {
            return null;
        }
        try {
            return JSON.parse(value);
        }
        catch (error) {
            console.error(`Failed to parse JSON for key ${key}:`, error);
            return null;
        }
    }
    /**
     * 删除键
     *
     * @param key 键
     * @returns Promise<number> 删除的键数量（0 或 1）
     */
    async delete(key) {
        return await this.client.del(key);
    }
    /**
     * 检查键是否存在
     *
     * @param key 键
     * @returns Promise<boolean> 键是否存在
     */
    async exists(key) {
        const result = await this.client.exists(key);
        return result === 1;
    }
    /**
     * 获取键的剩余过期时间（TTL）
     *
     * @param key 键
     * @returns Promise<number> 剩余秒数，-1 表示永不过期，-2 表示键不存在
     */
    async ttl(key) {
        return await this.client.ttl(key);
    }
    /**
     * 设置键的过期时间
     *
     * @param key 键
     * @param ttlSeconds 过期时间（秒）
     * @returns Promise<number> 1 表示设置成功，0 表示键不存在
     */
    async expire(key, ttlSeconds) {
        return await this.client.expire(key, ttlSeconds);
    }
    /**
     * 向 Set 添加成员
     *
     * @param key Set 的键
     * @param members 要添加的成员（可以是多个）
     * @returns Promise<number> 添加的新成员数量
     */
    async sadd(key, ...members) {
        return await this.client.sadd(key, ...members);
    }
    /**
     * 从 Set 移除成员
     *
     * @param key Set 的键
     * @param members 要移除的成员（可以是多个）
     * @returns Promise<number> 移除的成员数量
     */
    async srem(key, ...members) {
        return await this.client.srem(key, ...members);
    }
    /**
     * 获取 Set 的所有成员
     *
     * @param key Set 的键
     * @returns Promise<string[]> Set 的所有成员
     */
    async smembers(key) {
        return await this.client.smembers(key);
    }
    /**
     * 检查成员是否在 Set 中
     *
     * @param key Set 的键
     * @param member 成员
     * @returns Promise<boolean> 成员是否在 Set 中
     */
    async sismember(key, member) {
        const result = await this.client.sismember(key, member);
        return result === 1;
    }
    /**
     * 获取 Set 的成员数量
     *
     * @param key Set 的键
     * @returns Promise<number> Set 的成员数量
     */
    async scard(key) {
        return await this.client.scard(key);
    }
}
exports.CacheService = CacheService;
/**
 * 获取缓存服务实例
 *
 * @returns CacheService 实例
 */
function getCacheService() {
    return new CacheService();
}
//# sourceMappingURL=redis.js.map