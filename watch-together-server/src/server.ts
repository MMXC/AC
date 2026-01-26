/**
 * Watch Together - 服务器启动文件
 */

import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './db';
import { connectRedis, disconnectRedis } from './redis';
import { createWebSocketServer, closeWebSocketServer } from './websocket';

const PORT = process.env.PORT || 3000;

/**
 * 启动服务器
 *
 * 连接数据库和 Redis，启动 HTTP 服务器和 WebSocket 服务器
 */
export async function startServer(): Promise<void> {
  try {
    // 连接数据库
    await connectDatabase();
  } catch (error) {
    console.error('Failed to start server: database connection failed', error);
    process.exit(1);
  }

  try {
    // 连接 Redis
    await connectRedis();
  } catch (error) {
    console.error('Failed to start server: Redis connection failed', error);
    // Redis 连接失败不应该阻止服务器启动，只记录警告
    console.warn('Server will continue without Redis (some features may be limited)');
  }

  const app = createApp();

  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  // 创建 WebSocket 服务器
  createWebSocketServer(server);

  // 优雅关闭处理函数
  const gracefulShutdown = async (signal: string) => {
    console.log(`${signal} signal received: closing servers`);

    // 关闭 WebSocket 服务器
    try {
      await closeWebSocketServer();
    } catch (error) {
      console.error('Error closing WebSocket server:', error);
    }

    server.close(async () => {
      console.log('HTTP server closed');

      try {
        // 断开数据库连接
        await disconnectDatabase();
        // 断开 Redis 连接
        await disconnectRedis();
        console.log('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    });

    // 如果 10 秒内没有正常关闭，强制退出
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  // 注册信号处理器
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // 处理未捕获的异常
  process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    await gracefulShutdown('unhandledRejection');
  });

  // 处理未捕获的异常
  process.on('uncaughtException', async error => {
    console.error('Uncaught Exception:', error);
    await gracefulShutdown('uncaughtException');
  });
}

// 如果直接运行此文件，启动服务器
if (require.main === module) {
  startServer();
}
