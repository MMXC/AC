/**
 * Watch Together - 输入验证中间件
 * 使用 Zod 验证请求数据
 */
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
/**
 * 验证请求体的中间件工厂函数
 */
export declare function validateBody<T>(schema: ZodSchema<T>): (req: Request, _res: Response, next: NextFunction) => void;
/**
 * 验证查询参数的中间件工厂函数
 */
export declare function validateQuery<T>(schema: ZodSchema<T>): (req: Request, _res: Response, next: NextFunction) => void;
/**
 * 验证路径参数的中间件工厂函数
 */
export declare function validateParams<T>(schema: ZodSchema<T>): (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=validate.d.ts.map