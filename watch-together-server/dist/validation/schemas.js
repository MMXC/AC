"use strict";
/**
 * Watch Together - 输入验证 Schemas
 * 使用 Zod 定义所有 API 端点的输入验证规则
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomIdParamSchema = exports.getMessagesQuerySchema = exports.updateRoomUrlSchema = exports.sendMessageSchema = exports.leaveRoomSchema = exports.joinRoomSchema = exports.updateRoomSchema = exports.createRoomSchema = exports.offsetSchema = exports.limitSchema = exports.urlSchema = exports.messageContentSchema = exports.roomNameSchema = exports.nicknameSchema = exports.messageIdSchema = exports.userIdSchema = exports.roomIdSchema = void 0;
const zod_1 = require("zod");
/**
 * 房间 ID 验证（格式：room-{8位随机字符串}）
 */
exports.roomIdSchema = zod_1.z
    .string()
    .min(1, 'roomId is required')
    .regex(/^room-[a-z0-9]{8}$/, 'roomId must be in format: room-{8 characters}');
/**
 * 用户 ID 验证（格式：user-{8位随机字符串}）
 */
exports.userIdSchema = zod_1.z
    .string()
    .min(1, 'userId is required')
    .regex(/^user-[a-z0-9]{8}$/, 'userId must be in format: user-{8 characters}');
/**
 * 消息 ID 验证（格式：msg-{8位随机字符串}）
 */
exports.messageIdSchema = zod_1.z
    .string()
    .min(1, 'messageId is required')
    .regex(/^msg-[a-z0-9]{8}$/, 'messageId must be in format: msg-{8 characters}');
/**
 * 昵称验证（1-100 字符）
 */
exports.nicknameSchema = zod_1.z
    .string()
    .min(1, 'nickname is required and must be a non-empty string')
    .max(100, 'nickname must be a string with maximum 100 characters')
    .trim();
/**
 * 房间名称验证（可选，最大 255 字符）
 */
exports.roomNameSchema = zod_1.z
    .string()
    .max(255, 'name must be a string with maximum 255 characters')
    .trim()
    .optional();
/**
 * 消息内容验证（1-1000 字符）
 */
exports.messageContentSchema = zod_1.z
    .string()
    .min(1, 'content is required and must be a non-empty string')
    .max(1000, 'content must be a string with maximum 1000 characters')
    .trim();
/**
 * URL 验证（必须是有效的 HTTP/HTTPS URL）
 */
exports.urlSchema = zod_1.z
    .string()
    .min(1, 'url is required and must be a non-empty string')
    .url('url must be a valid HTTP or HTTPS URL')
    .refine(url => {
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    }
    catch {
        return false;
    }
}, {
    message: 'url must be a valid HTTP or HTTPS URL',
});
/**
 * 分页 limit 验证（1-100）
 */
exports.limitSchema = zod_1.z
    .number()
    .int('limit must be an integer')
    .min(1, 'limit must be a positive integer')
    .max(100, 'limit must be at most 100')
    .optional()
    .default(50);
/**
 * 分页 offset 验证（非负整数）
 */
exports.offsetSchema = zod_1.z
    .number()
    .int('offset must be an integer')
    .min(0, 'offset must be a non-negative integer')
    .optional()
    .default(0);
// ==================== 请求体 Schemas ====================
/**
 * POST /api/v1/rooms - 创建房间
 */
exports.createRoomSchema = zod_1.z.object({
    name: exports.roomNameSchema,
    hostNickname: exports.nicknameSchema,
});
/**
 * PUT /api/v1/rooms/:roomId - 更新房间
 */
exports.updateRoomSchema = zod_1.z.object({
    name: exports.roomNameSchema,
});
/**
 * POST /api/v1/rooms/:roomId/join - 加入房间
 */
exports.joinRoomSchema = zod_1.z.object({
    nickname: exports.nicknameSchema,
});
/**
 * POST /api/v1/rooms/:roomId/leave - 离开房间
 */
exports.leaveRoomSchema = zod_1.z.object({
    userId: exports.userIdSchema,
});
/**
 * POST /api/v1/rooms/:roomId/messages - 发送消息
 */
exports.sendMessageSchema = zod_1.z.object({
    userId: exports.userIdSchema,
    content: exports.messageContentSchema,
});
/**
 * PUT /api/v1/rooms/:roomId/url - 更新房间 URL
 */
exports.updateRoomUrlSchema = zod_1.z.object({
    url: exports.urlSchema,
    userId: exports.userIdSchema,
});
// ==================== 查询参数 Schemas ====================
/**
 * GET /api/v1/rooms/:roomId/messages - 获取消息历史（查询参数）
 */
exports.getMessagesQuerySchema = zod_1.z.object({
    limit: zod_1.z
        .string()
        .optional()
        .transform(val => (val ? parseInt(val, 10) : undefined))
        .pipe(exports.limitSchema),
    offset: zod_1.z
        .string()
        .optional()
        .transform(val => (val ? parseInt(val, 10) : undefined))
        .pipe(exports.offsetSchema),
});
// ==================== 路径参数 Schemas ====================
/**
 * 路径参数：roomId
 */
exports.roomIdParamSchema = zod_1.z.object({
    roomId: exports.roomIdSchema,
});
//# sourceMappingURL=schemas.js.map