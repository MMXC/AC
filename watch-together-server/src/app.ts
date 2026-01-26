/**
 * Watch Together - Express 应用配置
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import roomsRouter from './routes/rooms';
import { errorHandler } from './middleware/errorHandler';
import { rateLimit } from './middleware/rateLimit';
import { logger } from './logger';

/**
 * 创建并配置 Express 应用
 */
export function createApp(): Express {
  const app = express();

  // CORS 中间件配置
  app.use(
    cors({
      origin: '*', // 生产环境应该配置具体的域名
      credentials: true,
    })
  );

  // JSON 解析中间件（带错误处理）
  app.use(express.json());

  // URL 编码解析中间件
  app.use(express.urlencoded({ extended: true }));

  // HTTP 请求日志中间件（必须在限流之前，以便记录所有请求）
  app.use(
    pinoHttp({
      logger,
      customLogLevel: (_req, res, _err) => {
        if (res.statusCode >= 500) {
          return 'error';
        } else if (res.statusCode >= 400) {
          return 'warn';
        }
        return 'info';
      },
      customSuccessMessage: (req, res) => {
        return `${req.method} ${req.url} - ${res.statusCode}`;
      },
      customErrorMessage: (req, res, err) => {
        return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
      },
      // 自定义请求日志字段
      customProps: (req: Request) => {
        return {
          method: req.method,
          url: req.url,
          path: req.path,
          query: req.query,
          ip: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
        };
      },
      // 自定义响应日志字段
      customAttributeKeys: {
        req: 'request',
        res: 'response',
        err: 'error',
        responseTime: 'duration',
      },
    })
  );

  // 限流中间件（应用到所有 API 路由）
  app.use('/api', rateLimit);

  // 健康检查端点（不应用限流）
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // API 路由
  app.use('/api/v1/rooms', roomsRouter);

  // 404 处理（必须在错误处理中间件之前）
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.path} not found`,
    });
  });

  // 统一错误处理中间件（必须在所有路由之后，包括 404 处理）
  app.use(errorHandler);

  return app;
}
