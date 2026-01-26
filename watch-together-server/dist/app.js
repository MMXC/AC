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
const pino_http_1 = __importDefault(require("pino-http"));
const rooms_1 = __importDefault(require("./routes/rooms"));
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimit_1 = require("./middleware/rateLimit");
const logger_1 = require("./logger");
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
    // JSON 解析中间件（带错误处理）
    app.use(express_1.default.json());
    // URL 编码解析中间件
    app.use(express_1.default.urlencoded({ extended: true }));
    // HTTP 请求日志中间件（必须在限流之前，以便记录所有请求）
    app.use((0, pino_http_1.default)({
        logger: logger_1.logger,
        customLogLevel: (_req, res, _err) => {
            if (res.statusCode >= 500) {
                return 'error';
            }
            else if (res.statusCode >= 400) {
                return 'warn';
            }
            return 'info';
        },
        customSuccessMessage: (req, res) => {
            return `${req.method} ${req.url} - ${res.statusCode}`;
        },
        customErrorMessage: (req, res, err) => {
            return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
        },
        // 自定义请求日志字段
        customProps: (req) => {
            return {
                method: req.method,
                url: req.url,
                path: req.path,
                query: req.query,
                ip: req.ip || req.socket.remoteAddress,
                userAgent: req.get('user-agent'),
            };
        },
        // 自定义响应日志字段
        customAttributeKeys: {
            req: 'request',
            res: 'response',
            err: 'error',
            responseTime: 'duration',
        },
    }));
    // 限流中间件（应用到所有 API 路由）
    app.use('/api', rateLimit_1.rateLimit);
    // 健康检查端点（不应用限流）
    app.get('/health', (_req, res) => {
        res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
        });
    });
    // API 路由
    app.use('/api/v1/rooms', rooms_1.default);
    // 404 处理（必须在错误处理中间件之前）
    app.use((req, res) => {
        res.status(404).json({
            error: 'Not Found',
            message: `Route ${req.method} ${req.path} not found`,
        });
    });
    // 统一错误处理中间件（必须在所有路由之后，包括 404 处理）
    app.use(errorHandler_1.errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map