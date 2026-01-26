"use strict";
/**
 * Watch Together - 服务器启动文件
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
const app_1 = require("./app");
const PORT = process.env.PORT || 3000;
/**
 * 启动服务器
 */
function startServer() {
    const app = (0, app_1.createApp)();
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
//# sourceMappingURL=server.js.map