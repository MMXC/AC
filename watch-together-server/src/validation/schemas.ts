/**
 * Watch Together - 输入验证 Schemas
 * 使用 Zod 定义所有 API 端点的输入验证规则
 */

import { z } from 'zod';

/**
 * 房间 ID 验证（格式：room-{8位随机字符串}）
 */
export const roomIdSchema = z
  .string()
  .min(1, 'roomId is required')
  .regex(/^room-[a-z0-9]{8}$/, 'roomId must be in format: room-{8 characters}');

/**
 * 用户 ID 验证（格式：user-{8位随机字符串}）
 */
export const userIdSchema = z
  .string()
  .min(1, 'userId is required')
  .regex(/^user-[a-z0-9]{8}$/, 'userId must be in format: user-{8 characters}');

/**
 * 消息 ID 验证（格式：msg-{8位随机字符串}）
 */
export const messageIdSchema = z
  .string()
  .min(1, 'messageId is required')
  .regex(/^msg-[a-z0-9]{8}$/, 'messageId must be in format: msg-{8 characters}');

/**
 * 昵称验证（1-100 字符）
 */
export const nicknameSchema = z
  .string()
  .min(1, 'nickname is required and must be a non-empty string')
  .max(100, 'nickname must be a string with maximum 100 characters')
  .trim();

/**
 * 房间名称验证（可选，最大 255 字符）
 */
export const roomNameSchema = z
  .string()
  .max(255, 'name must be a string with maximum 255 characters')
  .trim()
  .optional();

/**
 * 消息内容验证（1-1000 字符）
 */
export const messageContentSchema = z
  .string()
  .min(1, 'content is required and must be a non-empty string')
  .max(1000, 'content must be a string with maximum 1000 characters')
  .trim();

/**
 * URL 验证（必须是有效的 HTTP/HTTPS URL）
 */
export const urlSchema = z
  .string()
  .min(1, 'url is required and must be a non-empty string')
  .url('url must be a valid HTTP or HTTPS URL')
  .refine(
    url => {
      try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
      } catch {
        return false;
      }
    },
    {
      message: 'url must be a valid HTTP or HTTPS URL',
    }
  );

/**
 * 分页 limit 验证（1-100）
 */
export const limitSchema = z
  .number()
  .int('limit must be an integer')
  .min(1, 'limit must be a positive integer')
  .max(100, 'limit must be at most 100')
  .optional()
  .default(50);

/**
 * 分页 offset 验证（非负整数）
 */
export const offsetSchema = z
  .number()
  .int('offset must be an integer')
  .min(0, 'offset must be a non-negative integer')
  .optional()
  .default(0);

// ==================== 请求体 Schemas ====================

/**
 * POST /api/v1/rooms - 创建房间
 */
export const createRoomSchema = z.object({
  // 房间名称（可选）
  name: roomNameSchema,
  // 房主昵称（可选，如果为空或未提供，使用默认值“房主”）
  hostNickname: z
    .string()
    .trim()
    .max(100, 'nickname must be a string with maximum 100 characters')
    .optional()
    .transform(val => (val && val.length > 0 ? val : '房主')),
  // 初始共享 URL（必填，必须是有效的 HTTP/HTTPS URL）
  url: urlSchema,
});

/**
 * PUT /api/v1/rooms/:roomId - 更新房间
 */
export const updateRoomSchema = z.object({
  name: roomNameSchema,
});

/**
 * POST /api/v1/rooms/:roomId/join - 加入房间
 */
export const joinRoomSchema = z.object({
  nickname: nicknameSchema,
});

/**
 * POST /api/v1/rooms/:roomId/leave - 离开房间
 */
export const leaveRoomSchema = z.object({
  userId: userIdSchema,
});

/**
 * POST /api/v1/rooms/:roomId/messages - 发送消息
 */
export const sendMessageSchema = z.object({
  userId: userIdSchema,
  content: messageContentSchema,
});

/**
 * PUT /api/v1/rooms/:roomId/url - 更新房间 URL
 */
export const updateRoomUrlSchema = z.object({
  url: urlSchema,
  userId: userIdSchema,
});

/**
 * POST /api/v1/rooms/:roomId/operation-source - 设置/取消操作来源成员
 */
export const setOperationSourceSchema = z.object({
  userId: userIdSchema, // 调用者的 userId（用于验证是否为房主）
  operationSourceUserId: userIdSchema.nullable().optional(), // 要设置为操作来源的成员 userId，null 表示取消
});

// ==================== 查询参数 Schemas ====================

/**
 * GET /api/v1/rooms/:roomId/messages - 获取消息历史（查询参数）
 */
export const getMessagesQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : undefined))
    .pipe(limitSchema),
  offset: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : undefined))
    .pipe(offsetSchema),
});

// ==================== 路径参数 Schemas ====================

/**
 * 路径参数：roomId
 */
export const roomIdParamSchema = z.object({
  roomId: roomIdSchema,
});
