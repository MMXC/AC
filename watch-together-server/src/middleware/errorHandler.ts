/**
 * Watch Together - 统一错误处理中间件
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../logger';

/**
 * 错误代码枚举
 */
export enum ErrorCode {
  // 客户端错误 (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // 服务器错误 (5xx)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
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
 * 将 Zod 错误转换为用户友好的错误消息
 */
function formatZodError(error: ZodError): string {
  const issues = error.issues;
  if (issues.length === 0) {
    return 'Validation failed';
  }

  // 如果是单个错误，直接返回该错误的消息
  if (issues.length === 1) {
    return issues[0].message;
  }

  // 多个错误，返回第一个错误的路径和消息
  const firstIssue = issues[0];
  const path = firstIssue.path.length > 0 ? firstIssue.path.join('.') : 'field';
  return `${path}: ${firstIssue.message}`;
}

/**
 * 处理 Prisma 错误
 */
function handlePrismaError(error: unknown): { code: ErrorCode; message: string; statusCode: number } {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // 唯一约束违反
        return {
          code: ErrorCode.CONFLICT,
          message: 'A record with this value already exists',
          statusCode: 409,
        };
      case 'P2025':
        // 记录未找到
        return {
          code: ErrorCode.NOT_FOUND,
          message: 'Record not found',
          statusCode: 404,
        };
      default:
        return {
          code: ErrorCode.DATABASE_ERROR,
          message: 'Database operation failed',
          statusCode: 500,
        };
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Invalid data provided',
      statusCode: 400,
    };
  }

  // 未知的 Prisma 错误
  return {
    code: ErrorCode.DATABASE_ERROR,
    message: 'Database operation failed',
    statusCode: 500,
  };
}

/**
 * 统一错误处理中间件
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 创建错误日志上下文
  const errorContext = {
    method: req.method,
    path: req.path,
    url: req.url,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  };

  // 使用 Pino 记录错误日志（包含堆栈信息）
  if (error instanceof Error) {
    logger.error(
      {
        ...errorContext,
        err: error, // Pino 会自动提取堆栈信息
      },
      `Error occurred: ${error.message}`
    );
  } else {
    logger.error(errorContext, `Error occurred: ${String(error)}`);
  }

  // 处理 Zod 验证错误
  if (error instanceof ZodError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: formatZodError(error),
        details: error.issues,
      },
    };
    res.status(400).json(response);
    return;
  }

  // 处理 Prisma 错误
  if (error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientValidationError) {
    const { code, message, statusCode } = handlePrismaError(error);
    const response: ErrorResponse = {
      success: false,
      error: {
        code,
        message,
      },
    };
    res.status(statusCode).json(response);
    return;
  }

  // 处理已知的 HTTP 错误（带有 statusCode 和 errorCode）
  if (error && typeof error === 'object' && 'statusCode' in error && 'errorCode' in error) {
    const httpError = error as { statusCode: number; errorCode: string; message?: string };
    const response: ErrorResponse = {
      success: false,
      error: {
        code: httpError.errorCode,
        message: httpError.message || 'An error occurred',
      },
    };
    res.status(httpError.statusCode).json(response);
    return;
  }

  // 处理其他错误
  const response: ErrorResponse = {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    },
  };
  res.status(500).json(response);
}

/**
 * 创建 HTTP 错误对象（用于在路由处理函数中抛出）
 */
export function createHttpError(statusCode: number, errorCode: ErrorCode, message: string): Error & {
  statusCode: number;
  errorCode: string;
} {
  const error = new Error(message) as Error & { statusCode: number; errorCode: string };
  error.statusCode = statusCode;
  error.errorCode = errorCode;
  return error;
}
