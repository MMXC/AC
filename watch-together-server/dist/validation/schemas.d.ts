/**
 * Watch Together - 输入验证 Schemas
 * 使用 Zod 定义所有 API 端点的输入验证规则
 */
import { z } from 'zod';
/**
 * 房间 ID 验证（格式：room-{8位随机字符串}）
 */
export declare const roomIdSchema: z.ZodString;
/**
 * 用户 ID 验证（格式：user-{8位随机字符串}）
 */
export declare const userIdSchema: z.ZodString;
/**
 * 消息 ID 验证（格式：msg-{8位随机字符串}）
 */
export declare const messageIdSchema: z.ZodString;
/**
 * 昵称验证（1-100 字符）
 */
export declare const nicknameSchema: z.ZodString;
/**
 * 房间名称验证（可选，最大 255 字符）
 */
export declare const roomNameSchema: z.ZodOptional<z.ZodString>;
/**
 * 消息内容验证（1-1000 字符）
 */
export declare const messageContentSchema: z.ZodString;
/**
 * URL 验证（必须是有效的 HTTP/HTTPS URL）
 */
export declare const urlSchema: z.ZodString;
/**
 * 分页 limit 验证（1-100）
 */
export declare const limitSchema: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
/**
 * 分页 offset 验证（非负整数）
 */
export declare const offsetSchema: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
/**
 * POST /api/v1/rooms - 创建房间
 */
export declare const createRoomSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    hostNickname: z.ZodString;
}, z.core.$strip>;
/**
 * PUT /api/v1/rooms/:roomId - 更新房间
 */
export declare const updateRoomSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * POST /api/v1/rooms/:roomId/join - 加入房间
 */
export declare const joinRoomSchema: z.ZodObject<{
    nickname: z.ZodString;
}, z.core.$strip>;
/**
 * POST /api/v1/rooms/:roomId/leave - 离开房间
 */
export declare const leaveRoomSchema: z.ZodObject<{
    userId: z.ZodString;
}, z.core.$strip>;
/**
 * POST /api/v1/rooms/:roomId/messages - 发送消息
 */
export declare const sendMessageSchema: z.ZodObject<{
    userId: z.ZodString;
    content: z.ZodString;
}, z.core.$strip>;
/**
 * PUT /api/v1/rooms/:roomId/url - 更新房间 URL
 */
export declare const updateRoomUrlSchema: z.ZodObject<{
    url: z.ZodString;
    userId: z.ZodString;
}, z.core.$strip>;
/**
 * GET /api/v1/rooms/:roomId/messages - 获取消息历史（查询参数）
 */
export declare const getMessagesQuerySchema: z.ZodObject<{
    limit: z.ZodPipe<z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<number | undefined, string | undefined>>, z.ZodDefault<z.ZodOptional<z.ZodNumber>>>;
    offset: z.ZodPipe<z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<number | undefined, string | undefined>>, z.ZodDefault<z.ZodOptional<z.ZodNumber>>>;
}, z.core.$strip>;
/**
 * 路径参数：roomId
 */
export declare const roomIdParamSchema: z.ZodObject<{
    roomId: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=schemas.d.ts.map