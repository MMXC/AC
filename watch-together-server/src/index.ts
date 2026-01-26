/**
 * Watch Together - 主入口文件
 */

import { startServer } from './server';

export function main(): void {
  startServer();
}

if (require.main === module) {
  main();
}
