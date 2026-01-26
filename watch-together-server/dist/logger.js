"use strict";
/**
 * Watch Together - 日志配置模块
 * 使用 Pino 实现结构化日志
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LogLevel = void 0;
exports.createChildLogger = createChildLogger;
const pino_1 = __importDefault(require("pino"));
const fs_1 = require("fs");
const path_1 = require("path");
// 确保 logs 目录存在
const logsDir = (0, path_1.join)(process.cwd(), 'logs');
if (!(0, fs_1.existsSync)(logsDir)) {
    (0, fs_1.mkdirSync)(logsDir, { recursive: true });
}
/**
 * 日志级别枚举
 */
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "debug";
    LogLevel["INFO"] = "info";
    LogLevel["WARN"] = "warn";
    LogLevel["ERROR"] = "error";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
/**
 * 从环境变量获取日志级别，默认为 INFO
 */
function getLogLevel() {
    const level = process.env.LOG_LEVEL?.toLowerCase();
    if (level && Object.values(LogLevel).includes(level)) {
        return level;
    }
    return LogLevel.INFO;
}
/**
 * 创建 Pino logger 实例
 * - 开发环境：使用 pino-pretty 格式化输出到控制台
 * - 生产环境：输出 JSON 格式到文件和控制台
 */
exports.logger = (0, pino_1.default)({
    level: getLogLevel(),
    transport: process.env.NODE_ENV === 'production'
        ? undefined // 生产环境不使用 transport，直接输出 JSON
        : {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        },
    // 生产环境输出到文件
    ...(process.env.NODE_ENV === 'production' && {
        streams: [
            {
                level: 'info',
                stream: pino_1.default.destination((0, path_1.join)(logsDir, 'app.log')),
            },
            {
                level: 'error',
                stream: pino_1.default.destination((0, path_1.join)(logsDir, 'error.log')),
            },
        ],
    }),
    // 基础字段
    base: {
        env: process.env.NODE_ENV || 'development',
    },
    // 时间戳格式
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
});
/**
 * 创建子 logger（用于添加上下文信息）
 */
function createChildLogger(bindings) {
    return exports.logger.child(bindings);
}
//# sourceMappingURL=logger.js.map