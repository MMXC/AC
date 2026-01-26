/**
 * Watch Together - Express 应用配置
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import roomsRouter from './routes/rooms';
import { errorHandler } from './middleware/errorHandler';

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

  // API 路由
  app.use('/api/v1/rooms', roomsRouter);

  // 404 处理（必须在错误处理中间件之前）
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
      },
    });
  });

  // 统一错误处理中间件（必须在所有路由之后，包括 404 处理）
  app.use(errorHandler);

  return app;
}
