/**
 * Watch Together - 日志配置模块
 * 使用 Pino 实现结构化日志
 */

import pino from 'pino';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// 确保 logs 目录存在
const logsDir = join(process.cwd(), 'logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * 从环境变量获取日志级别，默认为 INFO
 */
function getLogLevel(): LogLevel {
  const level = process.env.LOG_LEVEL?.toLowerCase();
  if (level && Object.values(LogLevel).includes(level as LogLevel)) {
    return level as LogLevel;
  }
  return LogLevel.INFO;
}

/**
 * 创建 Pino logger 实例
 * - 开发环境：使用 pino-pretty 格式化输出到控制台
 * - 生产环境：输出 JSON 格式到文件和控制台
 */
export const logger = pino({
  level: getLogLevel(),
  transport:
    process.env.NODE_ENV === 'production'
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
        stream: pino.destination(join(logsDir, 'app.log')),
      },
      {
        level: 'error',
        stream: pino.destination(join(logsDir, 'error.log')),
      },
    ],
  }),
  // 基础字段
  base: {
    env: process.env.NODE_ENV || 'development',
  },
  // 时间戳格式
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * 创建子 logger（用于添加上下文信息）
 */
export function createChildLogger(bindings: Record<string, unknown>): pino.Logger {
  return logger.child(bindings);
}
