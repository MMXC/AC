/**
 * Watch Together - 统一错误处理中间件
 */
import { Request, Response, NextFunction } from 'express';
/**
 * 错误代码枚举
 */
export declare enum ErrorCode {
    BAD_REQUEST = "BAD_REQUEST",
    UNAUTHORIZED = "UNAUTHORIZED",
    FORBIDDEN = "FORBIDDEN",
    NOT_FOUND = "NOT_FOUND",
    CONFLICT = "CONFLICT",
    VALIDATION_ERROR = "VALIDATION_ERROR",
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
    DATABASE_ERROR = "DATABASE_ERROR",
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"
}
/**
 * 统一错误响应格式
 */
export interface ErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}
/**
 * 统一错误处理中间件
 */
export declare function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void;
/**
 * 创建 HTTP 错误对象（用于在路由处理函数中抛出）
 */
export declare function createHttpError(statusCode: number, errorCode: ErrorCode, message: string): Error & {
    statusCode: number;
    errorCode: string;
};
//# sourceMappingURL=errorHandler.d.ts.map