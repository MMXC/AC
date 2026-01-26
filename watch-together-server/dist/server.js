"use strict";
/**
 * Watch Together - 服务器启动文件
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
const app_1 = require("./app");
const db_1 = require("./db");
const PORT = process.env.PORT || 3000;
/**
 * 启动服务器
 *
 * 连接数据库并启动 HTTP 服务器
 */
async function startServer() {
    try {
        // 连接数据库
        await (0, db_1.connectDatabase)();
    }
    catch (error) {
        console.error('Failed to start server: database connection failed', error);
        process.exit(1);
    }
    const app = (0, app_1.createApp)();
    const server = app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
    // 优雅关闭处理函数
    const gracefulShutdown = async (signal) => {
        console.log(`${signal} signal received: closing HTTP server`);
        server.close(async () => {
            console.log('HTTP server closed');
            try {
                // 断开数据库连接
                await (0, db_1.disconnectDatabase)();
                console.log('Graceful shutdown completed');
                process.exit(0);
            }
            catch (error) {
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
    process.on('uncaughtException', async (error) => {
        console.error('Uncaught Exception:', error);
        await gracefulShutdown('uncaughtException');
    });
}
// 如果直接运行此文件，启动服务器
if (require.main === module) {
    startServer();
}
//# sourceMappingURL=server.js.map