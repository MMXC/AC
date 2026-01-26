/**
 * Watch Together - 服务器启动文件
 */

import { createApp } from './app';

const PORT = process.env.PORT || 3000;

/**
 * 启动服务器
 */
export function startServer(): void {
  const app = createApp();

  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  // 优雅关闭
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

// 如果直接运行此文件，启动服务器
if (require.main === module) {
  startServer();
}
