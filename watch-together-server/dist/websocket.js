"use strict";
/**
 * Watch Together - WebSocket 服务器模块
 *
 * 提供 WebSocket 服务器，实现连接管理和基础消息处理
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWebSocketServer = createWebSocketServer;
exports.closeWebSocketServer = closeWebSocketServer;
exports.getRoomConnections = getRoomConnections;
exports.broadcastToRoom = broadcastToRoom;
exports.sendToUser = sendToUser;
const ws_1 = require("ws");
const url_1 = require("url");
const db_1 = require("./db");
const redis_1 = require("./redis");
/**
 * WebSocket 服务器实例
 */
let wss = null;
/**
 * 活动连接映射（roomId -> userId -> WebSocket）
 */
const connections = new Map();
/**
 * IP 地址到连接数的映射（用于连接数限制）
 */
const ipConnectionCount = new Map();
/**
 * 心跳配置
 */
const HEARTBEAT_CONFIG = {
    pingInterval: 30000, // 每 30 秒发送一次 ping
    timeoutDuration: 5 * 60 * 1000, // 5 分钟无响应则断开
    maxConnectionsPerIp: 10, // 每个 IP 最多 10 个连接
};
/**
 * 验证房间 ID 格式
 *
 * @param roomId 房间 ID
 * @returns 是否为有效格式
 */
function isValidRoomIdFormat(roomId) {
    // 格式：room-{8位随机字符串}
    const roomIdPattern = /^room-[a-z0-9]{8}$/;
    return roomIdPattern.test(roomId);
}
/**
 * 验证用户 ID 格式
 *
 * @param userId 用户 ID
 * @returns 是否为有效格式
 */
function isValidUserIdFormat(userId) {
    // 格式：user-{8位随机字符串}
    const userIdPattern = /^user-[a-z0-9]{8}$/;
    return userIdPattern.test(userId);
}
/**
 * 验证房间是否存在且有效
 *
 * @param roomId 房间 ID
 * @returns Promise<boolean> 房间是否存在且有效
 */
async function validateRoom(roomId) {
    try {
        const prisma = (0, db_1.getPrismaClient)();
        const room = await prisma.room.findUnique({
            where: { id: roomId },
        });
        // 房间不存在或已删除
        if (!room || room.deletedAt !== null) {
            return false;
        }
        return true;
    }
    catch (error) {
        console.error('Error validating room:', error);
        return false;
    }
}
/**
 * 验证用户是否在房间中
 *
 * @param roomId 房间 ID
 * @param userId 用户 ID
 * @returns Promise<boolean> 用户是否在房间中
 */
async function validateUserInRoom(roomId, userId) {
    try {
        const prisma = (0, db_1.getPrismaClient)();
        const member = await prisma.roomMember.findFirst({
            where: {
                roomId: roomId,
                userId: userId,
                leftAt: null, // 未离开的成员
            },
        });
        return member !== null;
    }
    catch (error) {
        console.error('Error validating user in room:', error);
        return false;
    }
}
/**
 * 将连接信息存储到 Redis
 *
 * @param roomId 房间 ID
 * @param userId 用户 ID
 * @returns Promise<void>
 */
async function storeConnectionInRedis(roomId, userId) {
    try {
        const cache = (0, redis_1.getCacheService)();
        const key = `ws:room:${roomId}:connections`;
        await cache.sadd(key, userId);
        // 设置过期时间（24小时）
        await cache.expire(key, 24 * 60 * 60);
    }
    catch (error) {
        console.error('Error storing connection in Redis:', error);
        // Redis 错误不应该阻止连接，只记录日志
    }
}
/**
 * 从 Redis 移除连接信息
 *
 * @param roomId 房间 ID
 * @param userId 用户 ID
 * @returns Promise<void>
 */
async function removeConnectionFromRedis(roomId, userId) {
    try {
        const cache = (0, redis_1.getCacheService)();
        const key = `ws:room:${roomId}:connections`;
        await cache.srem(key, userId);
    }
    catch (error) {
        console.error('Error removing connection from Redis:', error);
        // Redis 错误不应该阻止清理，只记录日志
    }
}
/**
 * 获取客户端 IP 地址
 *
 * @param req HTTP 请求
 * @returns 客户端 IP 地址
 */
