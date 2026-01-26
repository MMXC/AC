"use strict";
/**
 * Watch Together - Express 应用配置
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
/**
 * 创建并配置 Express 应用
 */
function createApp() {
    const app = (0, express_1.default)();
    // CORS 中间件配置
    app.use((0, cors_1.default)({
        origin: '*', // 生产环境应该配置具体的域名
        credentials: true,
    }));
    // JSON 解析中间件
    app.use(express_1.default.json());
    // URL 编码解析中间件
    app.use(express_1.default.urlencoded({ extended: true }));
    // 健康检查端点
    app.get('/health', (_req, res) => {
        res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
        });
    });
    // 404 处理（必须在错误处理中间件之前）
    app.use((req, res) => {
        res.status(404).json({
            error: 'Not Found',
            message: `Route ${req.method} ${req.path} not found`,
        });
    });
    // 错误处理中间件（必须在所有路由之后，包括 404 处理）
    app.use((err, _req, res, _next) => {
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
//# sourceMappingURL=app.js.map