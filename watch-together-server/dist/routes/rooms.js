"use strict";
/**
 * Watch Together - 房间管理路由
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
/**
 * 生成唯一的房间 ID
 * 格式：room-{随机字符串}
 *
 * @returns 房间 ID
 */
function generateRoomId() {
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
function generateUserId() {
    // 生成 8 位随机字符串（小写字母和数字）
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';
    for (let i = 0; i < 8; i++) {
        randomString += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `user-${randomString}`;
}
router.post('/', async (req, res) => {
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
        const prisma = (0, db_1.getPrismaClient)();
        // 生成房间 ID 和房主 ID
        const roomId = generateRoomId();
        const hostId = generateUserId();
        const roomName = (name && typeof name === 'string' ? name.trim() : '') || '未命名房间';
        const inviteLink = `/room/${roomId}`;
        // 创建房间和房主成员记录（使用事务确保数据一致性）
        const result = await prisma.$transaction(async (tx) => {
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
    }
    catch (error) {
        console.error('Error creating room:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to create room',
        });
    }
});
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
router.get('/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;
        // 验证 roomId 格式
        if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'roomId is required and must be a non-empty string',
            });
        }
        const prisma = (0, db_1.getPrismaClient)();
        // 查询房间信息（包含成员列表，排除已删除的房间）
        const room = await prisma.room.findFirst({
            where: {
                id: roomId.trim(),
                deletedAt: null, // 排除已删除的房间
            },
            include: {
                members: {
                    where: {
                        leftAt: null, // 只包含未离开的成员
                    },
                    orderBy: {
                        joinedAt: 'asc',
                    },
                },
            },
        });
        // 如果房间不存在或已删除，返回 404
        if (!room) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Room not found',
            });
        }
        // 格式化成员列表
        const members = room.members.map(member => ({
            userId: member.userId,
            nickname: member.nickname,
            isHost: member.isHost,
            joinedAt: member.joinedAt.toISOString(),
            lastActiveAt: member.lastActiveAt.toISOString(),
        }));
        // 返回成功响应
        return res.status(200).json({
            success: true,
            data: {
                id: room.id,
                name: room.name,
                hostId: room.hostId,
                currentUrl: room.currentUrl,
                inviteLink: room.inviteLink,
                createdAt: room.createdAt.toISOString(),
                updatedAt: room.updatedAt.toISOString(),
                members: members,
                memberCount: members.length,
            },
        });
    }
    catch (error) {
        console.error('Error getting room:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to get room',
        });
    }
});
router.put('/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;
        const { name } = req.body;
        // 验证 roomId 格式
        if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'roomId is required and must be a non-empty string',
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
        const prisma = (0, db_1.getPrismaClient)();
        // 检查房间是否存在且未删除
        const existingRoom = await prisma.room.findFirst({
            where: {
                id: roomId.trim(),
                deletedAt: null,
            },
        });
        if (!existingRoom) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Room not found',
            });
        }
        // 准备更新数据
        const updateData = {};
        if (name !== undefined && name !== null) {
            updateData.name = typeof name === 'string' ? name.trim() || '未命名房间' : '未命名房间';
        }
        // 如果没有提供任何更新字段，返回错误
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'At least one field must be provided for update',
            });
        }
        // 更新房间信息
        const updatedRoom = await prisma.room.update({
            where: {
                id: roomId.trim(),
            },
            data: updateData,
        });
        // 返回成功响应
        return res.status(200).json({
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
    }
    catch (error) {
        console.error('Error updating room:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to update room',
        });
    }
});
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
router.delete('/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;
        // 验证 roomId 格式
        if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'roomId is required and must be a non-empty string',
            });
        }
        const prisma = (0, db_1.getPrismaClient)();
        // 检查房间是否存在且未删除
        const existingRoom = await prisma.room.findFirst({
            where: {
                id: roomId.trim(),
                deletedAt: null,
            },
        });
        if (!existingRoom) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Room not found',
            });
        }
        // 软删除房间（设置 deletedAt）
        await prisma.room.update({
            where: {
                id: roomId.trim(),
            },
            data: {
                deletedAt: new Date(),
            },
        });
        // 返回成功响应
        return res.status(200).json({
            success: true,
            message: 'Room deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting room:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to delete room',
        });
    }
});
exports.default = router;
//# sourceMappingURL=rooms.js.map