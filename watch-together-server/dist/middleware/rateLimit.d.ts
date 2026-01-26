/**
 * Watch Together - 限流中间件
 *
 * 实现 IP 限流和用户限流，使用 Redis 支持多实例
 */
import { Request, Response, NextFunction } from 'express';
/**
 * IP 限流中间件
 *
 * 限制每个 IP 地址的请求频率
 */
export declare function ipRateLimit(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * 用户限流中间件
 *
 * 限制每个用户的请求频率（需要 userId）
 */
export declare function userRateLimit(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * 组合限流中间件（IP + 用户）
 *
 * 同时应用 IP 限流和用户限流
 */
export declare function rateLimit(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=rateLimit.d.ts.map