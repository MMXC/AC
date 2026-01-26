/**
 * Watch Together - 房间管理路由
 */

import { Router, Request, Response } from 'express';
import { getPrismaClient } from '../db';

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
interface CreateRoomRequest {
  name?: string;
  hostNickname: string;
}

router.post('/', async (req: Request<Record<string, never>, unknown, CreateRoomRequest>, res: Response) => {
  try {
    const { name, hostNickname } = req.body;

    // 验证必填字段
    if (!hostNickname || typeof hostNickname !== 'string' || hostNickname.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'hostNickname is required and must be a non-empty string',
      });
    }

    // 验证房间名称（如果提供）
    if (name !== undefined && name !== null && (typeof name !== 'string' || name.length > 255)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'name must be a string with maximum 255 characters',
      });
    }

    const prisma = getPrismaClient();

    // 生成房间 ID 和房主 ID
    const roomId = generateRoomId();
    const hostId = generateUserId();
    const roomName = (name && typeof name === 'string' ? name.trim() : '') || '未命名房间';
    const inviteLink = `/room/${roomId}`;

    // 创建房间和房主成员记录（使用事务确保数据一致性）
    const result = await prisma.$transaction(async tx => {
      // 创建房间
      const room = await tx.room.create({
        data: {
          id: roomId,
          name: roomName,
          hostId: hostId,
          inviteLink: inviteLink,
        },
      });

      // 创建房主成员记录
      await tx.roomMember.create({
        data: {
          roomId: roomId,
          userId: hostId,
          nickname: hostNickname.trim(),
          isHost: true,
        },
      });

      return room;
    });

    // 返回成功响应
    return res.status(201).json({
      success: true,
      data: {
        id: result.id,
        name: result.name,
        hostId: result.hostId,
        hostNickname: hostNickname.trim(),
        createdAt: result.createdAt.toISOString(),
        inviteLink: result.inviteLink,
      },
    });
  } catch (error) {
    console.error('Error creating room:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to create room',
    });
  }
});

export default router;
