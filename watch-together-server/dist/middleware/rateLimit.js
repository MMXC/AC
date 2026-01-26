"use strict";
/**
 * Watch Together - 限流中间件
 *
 * 实现 IP 限流和用户限流，使用 Redis 支持多实例
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ipRateLimit = ipRateLimit;
exports.userRateLimit = userRateLimit;
exports.rateLimit = rateLimit;
const redis_1 = require("../redis");
/**
 * 限流配置
 */
const RATE_LIMIT_CONFIG = {
    // IP 限流：100 请求/分钟
    ipLimit: {
        maxRequests: 100,
        windowMs: 60 * 1000, // 1 分钟
    },
    // 用户限流：1000 请求/小时
    userLimit: {
        maxRequests: 1000,
        windowMs: 60 * 60 * 1000, // 1 小时
    },
};
/**
 * 获取客户端 IP 地址
 *
 * @param req Express 请求对象
 * @returns 客户端 IP 地址
 */
function getClientIp(req) {
    // 优先从 X-Forwarded-For 获取（代理服务器场景）
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        // X-Forwarded-For 可能包含多个 IP，取第一个
        const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
        return ips.trim();
    }
    // 其次从 X-Real-IP 获取
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
        return Array.isArray(realIp) ? realIp[0] : realIp;
    }
    // 最后从 socket.remoteAddress 获取
    return req.socket.remoteAddress || 'unknown';
}
/**
 * 获取用户 ID（从请求头或查询参数）
 *
 * @param req Express 请求对象
 * @returns 用户 ID，如果不存在返回 null
 */
function getUserId(req) {
    // 优先从请求头获取
    const userIdHeader = req.headers['x-user-id'];
    if (userIdHeader) {
        return Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader;
    }
    // 其次从查询参数获取
    const userIdQuery = req.query.userId;
    if (userIdQuery) {
        if (Array.isArray(userIdQuery)) {
            return typeof userIdQuery[0] === 'string' ? userIdQuery[0] : null;
        }
        if (typeof userIdQuery === 'string') {
            return userIdQuery;
        }
    }
    // 最后从请求体获取（仅 POST/PUT 请求）
    if (req.body && req.body.userId) {
        return req.body.userId;
    }
    return null;
}
/**
 * 检查限流（使用 Redis）
 *
 * @param key 限流键（如 "rate_limit:ip:192.168.1.1" 或 "rate_limit:user:user-123"）
 * @param maxRequests 最大请求数
 * @param windowMs 时间窗口（毫秒）
 * @returns Promise<{ allowed: boolean; remaining: number; resetAt: number }>
 */
async function checkRateLimit(key, maxRequests, windowMs) {
    const cache = (0, redis_1.getCacheService)();
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const resetAt = windowStart + windowMs;
    // 使用滑动窗口算法
    // Redis key: rate_limit:{type}:{identifier}:{windowStart}
    const redisKey = `${key}:${windowStart}`;
    try {
        // 获取当前计数
        const currentCount = await cache.get(redisKey);
        const count = currentCount ? parseInt(currentCount, 10) : 0;
        // 检查是否超过限制
        if (count >= maxRequests) {
            return {
                allowed: false,
                remaining: 0,
                resetAt,
            };
        }
        // 增加计数
        const newCount = count + 1;
        await cache.set(redisKey, newCount.toString(), Math.ceil(windowMs / 1000));
        return {
            allowed: true,
            remaining: maxRequests - newCount,
            resetAt,
        };
    }
    catch (error) {
        // Redis 错误时，允许请求通过（降级策略）
        console.error('Rate limit check failed:', error);
        return {
            allowed: true,
            remaining: maxRequests,
            resetAt,
        };
    }
}
/**
 * IP 限流中间件
 *
 * 限制每个 IP 地址的请求频率
 */
async function ipRateLimit(req, res, next) {
    const clientIp = getClientIp(req);
    const key = `rate_limit:ip:${clientIp}`;
    const result = await checkRateLimit(key, RATE_LIMIT_CONFIG.ipLimit.maxRequests, RATE_LIMIT_CONFIG.ipLimit.windowMs);
    // 设置响应头
    res.setHeader('X-RateLimit-Limit', RATE_LIMIT_CONFIG.ipLimit.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(result.resetAt).toISOString());
    if (!result.allowed) {
        res.status(429).json({
            success: false,
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests from this IP address. Please try again later.',
                details: {
                    limit: RATE_LIMIT_CONFIG.ipLimit.maxRequests,
                    window: `${RATE_LIMIT_CONFIG.ipLimit.windowMs / 1000} seconds`,
                    resetAt: new Date(result.resetAt).toISOString(),
                },
            },
        });
        return;
    }
    next();
}
/**
 * 用户限流中间件
 *
 * 限制每个用户的请求频率（需要 userId）
 */
async function userRateLimit(req, res, next) {
    const userId = getUserId(req);
    // 如果没有 userId，跳过用户限流（只使用 IP 限流）
    if (!userId) {
        next();
        return;
    }
    const key = `rate_limit:user:${userId}`;
    const result = await checkRateLimit(key, RATE_LIMIT_CONFIG.userLimit.maxRequests, RATE_LIMIT_CONFIG.userLimit.windowMs);
    // 设置响应头
    res.setHeader('X-RateLimit-Limit', RATE_LIMIT_CONFIG.userLimit.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(result.resetAt).toISOString());
    if (!result.allowed) {
        res.status(429).json({
            success: false,
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests from this user. Please try again later.',
                details: {
                    limit: RATE_LIMIT_CONFIG.userLimit.maxRequests,
                    window: `${RATE_LIMIT_CONFIG.userLimit.windowMs / 1000} seconds`,
                    resetAt: new Date(result.resetAt).toISOString(),
                },
            },
        });
        return;
    }
    next();
}
/**
 * 组合限流中间件（IP + 用户）
 *
 * 同时应用 IP 限流和用户限流
 */
async function rateLimit(req, res, next) {
    // 先检查 IP 限流
    await ipRateLimit(req, res, (err) => {
        if (err) {
            return next(err);
        }
        // IP 限流通过后，检查用户限流
        userRateLimit(req, res, next);
    });
}
//# sourceMappingURL=rateLimit.js.map