function getClientIp(req) {
    // 尝试从 X-Forwarded-For 获取（代理场景）
    const forwardedFor = req.headers?.['x-forwarded-for'];
    if (forwardedFor) {
        if (typeof forwardedFor === 'string') {
            return forwardedFor.split(',')[0].trim();
        }
        if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
            return forwardedFor[0].split(',')[0].trim();
        }
    }
    // 尝试从 X-Real-IP 获取
    const realIp = req.headers?.['x-real-ip'];
    if (realIp) {
        if (typeof realIp === 'string') {
            return realIp;
        }
        if (Array.isArray(realIp) && realIp.length > 0) {
            return realIp[0];
        }
    }
    // 从 socket 获取
    return req.socket?.remoteAddress || 'unknown';
}
/**
 * 检查 IP 连接数限制
 *
 * @param clientIp 客户端 IP 地址
 * @returns 是否允许连接
 */
function checkConnectionLimit(clientIp) {
    const currentCount = ipConnectionCount.get(clientIp) || 0;
    return currentCount < HEARTBEAT_CONFIG.maxConnectionsPerIp;
}
/**
 * 增加 IP 连接数
 *
 * @param clientIp 客户端 IP 地址
 */
function incrementIpConnectionCount(clientIp) {
    const currentCount = ipConnectionCount.get(clientIp) || 0;
    ipConnectionCount.set(clientIp, currentCount + 1);
}
/**
 * 减少 IP 连接数
 *
 * @param clientIp 客户端 IP 地址
 */
function decrementIpConnectionCount(clientIp) {
    const currentCount = ipConnectionCount.get(clientIp) || 0;
    if (currentCount <= 1) {
        ipConnectionCount.delete(clientIp);
    }
    else {
        ipConnectionCount.set(clientIp, currentCount - 1);
    }
}
/**
 * 更新成员最后活动时间
 *
 * @param roomId 房间 ID
 * @param userId 用户 ID
 * @returns Promise<void>
 */
async function updateMemberLastActiveAt(roomId, userId) {
    try {
        const prisma = (0, db_1.getPrismaClient)();
        await prisma.roomMember.updateMany({
            where: {
                roomId: roomId,
                userId: userId,
                leftAt: null, // 只更新未离开的成员
            },
            data: {
                lastActiveAt: new Date(),
            },
        });
    }
    catch (error) {
        console.error('Error updating member lastActiveAt:', error);
        // 错误不应该阻止断开连接，只记录日志
    }
}
/**
 * 启动心跳机制
 *
 * @param connection WebSocket 连接信息
 */
function startHeartbeat(connection) {
    const now = Date.now();
    connection.lastPongTime = now;
    // 定期发送 ping
    connection.pingInterval = setInterval(() => {
        if (connection.ws.readyState === ws_1.WebSocket.OPEN) {
            try {
                connection.ws.ping();
            }
            catch (error) {
                console.error('Error sending ping:', error);
            }
        }
    }, HEARTBEAT_CONFIG.pingInterval);
    // 检查超时
    connection.timeoutTimer = setInterval(() => {
        const timeSinceLastPong = Date.now() - connection.lastPongTime;
        if (timeSinceLastPong >= HEARTBEAT_CONFIG.timeoutDuration) {
            console.log(`Connection timeout: roomId=${connection.roomId}, userId=${connection.userId}`);
            // 超时，断开连接
            if (connection.ws.readyState === ws_1.WebSocket.OPEN) {
                connection.ws.close(1008, 'Connection timeout: no response for 5 minutes');
            }
        }
    }, 10000); // 每 10 秒检查一次
}
/**
 * 清理心跳机制
 *
 * @param connection WebSocket 连接信息
 */
function stopHeartbeat(connection) {
    if (connection.pingInterval) {
        clearInterval(connection.pingInterval);
        connection.pingInterval = undefined;
    }
    if (connection.timeoutTimer) {
        clearInterval(connection.timeoutTimer);
        connection.timeoutTimer = undefined;
    }
}
/**
 * 获取房间状态（从数据库和 Redis）
 *
 * @param roomId 房间 ID
 * @returns Promise<RoomState> 房间状态
 */
