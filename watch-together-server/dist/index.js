"use strict";
/**
 * Watch Together - 主入口文件
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const server_1 = require("./server");
async function main() {
    await (0, server_1.startServer)();
}
if (require.main === module) {
    main().catch((error) => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map