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
/**
 * 生成唯一的消息 ID
 * 格式：msg-{随机字符串}
 *
 * @returns 消息 ID
 */
function generateMessageId() {
    // 生成 8 位随机字符串（小写字母和数字）
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';
    for (let i = 0; i < 8; i++) {
        randomString += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `msg-${randomString}`;
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
router.post('/:roomId/join', async (req, res) => {
    try {
        const { roomId } = req.params;
        const { nickname } = req.body;
        // 验证 roomId 格式
        if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'roomId is required and must be a non-empty string',
            });
        }
        // 验证必填字段
        if (!nickname || typeof nickname !== 'string' || nickname.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'nickname is required and must be a non-empty string',
            });
        }
        // 验证昵称长度
        if (nickname.trim().length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'nickname must be a string with maximum 100 characters',
            });
        }
        const prisma = (0, db_1.getPrismaClient)();
        // 检查房间是否存在且未删除
        const room = await prisma.room.findFirst({
            where: {
                id: roomId.trim(),
                deletedAt: null,
            },
        });
        if (!room) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Room not found',
            });
        }
        // 生成新的用户 ID
        const userId = generateUserId();
        // 创建成员记录
        const member = await prisma.roomMember.create({
            data: {
                roomId: roomId.trim(),
                userId: userId,
                nickname: nickname.trim(),
                isHost: false,
            },
        });
        // 返回成功响应
        return res.status(200).json({
            success: true,
            data: {
                userId: member.userId,
                roomId: member.roomId,
                nickname: member.nickname,
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
    }
    catch (error) {
        console.error('Error joining room:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to join room',
        });
    }
});
router.post('/:roomId/leave', async (req, res) => {
    try {
        const { roomId } = req.params;
        const { userId } = req.body;
        // 验证 roomId 格式
        if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'roomId is required and must be a non-empty string',
            });
        }
        // 验证必填字段
        if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'userId is required and must be a non-empty string',
            });
        }
        const prisma = (0, db_1.getPrismaClient)();
        // 检查房间是否存在且未删除
        const room = await prisma.room.findFirst({
            where: {
                id: roomId.trim(),
                deletedAt: null,
            },
        });
        if (!room) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Room not found',
            });
        }
        // 检查成员是否存在且未离开
        const member = await prisma.roomMember.findFirst({
            where: {
                roomId: roomId.trim(),
                userId: userId.trim(),
                leftAt: null, // 只查找未离开的成员
            },
        });
        if (!member) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Member not found or already left',
            });
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
        return res.status(200).json({
            success: true,
            message: 'Member left room successfully',
        });
    }
    catch (error) {
        console.error('Error leaving room:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to leave room',
        });
    }
});
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
router.get('/:roomId/members', async (req, res) => {
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
        const room = await prisma.room.findFirst({
            where: {
                id: roomId.trim(),
                deletedAt: null,
            },
        });
        if (!room) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Room not found',
            });
        }
        // 查询未离开的成员列表，按加入时间排序
        const members = await prisma.roomMember.findMany({
            where: {
                roomId: roomId.trim(),
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
        return res.status(200).json({
            success: true,
            data: {
                members: formattedMembers,
                memberCount: formattedMembers.length,
            },
        });
    }
    catch (error) {
        console.error('Error getting members:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to get members',
        });
    }
});
router.post('/:roomId/messages', async (req, res) => {
    try {
        const { roomId } = req.params;
        const { userId, content } = req.body;
        // 验证 roomId 格式
        if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'roomId is required and must be a non-empty string',
            });
        }
        // 验证必填字段
        if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'userId is required and must be a non-empty string',
            });
        }
        // 验证消息内容
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'content is required and must be a non-empty string',
            });
        }
        // 验证消息内容长度（最大 1000 字符）
        if (content.length > 1000) {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'content must be a string with maximum 1000 characters',
            });
        }
        const prisma = (0, db_1.getPrismaClient)();
        // 检查房间是否存在且未删除
        const room = await prisma.room.findFirst({
            where: {
                id: roomId.trim(),
                deletedAt: null,
            },
        });
        if (!room) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Room not found',
            });
        }
        // 检查用户是否存在且未离开
        const member = await prisma.roomMember.findFirst({
            where: {
                roomId: roomId.trim(),
                userId: userId.trim(),
                leftAt: null, // 只查找未离开的成员
            },
        });
        if (!member) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'User not found in room or has left',
            });
        }
        // 生成消息 ID
        const messageId = generateMessageId();
        // 创建消息记录
        const message = await prisma.message.create({
            data: {
                id: messageId,
                roomId: roomId.trim(),
                userId: userId.trim(),
                nickname: member.nickname,
                content: content.trim(),
            },
        });
        // 返回成功响应
        return res.status(201).json({
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
    }
    catch (error) {
        console.error('Error sending message:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to send message',
        });
    }
});
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
router.get('/:roomId/messages', async (req, res) => {
    try {
        const { roomId } = req.params;
        const { limit: limitParam, offset: offsetParam } = req.query;
        // 验证 roomId 格式
        if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'roomId is required and must be a non-empty string',
            });
        }
        // 解析 limit 参数（默认 50，最大 100）
        let limit = 50;
        if (limitParam !== undefined) {
            const parsedLimit = parseInt(limitParam, 10);
            if (isNaN(parsedLimit) || parsedLimit < 1) {
                return res.status(400).json({
                    success: false,
                    error: 'Bad Request',
                    message: 'limit must be a positive integer',
                });
            }
            limit = Math.min(parsedLimit, 100); // 最大值为 100
        }
        // 解析 offset 参数（默认 0）
        let offset = 0;
        if (offsetParam !== undefined) {
            const parsedOffset = parseInt(offsetParam, 10);
            if (isNaN(parsedOffset) || parsedOffset < 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Bad Request',
                    message: 'offset must be a non-negative integer',
                });
            }
            offset = parsedOffset;
        }
        const prisma = (0, db_1.getPrismaClient)();
        // 检查房间是否存在且未删除
        const room = await prisma.room.findFirst({
            where: {
                id: roomId.trim(),
                deletedAt: null,
            },
        });
        if (!room) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Room not found',
            });
        }
        // 获取总消息数
        const total = await prisma.message.count({
            where: {
                roomId: roomId.trim(),
            },
        });
        // 获取消息列表（按时间倒序，最新的在前）
        const messages = await prisma.message.findMany({
            where: {
                roomId: roomId.trim(),
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
        return res.status(200).json({
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
    }
    catch (error) {
        console.error('Error getting messages:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to get messages',
        });
    }
});
/**
 * 验证 URL 格式
 * @param url - 要验证的 URL
 * @returns 是否为有效的 HTTP/HTTPS URL
 */
function isValidUrl(url) {
    try {
        const urlObj = new URL(url);
        // 只允许 http 和 https 协议
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    }
    catch {
        return false;
    }
}
router.put('/:roomId/url', async (req, res) => {
    try {
        const { roomId } = req.params;
        const { url, userId } = req.body;
        // 验证 roomId 格式
        if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'roomId is required and must be a non-empty string',
            });
        }
        // 验证必填字段
        if (!url || typeof url !== 'string' || url.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'url is required and must be a non-empty string',
            });
        }
        if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'userId is required and must be a non-empty string',
            });
        }
        // 验证 URL 格式（必须是有效的 HTTP/HTTPS URL）
        const trimmedUrl = url.trim();
        if (!isValidUrl(trimmedUrl)) {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'url must be a valid HTTP or HTTPS URL',
            });
        }
        const prisma = (0, db_1.getPrismaClient)();
        // 检查房间是否存在且未删除
        const room = await prisma.room.findFirst({
            where: {
                id: roomId.trim(),
                deletedAt: null,
            },
        });
        if (!room) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Room not found',
            });
        }
        // 检查用户是否存在且未离开（可选：验证用户权限）
        const member = await prisma.roomMember.findFirst({
            where: {
                roomId: roomId.trim(),
                userId: userId.trim(),
                leftAt: null, // 只查找未离开的成员
            },
        });
        if (!member) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'User not found in room or has left',
            });
        }
        // 更新房间 URL
        const updatedRoom = await prisma.room.update({
            where: {
                id: roomId.trim(),
            },
            data: {
                currentUrl: trimmedUrl,
            },
        });
        // 可选：记录 URL 变更事件到 RoomEvent 表
        await prisma.roomEvent.create({
            data: {
                roomId: roomId.trim(),
                eventType: 'URL_CHANGED',
                userId: userId.trim(),
                eventData: {
                    oldUrl: room.currentUrl,
                    newUrl: trimmedUrl,
                },
            },
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
        console.error('Error updating room URL:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to update room URL',
        });
    }
});
exports.default = router;
//# sourceMappingURL=rooms.js.map