async function getRoomState(roomId) {
    try {
        const prisma = (0, db_1.getPrismaClient)();
        // 获取房间信息（包含当前 URL）
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            select: {
                currentUrl: true,
            },
        });
        if (!room) {
            throw new Error('Room not found');
        }
        // 获取成员列表（只包含未离开的成员）
        const members = await prisma.roomMember.findMany({
            where: {
                roomId: roomId,
                leftAt: null, // 未离开的成员
            },
            orderBy: {
                joinedAt: 'asc', // 按加入时间升序
            },
            select: {
                userId: true,
                nickname: true,
                isHost: true,
                joinedAt: true,
            },
        });
        // 获取最近消息（最多 50 条，按时间倒序）
        const messages = await prisma.message.findMany({
            where: {
                roomId: roomId,
            },
            orderBy: {
                createdAt: 'desc', // 最新的在前
            },
            take: 50, // 最多 50 条
            select: {
                id: true,
                userId: true,
                nickname: true,
                content: true,
                createdAt: true,
            },
        });
        // 格式化状态数据
        const state = {
            currentUrl: room.currentUrl,
            members: members.map(member => ({
                userId: member.userId,
                nickname: member.nickname,
                isHost: member.isHost,
                joinedAt: member.joinedAt.toISOString(),
            })),
            recentMessages: messages
                .reverse() // 反转回时间正序（最旧的在前）
                .map(msg => ({
                id: msg.id,
                userId: msg.userId,
                nickname: msg.nickname,
                content: msg.content,
                timestamp: msg.createdAt.toISOString(),
            })),
        };
        return state;
    }
    catch (error) {
        console.error('Error getting room state:', error);
        // 返回空状态而不是抛出错误
        return {
            currentUrl: null,
            members: [],
            recentMessages: [],
        };
    }
}
/**
 * 发送 SYNC_STATE 消息
 *
 * @param ws WebSocket 连接
 * @param roomId 房间 ID
 */
async function sendSyncState(ws, roomId) {
    try {
        const state = await getRoomState(roomId);
        const message = {
            type: 'SYNC_STATE',
            data: state,
            timestamp: new Date().toISOString(),
        };
        ws.send(JSON.stringify(message));
    }
    catch (error) {
        console.error('Error sending SYNC_STATE:', error);
        // 发送错误消息
        ws.send(JSON.stringify({
            type: 'ERROR',
            error: 'Failed to get room state',
            timestamp: new Date().toISOString(),
        }));
    }
}
/**
 * 广播 MEMBER_JOINED 消息给房间内其他成员
 *
 * @param roomId 房间 ID
 * @param userId 新加入的用户 ID
 */
