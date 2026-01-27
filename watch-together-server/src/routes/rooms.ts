/**
 * Watch Together - 房间管理路由
 */

import { Router, Request, Response } from 'express';
import { getPrismaClient } from '../db';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { createHttpError, ErrorCode } from '../middleware/errorHandler';
import {
  createRoomSchema,
  updateRoomSchema,
  joinRoomSchema,
  leaveRoomSchema,
  sendMessageSchema,
  updateRoomUrlSchema,
  getMessagesQuerySchema,
  roomIdParamSchema,
} from '../validation/schemas';
import { getRoomCacheService, RoomCacheData } from '../services/roomCache';
import { broadcastToRoom } from '../websocket';

const router = Router();

/**
 * 生成唯一的房间 ID
 * 格式：room-{随机字符串}
 *
 * @returns 房间 ID
 */
function generateRoomId(): string {
  // 生成 8 位随机字符串（小写字母和数字）
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';
  for (let i = 0; i < 8; i++) {
    randomString += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `room-${randomString}`;
}

/**
 * 生成唯一的用户 ID
 * 格式：user-{随机字符串}
 *
 * @returns 用户 ID
 */
function generateUserId(): string {
  // 生成 8 位随机字符串（小写字母和数字）
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';
  for (let i = 0; i < 8; i++) {
    randomString += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `user-${randomString}`;
}

/**
 * 生成唯一的消息 ID
 * 格式：msg-{随机字符串}
 *
 * @returns 消息 ID
 */
function generateMessageId(): string {
  // 生成 8 位随机字符串（小写字母和数字）
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';
  for (let i = 0; i < 8; i++) {
    randomString += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `msg-${randomString}`;
}

/**
 * POST /api/v1/rooms
 * 创建房间
 *
 * 请求体：
 * {
 *   name?: string,           // 房间名称（可选，默认为"未命名房间"）
 *   hostNickname: string    // 房主昵称（必填）
 * }
 *
 * 响应：
 * {
 *   success: true,
 *   data: {
 *     id: string,           // 房间 ID
 *     name: string,         // 房间名称
 *     hostId: string,       // 房主 ID
 *     hostNickname: string, // 房主昵称
 *     createdAt: string,     // 创建时间（ISO 字符串）
 *     inviteLink: string    // 邀请链接
 *   }
 * }
 */

router.post(
  '/',
  validateBody(createRoomSchema),
  async (req: Request, res: Response, next): Promise<void> => {
    try {
      const { name, hostNickname, url } = req.body as {
        name?: string;
        hostNickname?: string;
        url: string;
      };

      const prisma = getPrismaClient();

      // 生成房间 ID 和房主 ID
      const roomId = generateRoomId();
      const hostUserId = generateUserId();
      const roomName = name || '未命名房间';
      const hostNicknameValue = hostNickname || '房主'; // 确保有默认值
      const initialUrl = url;
      const inviteLink = `/room/${roomId}`;

      // 创建房间和房主成员记录（使用事务确保数据一致性）
      const result = await prisma.$transaction(async tx => {
        // 创建房间
        const room = await tx.room.create({
          data: {
            id: roomId,
            name: roomName,
            hostId: hostUserId,
            currentUrl: initialUrl,
            inviteLink: inviteLink,
          },
        });

        // 在测试环境下，使用特殊房间名称触发事务失败以验证回滚行为
        if (process.env.NODE_ENV === 'test' && room.name === '__TRANSACTION_TEST__') {
          throw new Error('Simulated transaction failure for testing');
        }

        // 创建房主成员记录
        await tx.roomMember.create({
          data: {
            roomId: roomId,
            userId: hostUserId,
            nickname: hostNicknameValue,
            isHost: true,
          },
        });

        return room;
      });

      // 返回成功响应
      res.status(201).json({
        success: true,
        data: {
          // 向后兼容的旧字段
          id: result.id,
          name: result.name,
          hostId: result.hostId,
          hostNickname: hostNicknameValue,
          createdAt: result.createdAt.toISOString(),
          // 新增字段，方便前端直接使用
          roomId: result.id,
          hostUserId: hostUserId,
          currentUrl: result.currentUrl,
          inviteLink: result.inviteLink,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/rooms/:roomId
 * 获取房间详细信息
 *
 * 路径参数：
 * - roomId: string - 房间 ID
 *
 * 响应（成功）：
 * {
 *   success: true,
 *   data: {
 *     id: string,              // 房间 ID
 *     name: string,            // 房间名称
 *     hostId: string,          // 房主 ID
 *     currentUrl: string | null, // 当前 URL
 *     inviteLink: string | null, // 邀请链接
 *     createdAt: string,        // 创建时间（ISO 字符串）
 *     updatedAt: string,        // 更新时间（ISO 字符串）
 *     members: Array<{          // 成员列表
 *       userId: string,
 *       nickname: string,
 *       isHost: boolean,
 *       joinedAt: string,
 *       lastActiveAt: string
 *     }>,
 *     memberCount: number       // 成员数量
 *   }
 * }
 *
 * 响应（失败）：
 * {
 *   success: false,
 *   error: "Not Found",
 *   message: "Room not found"
 * }
 */
router.get(
  '/:roomId',
  validateParams(roomIdParamSchema),
  async (req: Request, res: Response, next): Promise<void> => {
    try {
      const validatedParams = (req as Request & { validatedParams: { roomId: string } }).validatedParams;
      const roomId = validatedParams.roomId;

      // 使用缓存服务获取房间信息（优先从缓存，缓存未命中时从数据库加载）
      const roomCacheService = getRoomCacheService();
      let roomData: RoomCacheData | null;
      
      try {
        roomData = await roomCacheService.getRoomWithFallback(roomId);
      } catch (error) {
        // 如果缓存服务失败，记录错误并继续处理
        console.error('Error getting room data:', error);
        // 尝试直接从数据库查询
        const prisma = getPrismaClient();
        const room = await prisma.room.findFirst({
          where: {
            id: roomId,
            deletedAt: null,
          },
          include: {
            members: {
              where: {
                leftAt: null,
              },
              orderBy: {
                joinedAt: 'asc',
              },
            },
          },
        });
        
        if (!room) {
          throw createHttpError(404, ErrorCode.NOT_FOUND, 'Room not found');
        }
        
        // 格式化数据
        roomData = {
          id: room.id,
          name: room.name,
          hostId: room.hostId,
          currentUrl: room.currentUrl,
          inviteLink: room.inviteLink,
          createdAt: room.createdAt.toISOString(),
          updatedAt: room.updatedAt.toISOString(),
          members: room.members.map(member => ({
            userId: member.userId,
            nickname: member.nickname,
            isHost: member.isHost,
            joinedAt: member.joinedAt.toISOString(),
            lastActiveAt: member.lastActiveAt.toISOString(),
          })),
          memberCount: room.members.length,
        };
      }

      // 如果房间不存在或已删除，返回 404
      if (!roomData) {
        throw createHttpError(404, ErrorCode.NOT_FOUND, 'Room not found');
      }

      // 返回成功响应
      res.status(200).json({
        success: true,
        data: roomData,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/rooms/:roomId
 * 更新房间信息
 *
 * 路径参数：
 * - roomId: string - 房间 ID
 *
 * 请求体：
 * {
 *   name?: string  // 房间名称（可选）
 * }
 *
 * 响应（成功）：
 * {
 *   success: true,
 *   data: {
 *     id: string,
 *     name: string,
 *     hostId: string,
 *     currentUrl: string | null,
 *     inviteLink: string | null,
 *     createdAt: string,
 *     updatedAt: string
 *   }
 * }
 *
 * 响应（失败）：
 * {
 *   success: false,
 *   error: "Not Found",
 *   message: "Room not found"
 * }
 */

router.put(
  '/:roomId',
  validateParams(roomIdParamSchema),
  validateBody(updateRoomSchema),
  async (req: Request, res: Response, next): Promise<void> => {
    try {
      const validatedParams = (req as Request & { validatedParams: { roomId: string } }).validatedParams;
      const roomId = validatedParams.roomId;
      const { name } = req.body;

      const prisma = getPrismaClient();

      // 检查房间是否存在且未删除
      const existingRoom = await prisma.room.findFirst({
        where: {
          id: roomId,
          deletedAt: null,
        },
      });

      if (!existingRoom) {
        throw createHttpError(404, ErrorCode.NOT_FOUND, 'Room not found');
      }

      // 准备更新数据
      const updateData: { name?: string } = {};
      if (name !== undefined) {
        updateData.name = name || '未命名房间';
      }

      // 如果没有提供任何更新字段，返回错误
      if (Object.keys(updateData).length === 0) {
        throw createHttpError(400, ErrorCode.BAD_REQUEST, 'At least one field must be provided for update');
      }

      // 更新房间信息
      const updatedRoom = await prisma.room.update({
        where: {
          id: roomId,
        },
        data: updateData,
      });

      // 失效房间缓存
      const roomCacheService = getRoomCacheService();
      await roomCacheService.invalidateRoom(roomId);

      // 返回成功响应
      res.status(200).json({
        success: true,
        data: {
          id: updatedRoom.id,
          name: updatedRoom.name,
          hostId: updatedRoom.hostId,
          currentUrl: updatedRoom.currentUrl,
          inviteLink: updatedRoom.inviteLink,
          createdAt: updatedRoom.createdAt.toISOString(),
          updatedAt: updatedRoom.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/rooms/:roomId
 * 软删除房间（设置 deletedAt）
 *
 * 路径参数：
 * - roomId: string - 房间 ID
 *
 * 响应（成功）：
 * {
 *   success: true,
 *   message: "Room deleted successfully"
 * }
 *
 * 响应（失败）：
 * {
 *   success: false,
 *   error: "Not Found",
 *   message: "Room not found"
 * }
 */
router.delete(
  '/:roomId',
  validateParams(roomIdParamSchema),
  async (req: Request, res: Response, next): Promise<void> => {
    try {
      const validatedParams = (req as Request & { validatedParams: { roomId: string } }).validatedParams;
      const roomId = validatedParams.roomId;

      const prisma = getPrismaClient();

      // 检查房间是否存在且未删除
      const existingRoom = await prisma.room.findFirst({
        where: {
          id: roomId,
          deletedAt: null,
        },
      });

      if (!existingRoom) {
        throw createHttpError(404, ErrorCode.NOT_FOUND, 'Room not found');
      }

      // 软删除房间（设置 deletedAt）
      await prisma.room.update({
        where: {
          id: roomId,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      // 失效房间缓存
      const roomCacheService = getRoomCacheService();
      await roomCacheService.invalidateRoom(roomId);

      // 返回成功响应
      res.status(200).json({
        success: true,
        message: 'Room deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/rooms/:roomId/join
 * 加入房间
 *
 * 路径参数：
 * - roomId: string - 房间 ID
 *
 * 请求体：
 * {
 *   nickname: string  // 用户昵称（必填）
 * }
 *
 * 响应（成功）：
 * {
 *   success: true,
 *   data: {
 *     userId: string,        // 新创建的用户 ID
 *     roomId: string,        // 房间 ID
 *     nickname: string,      // 用户昵称
 *     room: {                // 房间信息
 *       id: string,
 *       name: string,
 *       hostId: string,
 *       currentUrl: string | null,
 *       inviteLink: string | null,
 *       createdAt: string,
 *       updatedAt: string
 *     },
 *     joinedAt: string        // 加入时间（ISO 字符串）
 *   }
 * }
 *
 * 响应（失败）：
 * {
 *   success: false,
 *   error: "Not Found",
 *   message: "Room not found"
 * }
 */

router.post(
  '/:roomId/join',
  validateParams(roomIdParamSchema),
  validateBody(joinRoomSchema),
  async (req: Request, res: Response, next): Promise<void> => {
    try {
      const validatedParams = (req as Request & { validatedParams: { roomId: string } }).validatedParams;
      const roomId = validatedParams.roomId;
      const { nickname } = req.body;

      const prisma = getPrismaClient();

      // 检查房间是否存在且未删除
      const room = await prisma.room.findFirst({
        where: {
          id: roomId,
          deletedAt: null,
        },
      });

      if (!room) {
        throw createHttpError(404, ErrorCode.NOT_FOUND, 'Room not found');
      }

      // 生成新的用户 ID
      const userId = generateUserId();

      // 检查房间是否已经有活跃成员
      const existingMembers = await prisma.roomMember.findMany({
        where: {
          roomId: roomId,
          leftAt: null, // 只查找未离开的成员
        },
      });

      // 检查房间的 hostId 是否已经有对应的活跃成员
      const existingHostMember = existingMembers.find(m => m.userId === room.hostId);

      // 判断用户是否是房主：
      // 1. 如果房间没有活跃成员，说明这是第一个通过 /join API 加入的用户，应该是房主
      // 2. 如果房间的 hostId 没有对应的活跃成员（房主离开了），第一个重新加入的用户应该是房主
      // 这符合需求："只有第一个加入的成员需要输入后跟随iframe url地址"
      const isHost = existingMembers.length === 0 || !existingHostMember;

      // 创建成员记录
      const member = await prisma.roomMember.create({
        data: {
          roomId: roomId,
          userId: userId,
          nickname: nickname,
          isHost: isHost,
        },
      });

      // 返回成功响应
      res.status(200).json({
        success: true,
        data: {
          userId: member.userId,
          roomId: member.roomId,
          nickname: member.nickname,
          isHost: isHost,
          room: {
            id: room.id,
            name: room.name,
            hostId: room.hostId,
            currentUrl: room.currentUrl,
            inviteLink: room.inviteLink,
            createdAt: room.createdAt.toISOString(),
            updatedAt: room.updatedAt.toISOString(),
          },
          joinedAt: member.joinedAt.toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/rooms/:roomId/leave
 * 离开房间
 *
 * 路径参数：
 * - roomId: string - 房间 ID
 *
 * 请求体：
 * {
 *   userId: string  // 用户 ID（必填）
 * }
 *
 * 响应（成功）：
 * {
 *   success: true,
 *   message: "Member left room successfully"
 * }
 *
 * 响应（失败）：
 * {
 *   success: false,
 *   error: "Not Found",
 *   message: "Room or member not found"
 * }
 */

router.post(
  '/:roomId/leave',
  validateParams(roomIdParamSchema),
  validateBody(leaveRoomSchema),
  async (req: Request, res: Response, next): Promise<void> => {
    try {
      const validatedParams = (req as Request & { validatedParams: { roomId: string } }).validatedParams;
      const roomId = validatedParams.roomId;
      const { userId } = req.body;

      const prisma = getPrismaClient();

      // 检查房间是否存在且未删除
      const room = await prisma.room.findFirst({
        where: {
          id: roomId,
          deletedAt: null,
        },
      });

      if (!room) {
        throw createHttpError(404, ErrorCode.NOT_FOUND, 'Room not found');
      }

      // 检查成员是否存在且未离开
      const member = await prisma.roomMember.findFirst({
        where: {
          roomId: roomId,
          userId: userId,
          leftAt: null, // 只查找未离开的成员
        },
      });

      if (!member) {
        throw createHttpError(404, ErrorCode.NOT_FOUND, 'Member not found or already left');
      }

      // 更新成员的 leftAt 字段
      await prisma.roomMember.update({
        where: {
          id: member.id,
        },
        data: {
          leftAt: new Date(),
        },
      });

      // 返回成功响应
      res.status(200).json({
        success: true,
        message: 'Member left room successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/rooms/:roomId/members
 * 获取房间成员列表
 *
 * 路径参数：
 * - roomId: string - 房间 ID
 *
 * 响应（成功）：
 * {
 *   success: true,
 *   data: {
 *     members: Array<{
 *       userId: string,
 *       nickname: string,
 *       isHost: boolean,
 *       joinedAt: string,
 *       lastActiveAt: string
 *     }>,
 *     memberCount: number
 *   }
 * }
 *
 * 响应（失败）：
 * {
 *   success: false,
 *   error: "Not Found",
 *   message: "Room not found"
 * }
 */
router.get(
  '/:roomId/members',
  validateParams(roomIdParamSchema),
  async (req: Request, res: Response, next): Promise<void> => {
    try {
      const validatedParams = (req as Request & { validatedParams: { roomId: string } }).validatedParams;
      const roomId = validatedParams.roomId;

      const prisma = getPrismaClient();

      // 检查房间是否存在且未删除
      const room = await prisma.room.findFirst({
        where: {
          id: roomId,
          deletedAt: null,
        },
      });

      if (!room) {
        throw createHttpError(404, ErrorCode.NOT_FOUND, 'Room not found');
      }

      // 查询未离开的成员列表，按加入时间排序
      const members = await prisma.roomMember.findMany({
        where: {
          roomId: roomId,
          leftAt: null, // 只返回未离开的成员
        },
        orderBy: {
          joinedAt: 'asc', // 按加入时间升序排序
        },
      });

      // 格式化成员列表
      const formattedMembers = members.map(member => ({
        userId: member.userId,
        nickname: member.nickname,
        isHost: member.isHost,
        joinedAt: member.joinedAt.toISOString(),
        lastActiveAt: member.lastActiveAt.toISOString(),
      }));

      // 返回成功响应
      res.status(200).json({
        success: true,
        data: {
          members: formattedMembers,
          memberCount: formattedMembers.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/rooms/:roomId/messages
 * 发送消息
 *
 * 路径参数：
 * - roomId: string - 房间 ID
 *
 * 请求体：
 * {
 *   userId: string,   // 用户 ID（必填）
 *   content: string   // 消息内容（必填，最大 1000 字符）
 * }
 *
 * 响应（成功）：
 * {
 *   success: true,
 *   data: {
 *     id: string,        // 消息 ID
 *     roomId: string,    // 房间 ID
 *     userId: string,    // 用户 ID
 *     nickname: string,  // 用户昵称
 *     content: string,  // 消息内容
 *     createdAt: string  // 创建时间（ISO 字符串）
 *   }
 * }
 *
 * 响应（失败）：
 * {
 *   success: false,
 *   error: "Not Found",
 *   message: "Room not found"
 * }
 */

router.post(
  '/:roomId/messages',
  validateParams(roomIdParamSchema),
  validateBody(sendMessageSchema),
  async (req: Request, res: Response, next): Promise<void> => {
    try {
      const validatedParams = (req as Request & { validatedParams: { roomId: string } }).validatedParams;
      const roomId = validatedParams.roomId;
      const { userId, content } = req.body;

      const prisma = getPrismaClient();

      // 检查房间是否存在且未删除
      const room = await prisma.room.findFirst({
        where: {
          id: roomId,
          deletedAt: null,
        },
      });

      if (!room) {
        throw createHttpError(404, ErrorCode.NOT_FOUND, 'Room not found');
      }

      // 检查用户是否存在且未离开
      const member = await prisma.roomMember.findFirst({
        where: {
          roomId: roomId,
          userId: userId,
          leftAt: null, // 只查找未离开的成员
        },
      });

      if (!member) {
        throw createHttpError(404, ErrorCode.NOT_FOUND, 'User not found in room or has left');
      }

      // 生成消息 ID
      const messageId = generateMessageId();

      // 创建消息记录
      const message = await prisma.message.create({
        data: {
          id: messageId,
          roomId: roomId,
          userId: userId,
          nickname: member.nickname,
          content: content,
        },
      });

      // 返回成功响应
      res.status(201).json({
        success: true,
        data: {
          id: message.id,
          roomId: message.roomId,
          userId: message.userId,
          nickname: message.nickname,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/rooms/:roomId/messages
 * 获取消息历史
 *
 * 路径参数：
 * - roomId: string - 房间 ID
 *
 * 查询参数：
 * - limit: number - 每页消息数量（可选，默认 50，最大 100）
 * - offset: number - 偏移量（可选，默认 0）
 *
 * 响应（成功）：
 * {
 *   success: true,
 *   data: {
 *     messages: [
 *       {
 *         id: string,        // 消息 ID
 *         roomId: string,    // 房间 ID
 *         userId: string,    // 用户 ID
 *         nickname: string,  // 用户昵称
 *         content: string,  // 消息内容
 *         createdAt: string  // 创建时间（ISO 字符串）
 *       }
 *     ],
 *     pagination: {
 *       total: number,      // 总消息数
 *       limit: number,     // 每页数量
 *       offset: number,    // 偏移量
 *       hasMore: boolean   // 是否有更多消息
 *     }
 *   }
 * }
 *
 * 响应（失败）：
 * {
 *   success: false,
 *   error: "Not Found",
 *   message: "Room not found"
 * }
 */
router.get(
  '/:roomId/messages',
  validateParams(roomIdParamSchema),
  validateQuery(getMessagesQuerySchema),
  async (req: Request, res: Response, next): Promise<void> => {
    try {
      const validatedParams = (req as Request & { validatedParams: { roomId: string } }).validatedParams;
      const roomId = validatedParams.roomId;
      const validatedQuery = (req as Request & { validatedQuery: { limit: number; offset: number } }).validatedQuery;
      const { limit, offset } = validatedQuery;

      const prisma = getPrismaClient();

      // 检查房间是否存在且未删除
      const room = await prisma.room.findFirst({
        where: {
          id: roomId,
          deletedAt: null,
        },
      });

      if (!room) {
        throw createHttpError(404, ErrorCode.NOT_FOUND, 'Room not found');
      }

      // 获取总消息数
      const total = await prisma.message.count({
        where: {
          roomId: roomId,
        },
      });

      // 获取消息列表（按时间倒序，最新的在前）
      const messages = await prisma.message.findMany({
        where: {
          roomId: roomId,
        },
        orderBy: {
          createdAt: 'desc', // 按创建时间倒序排列
        },
        take: limit,
        skip: offset,
      });

      // 格式化消息数据
      const formattedMessages = messages.map((message) => ({
        id: message.id,
        roomId: message.roomId,
        userId: message.userId,
        nickname: message.nickname,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      }));

      // 计算是否有更多消息
      const hasMore = offset + limit < total;

      // 返回成功响应
      res.status(200).json({
        success: true,
        data: {
          messages: formattedMessages,
          pagination: {
            total,
            limit,
            offset,
            hasMore,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/rooms/:roomId/url
 * 更新房间共享 URL
 *
 * 路径参数：
 * - roomId: string - 房间 ID
 *
 * 请求体：
 * {
 *   url: string,    // 新的 URL（必填，必须是有效的 HTTP/HTTPS URL）
 *   userId: string  // 用户 ID（必填，用于验证用户权限）
 * }
 *
 * 响应（成功）：
 * {
 *   success: true,
 *   data: {
 *     id: string,
 *     name: string,
 *     hostId: string,
 *     currentUrl: string,
 *     inviteLink: string | null,
 *     createdAt: string,
 *     updatedAt: string
 *   }
 * }
 *
 * 响应（失败）：
 * {
 *   success: false,
 *   error: "Not Found",
 *   message: "Room not found"
 * }
 */

router.put(
  '/:roomId/url',
  validateParams(roomIdParamSchema),
  validateBody(updateRoomUrlSchema),
  async (req: Request, res: Response, next): Promise<void> => {
    try {
      const validatedParams = (req as Request & { validatedParams: { roomId: string } }).validatedParams;
      const roomId = validatedParams.roomId;
      const { url, userId } = req.body;

      const prisma = getPrismaClient();

      // 检查房间是否存在且未删除
      const room = await prisma.room.findFirst({
        where: {
          id: roomId,
          deletedAt: null,
        },
      });

      if (!room) {
        throw createHttpError(404, ErrorCode.NOT_FOUND, 'Room not found');
      }

      // 检查用户是否存在且未离开（可选：验证用户权限）
      const member = await prisma.roomMember.findFirst({
        where: {
          roomId: roomId,
          userId: userId,
          leftAt: null, // 只查找未离开的成员
        },
      });

      if (!member) {
        throw createHttpError(404, ErrorCode.NOT_FOUND, 'User not found in room or has left');
      }

      // 更新房间 URL
      const updatedRoom = await prisma.room.update({
        where: {
          id: roomId,
        },
        data: {
          currentUrl: url,
        },
      });

      // 可选：记录 URL 变更事件到 RoomEvent 表
      await prisma.roomEvent.create({
        data: {
          roomId: roomId,
          eventType: 'URL_CHANGED',
          userId: userId,
          eventData: {
            oldUrl: room.currentUrl,
            newUrl: url,
          },
        },
      });

      // 失效房间缓存
      const roomCacheService = getRoomCacheService();
      await roomCacheService.invalidateRoom(roomId);

      // 通过 WebSocket 广播 URL 变更消息给房间内的所有成员
      const broadcastMessage = {
        type: 'URL_CHANGED',
        data: {
          url: url,
          userId: userId,
          timestamp: Date.now(),
        },
      };
      broadcastToRoom(roomId, broadcastMessage);

      // 返回成功响应
      res.status(200).json({
        success: true,
        data: {
          id: updatedRoom.id,
          name: updatedRoom.name,
          hostId: updatedRoom.hostId,
          currentUrl: updatedRoom.currentUrl,
          inviteLink: updatedRoom.inviteLink,
          createdAt: updatedRoom.createdAt.toISOString(),
          updatedAt: updatedRoom.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
