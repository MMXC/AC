/**
 * Watch Together - 日志配置模块
 * 使用 Pino 实现结构化日志
 */
import pino from 'pino';
/**
 * 日志级别枚举
 */
export declare enum LogLevel {
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error"
}
/**
 * 创建 Pino logger 实例
 * - 开发环境：使用 pino-pretty 格式化输出到控制台
 * - 生产环境：输出 JSON 格式到文件和控制台
 */
export declare const logger: pino.Logger<never, boolean>;
/**
 * 创建子 logger（用于添加上下文信息）
 */
export declare function createChildLogger(bindings: Record<string, unknown>): pino.Logger;
//# sourceMappingURL=logger.d.ts.map