async function broadcastMemberJoined(roomId, userId) {
    try {
        // 从数据库获取用户信息
        const prisma = (0, db_1.getPrismaClient)();
        const member = await prisma.roomMember.findFirst({
            where: {
                roomId: roomId,
                userId: userId,
                leftAt: null,
            },
            select: {
                userId: true,
                nickname: true,
                isHost: true,
                joinedAt: true,
            },
        });
        if (!member) {
            console.warn(`Member ${userId} not found in room ${roomId}`);
            return;
        }
        // 构建 MEMBER_JOINED 消息
        const message = {
            type: 'MEMBER_JOINED',
            data: {
                userId: member.userId,
                nickname: member.nickname,
                isHost: member.isHost,
                joinedAt: member.joinedAt.toISOString(),
            },
            timestamp: new Date().toISOString(),
        };
        // 广播给房间内其他成员（不包括发送者）
        const roomConnections = connections.get(roomId);
        if (roomConnections) {
            const messageStr = JSON.stringify(message);
            roomConnections.forEach((connection, connectionUserId) => {
                // 只发送给其他成员
                if (connectionUserId !== userId && connection.ws.readyState === ws_1.WebSocket.OPEN) {
                    connection.ws.send(messageStr);
                }
            });
        }
    }
    catch (error) {
        console.error('Error broadcasting MEMBER_JOINED:', error);
    }
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
/**
 * 验证聊天消息格式
 *
 * @param message 消息对象
 * @returns 验证错误信息，如果通过则返回 null
 */
function validateChatMessage(message) {
    // 验证必需字段
    if (!message.userId || typeof message.userId !== 'string') {
        return 'userId is required and must be a string';
    }
    if (!message.nickname || typeof message.nickname !== 'string') {
        return 'nickname is required and must be a string';
    }
    if (!message.content || typeof message.content !== 'string') {
        return 'content is required and must be a string';
    }
    // 验证内容长度（最大 1000 字符）
    if (message.content.length > 1000) {
        return 'content must not exceed 1000 characters';
    }
    // 验证内容不能为空
    if (message.content.trim().length === 0) {
        return 'content must not be empty';
    }
    // 验证昵称长度（最大 50 字符）
    if (message.nickname.length > 50) {
        return 'nickname must not exceed 50 characters';
    }
    return null;
}
/**
 * 验证 URL 格式
 * @param url - 要验证的 URL
 * @returns 是否为有效的 HTTP/HTTPS URL
 */
function isValidUrl(url) {
    try {
        const urlObj = new url_1.URL(url);
        // 只允许 http 和 https 协议
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    }
    catch {
        return false;
    }
}
/**
 * 验证 URL_CHANGE 消息格式
 *
 * @param message 消息对象
 * @returns 验证错误信息，如果通过则返回 null
 */
function validateUrlChangeMessage(message) {
    // 验证必需字段
    if (!message.userId || typeof message.userId !== 'string') {
        return 'userId is required and must be a string';
    }
    if (!message.url || typeof message.url !== 'string') {
        return 'url is required and must be a string';
    }
    // 验证 URL 格式
    const trimmedUrl = message.url.trim();
    if (trimmedUrl.length === 0) {
        return 'url must not be empty';
    }
    if (!isValidUrl(trimmedUrl)) {
        return 'url must be a valid HTTP or HTTPS URL';
    }
    return null;
}
/**
 * 处理 URL_CHANGE 消息
 *
 * @param ws WebSocket 连接
 * @param message 消息对象
 * @param roomId 房间 ID
 * @param userId 用户 ID
 */
async function handleUrlChange(ws, message, roomId, userId) {
    try {
        // 验证消息格式
        const validationError = validateUrlChangeMessage(message);
        if (validationError) {
            ws.send(JSON.stringify({
                type: 'ERROR',
                error: validationError,
                timestamp: new Date().toISOString(),
            }));
            return;
        }
        // 验证 userId 是否匹配连接的用户 ID
        if (message.userId !== userId) {
            ws.send(JSON.stringify({
                type: 'ERROR',
                error: 'userId does not match the connection userId',
                timestamp: new Date().toISOString(),
            }));
            return;
        }
        // 验证用户是否在房间中
        const userInRoom = await validateUserInRoom(roomId, userId);
        if (!userInRoom) {
            ws.send(JSON.stringify({
                type: 'ERROR',
                error: 'User not in room',
                timestamp: new Date().toISOString(),
            }));
            return;
        }
        const prisma = (0, db_1.getPrismaClient)();
        // 获取当前房间信息
        const room = await prisma.room.findUnique({
            where: { id: roomId },
        });
        if (!room) {
            ws.send(JSON.stringify({
                type: 'ERROR',
                error: 'Room not found',
                timestamp: new Date().toISOString(),
            }));
            return;
        }
        // 获取用户信息（用于 changedBy 字段）
        const member = await prisma.roomMember.findFirst({
            where: {
                roomId: roomId,
                userId: userId,
                leftAt: null,
            },
            select: {
                nickname: true,
            },
        });
        if (!member) {
            ws.send(JSON.stringify({
                type: 'ERROR',
                error: 'Member not found',
                timestamp: new Date().toISOString(),
            }));
            return;
        }
        const trimmedUrl = message.url.trim();
        const oldUrl = room.currentUrl;
        // 更新房间 URL
        await prisma.room.update({
            where: {
                id: roomId,
            },
            data: {
                currentUrl: trimmedUrl,
            },
        });
        // 记录 URL 变更事件到 RoomEvent 表
        await prisma.roomEvent.create({
            data: {
                roomId: roomId,
                eventType: 'URL_CHANGED',
                userId: userId,
                eventData: {
                    oldUrl: oldUrl,
                    newUrl: trimmedUrl,
                },
            },
        });
        // 构建 URL_CHANGED 广播消息
        const broadcastMessage = {
            type: 'URL_CHANGED',
            data: {
                url: trimmedUrl,
                changedBy: {
                    userId: userId,
                    nickname: member.nickname,
                },
            },
            timestamp: new Date().toISOString(),
        };
        // 广播给房间内所有成员（包括发送者）
        broadcastToRoom(roomId, broadcastMessage);
    }
    catch (error) {
        console.error('Error handling URL_CHANGE:', error);
        ws.send(JSON.stringify({
            type: 'ERROR',
            error: 'Failed to process URL change',
            timestamp: new Date().toISOString(),
        }));
    }
}
/**
 * 处理 CHAT_MESSAGE 消息
 *
 * @param ws WebSocket 连接
 * @param message 消息对象
 * @param roomId 房间 ID
 * @param userId 用户 ID
 */
async function handleChatMessage(ws, message, roomId, userId) {
    try {
        // 验证消息格式
        const validationError = validateChatMessage(message);
        if (validationError) {
            ws.send(JSON.stringify({
                type: 'ERROR',
                error: validationError,
                timestamp: new Date().toISOString(),
            }));
            return;
        }
        // 验证 userId 是否匹配连接的用户 ID
        if (message.userId !== userId) {
            ws.send(JSON.stringify({
                type: 'ERROR',
                error: 'userId does not match the connection userId',
                timestamp: new Date().toISOString(),
            }));
            return;
        }
        // 验证用户是否在房间中
        const userInRoom = await validateUserInRoom(roomId, userId);
        if (!userInRoom) {
            ws.send(JSON.stringify({
                type: 'ERROR',
                error: 'User not in room',
                timestamp: new Date().toISOString(),
            }));
            return;
        }
        // 从数据库获取用户信息（确保昵称一致）
        const prisma = (0, db_1.getPrismaClient)();
        const member = await prisma.roomMember.findFirst({
            where: {
                roomId: roomId,
                userId: userId,
                leftAt: null,
            },
            select: {
                nickname: true,
            },
        });
        if (!member) {
            ws.send(JSON.stringify({
                type: 'ERROR',
                error: 'Member not found',
                timestamp: new Date().toISOString(),
            }));
            return;
        }
        // 使用数据库中的昵称（确保一致性）
        const actualNickname = member.nickname;
        // 生成消息 ID
        const messageId = generateMessageId();
        // 保存消息到数据库
        const savedMessage = await prisma.message.create({
            data: {
                id: messageId,
                roomId: roomId,
                userId: userId,
                nickname: actualNickname,
                content: message.content.trim(),
            },
        });
        // 构建广播消息
        const broadcastMessage = {
            type: 'CHAT_MESSAGE',
            data: {
                id: savedMessage.id,
                userId: savedMessage.userId,
                nickname: savedMessage.nickname,
                content: savedMessage.content,
                timestamp: savedMessage.createdAt.toISOString(),
            },
            timestamp: new Date().toISOString(),
        };
        // 广播给房间内所有成员（包括发送者）
        broadcastToRoom(roomId, broadcastMessage);
    }
    catch (error) {
        console.error('Error handling CHAT_MESSAGE:', error);
        ws.send(JSON.stringify({
            type: 'ERROR',
            error: 'Failed to process chat message',
            timestamp: new Date().toISOString(),
        }));
    }
}
/**
 * 广播 MEMBER_LEFT 消息给房间内其他成员
 *
 * @param roomId 房间 ID
 * @param userId 离开的用户 ID
 */
async function broadcastMemberLeft(roomId, userId) {
    try {
        // 从数据库获取用户信息（可能已经离开，所以不检查 leftAt）
        const prisma = (0, db_1.getPrismaClient)();
        const member = await prisma.roomMember.findFirst({
            where: {
                roomId: roomId,
                userId: userId,
            },
            select: {
                userId: true,
                nickname: true,
                isHost: true,
            },
        });
        if (!member) {
            console.warn(`Member ${userId} not found in room ${roomId}`);
            return;
        }
        // 构建 MEMBER_LEFT 消息
        const message = {
            type: 'MEMBER_LEFT',
            data: {
                userId: member.userId,
                nickname: member.nickname,
                isHost: member.isHost,
            },
            timestamp: new Date().toISOString(),
        };
        // 广播给房间内其他成员（不包括发送者）
        const roomConnections = connections.get(roomId);
        if (roomConnections) {
            const messageStr = JSON.stringify(message);
            roomConnections.forEach((connection, connectionUserId) => {
                // 只发送给其他成员
                if (connectionUserId !== userId && connection.ws.readyState === ws_1.WebSocket.OPEN) {
                    connection.ws.send(messageStr);
                }
            });
        }
    }
    catch (error) {
        console.error('Error broadcasting MEMBER_LEFT:', error);
    }
}
/**
 * 处理 WebSocket 连接
 *
 * @param ws WebSocket 连接
 * @param req HTTP 请求
 */
async function handleConnection(ws, req) {
    try {
        // 解析 URL 参数
        const url = new url_1.URL(req.url || '', 'http://localhost');
        const roomId = url.searchParams.get('roomId');
        const userId = url.searchParams.get('userId');
        // 验证参数是否存在
        if (!roomId || !userId) {
            ws.close(1008, 'Missing required parameters: roomId and userId are required');
            return;
        }
        // 验证参数格式
        if (!isValidRoomIdFormat(roomId)) {
            ws.close(1008, 'Invalid roomId format');
            return;
        }
        if (!isValidUserIdFormat(userId)) {
            ws.close(1008, 'Invalid userId format');
            return;
        }
        // 获取客户端 IP
        const clientIp = getClientIp(req);
        // 检查连接数限制
        if (!checkConnectionLimit(clientIp)) {
            ws.close(1008, `Connection limit exceeded: maximum ${HEARTBEAT_CONFIG.maxConnectionsPerIp} connections per IP`);
            return;
        }
        // 验证房间是否存在
        const roomExists = await validateRoom(roomId);
        if (!roomExists) {
            ws.close(1008, 'Room not found or deleted');
            return;
        }
        // 验证用户是否在房间中
        const userInRoom = await validateUserInRoom(roomId, userId);
        if (!userInRoom) {
            ws.close(1008, 'User not in room');
            return;
        }
        // 创建连接信息
        const connection = {
            ws,
            roomId,
            userId,
            lastPongTime: Date.now(),
            clientIp,
        };
        // 增加 IP 连接数
        incrementIpConnectionCount(clientIp);
        // 检查是否已有其他成员在房间中（用于判断是否需要广播 MEMBER_JOINED）
        const hadOtherMembers = connections.has(roomId) && connections.get(roomId).size > 0;
        // 存储连接
        if (!connections.has(roomId)) {
            connections.set(roomId, new Map());
        }
        connections.get(roomId).set(userId, connection);
        // 存储到 Redis
        await storeConnectionInRedis(roomId, userId);
        // 启动心跳机制
        startHeartbeat(connection);
        console.log(`WebSocket connected: roomId=${roomId}, userId=${userId}, ip=${clientIp}`);
        // 如果有其他成员在房间中，广播 MEMBER_JOINED 消息
        if (hadOtherMembers) {
            await broadcastMemberJoined(roomId, userId);
        }
        // 处理 pong 消息（心跳响应）
        ws.on('pong', () => {
            connection.lastPongTime = Date.now();
            // 更新成员最后活动时间
            updateMemberLastActiveAt(roomId, userId).catch(error => {
                console.error('Error updating lastActiveAt on pong:', error);
            });
        });
        // 处理消息
        ws.on('message', async (data) => {
            // 更新最后活动时间（收到任何消息都表示连接活跃）
            connection.lastPongTime = Date.now();
            try {
                const message = JSON.parse(data.toString());
                console.log(`Received message from ${userId} in ${roomId}:`, message);
                // 处理 SYNC_REQUEST 消息
                if (message.type === 'SYNC_REQUEST') {
                    await sendSyncState(ws, roomId);
                    return;
                }
                // 处理 CHAT_MESSAGE 消息
                if (message.type === 'CHAT_MESSAGE') {
                    await handleChatMessage(ws, message, roomId, userId);
                    return;
                }
                // 处理 URL_CHANGE 消息
                if (message.type === 'URL_CHANGE') {
                    await handleUrlChange(ws, message, roomId, userId);
                    return;
                }
                // 未知消息类型
                ws.send(JSON.stringify({
                    type: 'ERROR',
                    error: `Unknown message type: ${message.type}`,
                    timestamp: new Date().toISOString(),
                }));
            }
            catch (error) {
                console.error('Error parsing message:', error);
                ws.send(JSON.stringify({
                    type: 'ERROR',
                    error: 'Invalid message format',
                    timestamp: new Date().toISOString(),
                }));
            }
        });
        // 处理连接关闭
        ws.on('close', async () => {
            console.log(`WebSocket disconnected: roomId=${roomId}, userId=${userId}`);
            // 停止心跳机制
            stopHeartbeat(connection);
            // 减少 IP 连接数
            if (connection.clientIp) {
                decrementIpConnectionCount(connection.clientIp);
            }
            // 更新成员最后活动时间
            await updateMemberLastActiveAt(roomId, userId);
            // 检查是否还有其他成员在房间中（用于判断是否需要广播 MEMBER_LEFT）
            const roomConnections = connections.get(roomId);
            const hasOtherMembers = roomConnections && roomConnections.size > 1;
            // 从内存中移除连接
            if (roomConnections) {
                roomConnections.delete(userId);
                if (roomConnections.size === 0) {
                    connections.delete(roomId);
                }
            }
            // 从 Redis 移除连接
            await removeConnectionFromRedis(roomId, userId);
            // 如果还有其他成员在房间中，广播 MEMBER_LEFT 消息
            if (hasOtherMembers) {
                await broadcastMemberLeft(roomId, userId);
            }
        });
        // 处理错误
        ws.on('error', error => {
            console.error(`WebSocket error for ${userId} in ${roomId}:`, error);
        });
        // 发送连接成功消息
        ws.send(JSON.stringify({
            type: 'CONNECTED',
            data: {
                roomId,
                userId,
            },
            timestamp: new Date().toISOString(),
        }));
        // 连接建立时自动发送 SYNC_STATE 消息
        await sendSyncState(ws, roomId);
    }
    catch (error) {
        console.error('Error handling WebSocket connection:', error);
        ws.close(1011, 'Internal server error');
    }
}
/**
 * 创建并启动 WebSocket 服务器
 *
 * @param server HTTP 服务器实例
 * @returns WebSocket 服务器实例
 */
function createWebSocketServer(server) {
    if (wss) {
        return wss;
    }
    wss = new ws_1.WebSocketServer({
        server,
        path: '/ws',
    });
    wss.on('connection', (ws, req) => {
        handleConnection(ws, req).catch(error => {
            console.error('Error in handleConnection:', error);
            ws.close(1011, 'Internal server error');
        });
    });
    wss.on('error', error => {
        console.error('WebSocket server error:', error);
    });
    console.log('WebSocket server started on /ws');
    return wss;
}
/**
 * 关闭 WebSocket 服务器
 *
 * @returns Promise<void>
 */
async function closeWebSocketServer() {
    if (wss) {
        return new Promise((resolve, reject) => {
            wss.close(error => {
                if (error) {
                    console.error('Error closing WebSocket server:', error);
                    reject(error);
                }
                else {
                    console.log('WebSocket server closed');
                    wss = null;
                    connections.clear();
                    resolve();
                }
            });
        });
    }
}
/**
 * 获取指定房间的所有连接
 *
 * @param roomId 房间 ID
 * @returns WebSocket 连接数组
 */
function getRoomConnections(roomId) {
    const roomConnections = connections.get(roomId);
    if (!roomConnections) {
        return [];
    }
    return Array.from(roomConnections.values());
}
/**
 * 向指定房间的所有连接广播消息
 *
 * @param roomId 房间 ID
 * @param message 消息对象
 */
function broadcastToRoom(roomId, message) {
    const roomConnections = connections.get(roomId);
    if (!roomConnections) {
        return;
    }
    const messageStr = JSON.stringify(message);
    roomConnections.forEach(connection => {
        if (connection.ws.readyState === ws_1.WebSocket.OPEN) {
            connection.ws.send(messageStr);
        }
    });
}
/**
 * 向指定用户发送消息
 *
 * @param roomId 房间 ID
 * @param userId 用户 ID
 * @param message 消息对象
 * @returns 是否发送成功
 */
function sendToUser(roomId, userId, message) {
    const roomConnections = connections.get(roomId);
    if (!roomConnections) {
        return false;
    }
    const connection = roomConnections.get(userId);
    if (!connection || connection.ws.readyState !== ws_1.WebSocket.OPEN) {
        return false;
    }
    connection.ws.send(JSON.stringify(message));
    return true;
}
//# sourceMappingURL=websocket.js.map