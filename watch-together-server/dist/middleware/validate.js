"use strict";
/**
 * Watch Together - 输入验证中间件
 * 使用 Zod 验证请求数据
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = validateBody;
exports.validateQuery = validateQuery;
exports.validateParams = validateParams;
const zod_1 = require("zod");
/**
 * 验证请求体的中间件工厂函数
 */
function validateBody(schema) {
    return (req, _res, next) => {
        try {
            const validated = schema.parse(req.body);
            // 将验证后的数据存储回 req.body
            req.body = validated;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                // 让错误处理中间件处理
                next(error);
            }
            else {
                next(error);
            }
        }
    };
}
/**
 * 验证查询参数的中间件工厂函数
 */
function validateQuery(schema) {
    return (req, _res, next) => {
        try {
            const validated = schema.parse(req.query);
            // 将验证后的数据存储到 req.validatedQuery
            req.validatedQuery = validated;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                // 让错误处理中间件处理
                next(error);
            }
            else {
                next(error);
            }
        }
    };
}
/**
 * 验证路径参数的中间件工厂函数
 */
function validateParams(schema) {
    return (req, _res, next) => {
        try {
            // 确保 params 是对象，不是数组
            const params = typeof req.params === 'object' && !Array.isArray(req.params) ? req.params : {};
            const validated = schema.parse(params);
            // 将验证后的数据存储到 req.validatedParams，并更新 req.params
            req.validatedParams = validated;
            // 同时更新 req.params 以便后续使用
            Object.assign(req.params, validated);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                // 让错误处理中间件处理
                next(error);
            }
            else {
                next(error);
            }
        }
    };
}
//# sourceMappingURL=validate.js.map