/**
 * Watch Together - 主入口文件
 */

import { startServer } from './server';

export async function main(): Promise<void> {
  await startServer();
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
