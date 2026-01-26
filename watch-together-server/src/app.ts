/**
 * Watch Together - Express 应用配置
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';

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

  // 健康检查端点
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // 404 处理（必须在错误处理中间件之前）
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.path} not found`,
    });
  });

  // 错误处理中间件（必须在所有路由之后，包括 404 处理）
  // Express 5.x 会自动捕获同步错误，但我们需要确保中间件正确配置
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    // 如果是 JSON 解析错误
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({
        error: 'Invalid JSON',
        message: 'Request body contains invalid JSON',
      });
      return;
    }

    // 其他错误
    console.error('Error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
    });
  });

  return app;
}
