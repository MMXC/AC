/**
 * Watch Together - WebSocket 服务器模块
 *
 * 提供 WebSocket 服务器，实现连接管理和基础消息处理
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { URL } from 'url';
import { getPrismaClient } from './db';
import { getCacheService } from './redis';
import { createChildLogger } from './logger';

/**
 * WebSocket 连接信息
 */
interface WebSocketConnection {
  ws: WebSocket;
  roomId: string;
  userId: string;
  lastPongTime: number; // 最后一次收到 pong 的时间戳
  pingInterval?: NodeJS.Timeout; // ping 定时器
  timeoutTimer?: NodeJS.Timeout; // 超时定时器
  clientIp?: string; // 客户端 IP 地址
  connectionId: string; // 唯一连接 ID（用于 Redis 连接数限制）
}

/**
 * WebSocket 服务器实例
 */
let wss: WebSocketServer | null = null;

/**
 * WebSocket 专用 logger（添加上下文信息）
 */
const wsLogger = createChildLogger({ component: 'websocket' });

/**
 * 活动连接映射（roomId -> userId -> WebSocket）
 */
const connections = new Map<string, Map<string, WebSocketConnection>>();

/**
 * IP 地址到连接数的映射（用于连接数限制）
 * 注意：已迁移到 Redis，此 Map 仅作为降级方案
 */
const ipConnectionCount = new Map<string, number>();

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
function isValidRoomIdFormat(roomId: string): boolean {
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
function isValidUserIdFormat(userId: string): boolean {
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
async function validateRoom(roomId: string): Promise<boolean> {
  try {
    const prisma = getPrismaClient();
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    // 房间不存在或已删除
    if (!room || room.deletedAt !== null) {
      return false;
    }

    return true;
  } catch (error) {
    wsLogger.error({ err: error as Error }, 'Error validating room');
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
async function validateUserInRoom(roomId: string, userId: string): Promise<boolean> {
  try {
    const prisma = getPrismaClient();
    const member = await prisma.roomMember.findFirst({
      where: {
        roomId: roomId,
        userId: userId,
        leftAt: null, // 未离开的成员
      },
    });

    return member !== null;
  } catch (error) {
    wsLogger.error({ err: error as Error }, 'Error validating user in room');
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
async function storeConnectionInRedis(roomId: string, userId: string): Promise<void> {
  try {
    const cache = getCacheService();
    const key = `ws:room:${roomId}:connections`;
    await cache.sadd(key, userId);
    // 设置过期时间（24小时）
    await cache.expire(key, 24 * 60 * 60);
  } catch (error) {
    wsLogger.error({ err: error as Error, roomId, userId }, 'Error storing connection in Redis');
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
async function removeConnectionFromRedis(roomId: string, userId: string): Promise<void> {
  try {
    const cache = getCacheService();
    const key = `ws:room:${roomId}:connections`;
    await cache.srem(key, userId);
  } catch (error) {
    wsLogger.error({ err: error as Error, roomId, userId }, 'Error removing connection from Redis');
    // Redis 错误不应该阻止清理，只记录日志
  }
}

/**
 * 获取客户端 IP 地址
 *
 * @param req HTTP 请求
 * @returns 客户端 IP 地址
 */
function getClientIp(req: { headers?: { [key: string]: string | string[] | undefined }; socket?: { remoteAddress?: string } }): string {
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
 * 检查 IP 连接数限制（使用 Redis）
 *
 * @param clientIp 客户端 IP 地址
 * @returns Promise<boolean> 是否允许连接
 */
async function checkConnectionLimit(clientIp: string): Promise<boolean> {
  try {
    const cache = getCacheService();
    const key = `ws:ip:${clientIp}:connections`;
    
    // 获取当前连接数
    const currentCount = await cache.scard(key);
    
    // 检查是否超过限制
    return currentCount < HEARTBEAT_CONFIG.maxConnectionsPerIp;
  } catch (error) {
    // Redis 错误时，使用内存降级方案
    wsLogger.error({ err: error as Error, clientIp }, 'Error checking connection limit in Redis');
    const currentCount = ipConnectionCount.get(clientIp) || 0;
    return currentCount < HEARTBEAT_CONFIG.maxConnectionsPerIp;
  }
}

/**
 * 增加 IP 连接数（使用 Redis）
 *
 * @param clientIp 客户端 IP 地址
 * @param connectionId 连接 ID（用于唯一标识连接）
 * @returns Promise<void>
 */
async function incrementIpConnectionCount(clientIp: string, connectionId: string): Promise<void> {
  try {
    const cache = getCacheService();
    const key = `ws:ip:${clientIp}:connections`;
    
    // 添加到 Redis Set（连接 ID 作为成员）
    await cache.sadd(key, connectionId);
    // 设置过期时间（1小时，防止连接断开时未清理导致的内存泄漏）
    await cache.expire(key, 60 * 60);
  } catch (error) {
    // Redis 错误时，使用内存降级方案
    wsLogger.error({ err: error as Error, clientIp, connectionId }, 'Error incrementing connection count in Redis');
    const currentCount = ipConnectionCount.get(clientIp) || 0;
    ipConnectionCount.set(clientIp, currentCount + 1);
  }
}

/**
 * 减少 IP 连接数（使用 Redis）
 *
 * @param clientIp 客户端 IP 地址
 * @param connectionId 连接 ID（用于唯一标识连接）
 * @returns Promise<void>
 */
async function decrementIpConnectionCount(clientIp: string, connectionId: string): Promise<void> {
  try {
    const cache = getCacheService();
    const key = `ws:ip:${clientIp}:connections`;
    
    // 从 Redis Set 移除连接
    await cache.srem(key, connectionId);
    
    // 如果 Set 为空，删除键（可选，Redis 会自动过期）
    const count = await cache.scard(key);
    if (count === 0) {
      await cache.delete(key);
    }
  } catch (error) {
    // Redis 错误时，使用内存降级方案
    wsLogger.error({ err: error as Error, clientIp, connectionId }, 'Error decrementing connection count in Redis');
    const currentCount = ipConnectionCount.get(clientIp) || 0;
    if (currentCount <= 1) {
      ipConnectionCount.delete(clientIp);
    } else {
      ipConnectionCount.set(clientIp, currentCount - 1);
    }
  }
}

/**
 * 更新成员最后活动时间
 *
 * @param roomId 房间 ID
 * @param userId 用户 ID
 * @returns Promise<void>
 */
async function updateMemberLastActiveAt(roomId: string, userId: string): Promise<void> {
  try {
    const prisma = getPrismaClient();
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
  } catch (error) {
    wsLogger.error({ err: error as Error, roomId, userId }, 'Error updating member lastActiveAt');
    // 错误不应该阻止断开连接，只记录日志
  }
}

/**
 * 启动心跳机制
 *
 * @param connection WebSocket 连接信息
 */
function startHeartbeat(connection: WebSocketConnection): void {
  const now = Date.now();
  connection.lastPongTime = now;

  // 定期发送 ping
  connection.pingInterval = setInterval(() => {
    if (connection.ws.readyState === WebSocket.OPEN) {
      try {
        connection.ws.ping();
      } catch (error) {
        wsLogger.error({ err: error as Error, roomId: connection.roomId, userId: connection.userId }, 'Error sending ping');
      }
    }
  }, HEARTBEAT_CONFIG.pingInterval);

  // 检查超时
  connection.timeoutTimer = setInterval(() => {
    const timeSinceLastPong = Date.now() - connection.lastPongTime;
    if (timeSinceLastPong >= HEARTBEAT_CONFIG.timeoutDuration) {
      wsLogger.warn({ roomId: connection.roomId, userId: connection.userId, timeSinceLastPong }, 'Connection timeout');
      // 超时，断开连接
      if (connection.ws.readyState === WebSocket.OPEN) {
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
function stopHeartbeat(connection: WebSocketConnection): void {
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
 * 房间状态数据接口
 */
interface RoomState {
  currentUrl: string | null;
  operationSourceUserId: string | null;
  members: Array<{
    userId: string;
    nickname: string;
    isHost: boolean;
    joinedAt: string;
  }>;
  recentMessages: Array<{
    id: string;
    userId: string;
    nickname: string;
    content: string;
    timestamp: string;
  }>;
}

/**
 * 获取房间状态（从数据库和 Redis）
 *
 * @param roomId 房间 ID
 * @returns Promise<RoomState> 房间状态
 */
async function getRoomState(roomId: string): Promise<RoomState> {
  try {
    const prisma = getPrismaClient();

    // 获取房间信息（包含当前 URL 和操作来源）
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: {
        currentUrl: true,
        operationSourceUserId: true,
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
    const state: RoomState = {
      currentUrl: room.currentUrl,
      operationSourceUserId: room.operationSourceUserId,
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
  } catch (error) {
    wsLogger.error({ err: error as Error, roomId }, 'Error getting room state');
    // 返回空状态而不是抛出错误
    return {
      currentUrl: null,
      operationSourceUserId: null,
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
async function sendSyncState(ws: WebSocket, roomId: string): Promise<void> {
  try {
    const state = await getRoomState(roomId);

    const message = {
      type: 'SYNC_STATE',
      data: state,
      timestamp: new Date().toISOString(),
    };

    ws.send(JSON.stringify(message));
  } catch (error) {
    wsLogger.error({ err: error as Error, roomId }, 'Error sending SYNC_STATE');
    // 发送错误消息
    ws.send(
      JSON.stringify({
        type: 'ERROR',
        error: 'Failed to get room state',
        timestamp: new Date().toISOString(),
      })
    );
  }
}

/**
 * 广播 MEMBER_JOINED 消息给房间内其他成员
 *
 * @param roomId 房间 ID
 * @param userId 新加入的用户 ID
 */
async function broadcastMemberJoined(roomId: string, userId: string): Promise<void> {
  try {
    // 从数据库获取用户信息
    const prisma = getPrismaClient();
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
      wsLogger.warn({ roomId, userId }, 'Member not found in room (MEMBER_JOINED)');
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
        if (connectionUserId !== userId && connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.send(messageStr);
        }
      });
    }
  } catch (error) {
    wsLogger.error({ err: error as Error, roomId, userId }, 'Error broadcasting MEMBER_JOINED');
  }
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
 * CHAT_MESSAGE 消息请求接口
 */
interface ChatMessageRequest {
  type: 'CHAT_MESSAGE';
  userId: string;
  nickname: string;
  content: string;
}

/**
 * URL_CHANGE 消息请求接口
 */
interface UrlChangeRequest {
  type: 'URL_CHANGE';
  userId: string;
  url: string;
}

/**
 * WebRTC 信令消息类型
 * 与前端的 webrtc-signaling.js 中的常量保持语义一致
 */
type WebRTCSignalingType =
  | 'WEBRTC_OFFER'
  | 'WEBRTC_ANSWER'
  | 'WEBRTC_ICE_CANDIDATE'
  | 'WEBRTC_END'
  | 'WEBRTC_ERROR';

/**
 * WebRTC 信令基础消息接口
 */
interface BaseWebRTCSignalingMessage {
  type: WebRTCSignalingType;
  roomId: string;
  fromUserId: string;
  toUserId: string | null;
  timestamp: number | string;
  // 其他字段保持透明转发，不在服务器做强约束
  [key: string]: unknown;
}

/**
 * 判断是否为 WebRTC 信令消息类型
 */
function isWebRTCSignalingType(type: unknown): type is WebRTCSignalingType {
  return (
    type === 'WEBRTC_OFFER' ||
    type === 'WEBRTC_ANSWER' ||
    type === 'WEBRTC_ICE_CANDIDATE' ||
    type === 'WEBRTC_END' ||
    type === 'WEBRTC_ERROR'
  );
}

/**
 * OP_SOURCE_OPERATION 消息请求接口
 */
interface OpSourceOperationRequest {
  type: 'OP_SOURCE_OPERATION';
  userId: string;
  operation: {
    type: 'click' | 'drag' | 'scroll' | 'keydown' | 'keyup';
    x?: number;
    y?: number;
    deltaX?: number;
    deltaY?: number;
    key?: string;
    button?: number;
    timestamp: number;
  };
}

/**
 * WebRTC 信令消息基础接口
 * 这里只定义最小字段集，后续任务可以扩展
 */
type WebRTCSignalingTypeString =
  | 'WEBRTC_OFFER'
  | 'WEBRTC_ANSWER'
  | 'WEBRTC_ICE_CANDIDATE'
  | 'WEBRTC_END'
  | 'WEBRTC_ERROR';

interface WebRTCSignalingMessageBase {
  type: WebRTCSignalingTypeString;
  roomId?: string;
  fromUserId?: string;
  toUserId?: string | null;
  // 其他字段保持开放，方便后续任务扩展
  [key: string]: unknown;
}

/**
 * 处理 WebRTC 信令消息的权限与基础校验
 *
 * 当前任务只关心权限控制：
 * - 只有房主可以发送 WEBRTC_OFFER
 *
 * @param ws WebSocket 连接
 * @param message 消息对象
 * @param roomId 房间 ID
 * @param userId 用户 ID
 */
async function handleWebRTCSignalingMessage(
  ws: WebSocket,
  message: WebRTCSignalingMessageBase,
  roomId: string,
  userId: string
): Promise<void> {
  try {
    // 目前仅对 WEBRTC_OFFER 做强校验，其它类型留给后续任务扩展
    if (message.type !== 'WEBRTC_OFFER') {
      ws.send(
        JSON.stringify({
          type: 'WEBRTC_ERROR',
          errorMessage: `Unsupported WebRTC signaling type: ${message.type}`,
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    const prisma = getPrismaClient();

    // 获取房间信息以确定房主
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        hostId: true,
        deletedAt: true,
      },
    });

    if (!room || room.deletedAt !== null) {
      ws.send(
        JSON.stringify({
          type: 'WEBRTC_ERROR',
          errorMessage: 'Room not found or deleted',
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    // 非房主尝试发送 WEBRTC_OFFER：记录日志并拒绝
    if (room.hostId !== userId) {
      wsLogger.warn(
        { roomId, userId, hostId: room.hostId, signalingType: message.type },
        'Non-host user attempted to send WEBRTC_OFFER'
      );

      ws.send(
        JSON.stringify({
          type: 'WEBRTC_ERROR',
          errorMessage: 'Only host can send WEBRTC_OFFER',
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    // 房主发送的 WEBRTC_OFFER 在本任务中只做权限校验
    // 实际的信令转发逻辑由后续任务实现
    wsLogger.info(
      { roomId, userId, signalingType: message.type },
      'Accepted WEBRTC_OFFER from host (no routing implemented in this task)'
    );
  } catch (error) {
    wsLogger.error({ err: error as Error, roomId, userId }, 'Error handling WebRTC signaling message');
    ws.send(
      JSON.stringify({
        type: 'WEBRTC_ERROR',
        errorMessage: 'Internal server error while handling WebRTC signaling',
        timestamp: new Date().toISOString(),
      })
    );
  }
}

/**
 * 验证聊天消息格式
 *
 * @param message 消息对象
 * @returns 验证错误信息，如果通过则返回 null
 */
function validateChatMessage(message: any): string | null {
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
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    // 只允许 http 和 https 协议
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 验证 URL_CHANGE 消息格式
 *
 * @param message 消息对象
 * @returns 验证错误信息，如果通过则返回 null
 */
function validateUrlChangeMessage(message: any): string | null {
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
 * 验证 OP_SOURCE_OPERATION 消息格式
 *
 * @param message 消息对象
 * @returns 验证错误信息，如果通过则返回 null
 */
function validateOpSourceOperationMessage(message: any): string | null {
  // 验证必需字段
  if (!message.userId || typeof message.userId !== 'string') {
    return 'userId is required and must be a string';
  }

  if (!message.operation || typeof message.operation !== 'object') {
    return 'operation is required and must be an object';
  }

  const op = message.operation;

  // 验证操作类型
  const validOperationTypes = ['click', 'drag', 'scroll', 'keydown', 'keyup'];
  if (!op.type || !validOperationTypes.includes(op.type)) {
    return `operation.type must be one of: ${validOperationTypes.join(', ')}`;
  }

  // 验证时间戳
  if (!op.timestamp || typeof op.timestamp !== 'number') {
    return 'operation.timestamp is required and must be a number';
  }

  // 根据操作类型验证特定字段
  if (op.type === 'click' || op.type === 'drag') {
    if (typeof op.x !== 'number' || typeof op.y !== 'number') {
      return `operation.x and operation.y are required for ${op.type} operation`;
    }
  }

  if (op.type === 'scroll') {
    if (typeof op.deltaX !== 'number' || typeof op.deltaY !== 'number') {
      return 'operation.deltaX and operation.deltaY are required for scroll operation';
    }
  }

  if (op.type === 'keydown' || op.type === 'keyup') {
    if (!op.key || typeof op.key !== 'string') {
      return `operation.key is required for ${op.type} operation`;
    }
  }

  return null;
}

/**
 * 验证 WebRTC 信令消息的基础结构
 *
 * 服务器端只做最小校验，保持“透明路由”：
 * - 确保 roomId / fromUserId / toUserId 基本合法
 * - 确保连接上下文与消息中的 roomId / fromUserId 一致
 *
 * 其他业务字段交由前端和后续任务处理。
 */
function validateWebRTCSignalingMessageOnServer(
  message: any,
  roomId: string,
  userId: string
): string | null {
  if (!isWebRTCSignalingType(message.type)) {
    return 'Invalid WebRTC signaling message type';
  }

  if (!message.roomId || typeof message.roomId !== 'string') {
    return 'roomId is required and must be a string';
  }
  if (message.roomId !== roomId) {
    return 'roomId does not match the connection roomId';
  }

  if (!message.fromUserId || typeof message.fromUserId !== 'string') {
    return 'fromUserId is required and must be a string';
  }
  if (message.fromUserId !== userId) {
    return 'fromUserId does not match the connection userId';
  }

  if (message.toUserId !== null && typeof message.toUserId !== 'string') {
    return 'toUserId must be null or a string';
  }

  // timestamp 为 number 或 ISO 字符串都可以，缺失时后续会自动填充
  if (
    message.timestamp !== undefined &&
    typeof message.timestamp !== 'number' &&
    typeof message.timestamp !== 'string'
  ) {
    return 'timestamp must be a number or string when present';
  }

  return null;
}

/**
 * 处理 WebRTC 信令消息（透明路由）
 *
 * - 不解析 SDP / ICE 具体内容
 * - 只根据 roomId / fromUserId / toUserId 做路由
 */
async function handleWebRTCSignalingMessage(
  ws: WebSocket,
  rawMessage: any,
  roomId: string,
  userId: string
): Promise<void> {
  try {
    const validationError = validateWebRTCSignalingMessageOnServer(rawMessage, roomId, userId);
    if (validationError) {
      ws.send(
        JSON.stringify({
          type: 'ERROR',
          error: validationError,
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    const message: BaseWebRTCSignalingMessage = {
      ...rawMessage,
      roomId,
      fromUserId: userId,
      toUserId: rawMessage.toUserId ?? null,
      timestamp: rawMessage.timestamp ?? Date.now(),
    };

    // 如果指定了目标用户，则点对点发送；否则广播到房间（包括发送者）
    if (message.toUserId) {
      const sent = sendToUser(roomId, message.toUserId, message);
      if (!sent) {
        ws.send(
          JSON.stringify({
            type: 'ERROR',
            error: 'Target user is not connected',
            timestamp: new Date().toISOString(),
          })
        );
      }
    } else {
      broadcastToRoom(roomId, message);
    }
  } catch (error) {
    wsLogger.error({ err: error as Error, roomId, userId }, 'Error handling WebRTC signaling message');
    ws.send(
      JSON.stringify({
        type: 'ERROR',
        error: 'Failed to process WebRTC signaling message',
        timestamp: new Date().toISOString(),
      })
    );
  }
}

/**
 * 处理 OP_SOURCE_OPERATION 消息
 * 将操作来源成员的操作转发给房主
 *
 * @param ws WebSocket 连接
 * @param message 消息对象
 * @param roomId 房间 ID
 * @param userId 用户 ID（发送者）
 */
async function handleOpSourceOperation(
  ws: WebSocket,
  message: OpSourceOperationRequest,
  roomId: string,
  userId: string
): Promise<void> {
  try {
    // 验证消息格式
    const validationError = validateOpSourceOperationMessage(message);
    if (validationError) {
      ws.send(
        JSON.stringify({
          type: 'ERROR',
          error: validationError,
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    // 获取房间信息
    const prisma = getPrismaClient();
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        deletedAt: null,
      },
    });

    if (!room) {
      ws.send(
        JSON.stringify({
          type: 'ERROR',
          error: 'Room not found',
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    // 验证发送者是否为当前的操作来源成员
    if (room.operationSourceUserId !== userId) {
      ws.send(
        JSON.stringify({
          type: 'ERROR',
          error: 'You are not the operation source member',
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    // 获取房主连接
    const roomConnections = connections.get(roomId);
    if (!roomConnections) {
      wsLogger.warn({ roomId }, 'No connections found for room');
      return;
    }

    const hostConnection = roomConnections.get(room.hostId);
    if (!hostConnection || hostConnection.ws.readyState !== WebSocket.OPEN) {
      wsLogger.warn({ roomId, hostId: room.hostId }, 'Host connection not found or not open');
      return;
    }

    // 转发操作消息给房主
    hostConnection.ws.send(
      JSON.stringify({
        type: 'OP_SOURCE_OPERATION',
        data: {
          userId: userId,
          operation: message.operation,
          timestamp: Date.now(),
        },
      })
    );

    wsLogger.debug({ roomId, userId, operationType: message.operation.type }, 'Forwarded OP_SOURCE_OPERATION to host');
  } catch (error) {
    wsLogger.error({ err: error as Error, roomId, userId }, 'Error handling OP_SOURCE_OPERATION');
    ws.send(
      JSON.stringify({
        type: 'ERROR',
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      })
    );
  }
}

/**
 * 处理 URL_CHANGE 消息
 *
 * @param ws WebSocket 连接
 * @param message 消息对象
 * @param roomId 房间 ID
 * @param userId 用户 ID
 */
async function handleUrlChange(
  ws: WebSocket,
  message: UrlChangeRequest,
  roomId: string,
  userId: string
): Promise<void> {
  try {
    // 验证消息格式
    const validationError = validateUrlChangeMessage(message);
    if (validationError) {
      ws.send(
        JSON.stringify({
          type: 'ERROR',
          error: validationError,
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    // 验证 userId 是否匹配连接的用户 ID
    if (message.userId !== userId) {
      ws.send(
        JSON.stringify({
          type: 'ERROR',
          error: 'userId does not match the connection userId',
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    // 验证用户是否在房间中
    const userInRoom = await validateUserInRoom(roomId, userId);
    if (!userInRoom) {
      ws.send(
        JSON.stringify({
          type: 'ERROR',
          error: 'User not in room',
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    const prisma = getPrismaClient();

    // 获取当前房间信息
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      ws.send(
        JSON.stringify({
          type: 'ERROR',
          error: 'Room not found',
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    // 仅允许房主通过 WebSocket 修改 URL
    if (userId !== room.hostId) {
      ws.send(
        JSON.stringify({
          type: 'ERROR',
          error: 'Only host can change URL',
          timestamp: new Date().toISOString(),
        })
      );
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
      ws.send(
        JSON.stringify({
          type: 'ERROR',
          error: 'Member not found',
          timestamp: new Date().toISOString(),
        })
      );
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
  } catch (error) {
    wsLogger.error({ err: error as Error, roomId, userId }, 'Error handling URL_CHANGE');
    ws.send(
      JSON.stringify({
        type: 'ERROR',
        error: 'Failed to process URL change',
        timestamp: new Date().toISOString(),
      })
    );
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
async function handleChatMessage(
  ws: WebSocket,
  message: ChatMessageRequest,
  roomId: string,
  userId: string
): Promise<void> {
  try {
    // 验证消息格式
    const validationError = validateChatMessage(message);
    if (validationError) {
      ws.send(
        JSON.stringify({
          type: 'ERROR',
          error: validationError,
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    // 验证 userId 是否匹配连接的用户 ID
    if (message.userId !== userId) {
      ws.send(
        JSON.stringify({
          type: 'ERROR',
          error: 'userId does not match the connection userId',
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    // 验证用户是否在房间中
    const userInRoom = await validateUserInRoom(roomId, userId);
    if (!userInRoom) {
      ws.send(
        JSON.stringify({
          type: 'ERROR',
          error: 'User not in room',
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    // 从数据库获取用户信息（确保昵称一致）
    const prisma = getPrismaClient();
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
      ws.send(
        JSON.stringify({
          type: 'ERROR',
          error: 'Member not found',
          timestamp: new Date().toISOString(),
        })
      );
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
  } catch (error) {
    wsLogger.error({ err: error as Error, roomId, userId }, 'Error handling CHAT_MESSAGE');
    ws.send(
      JSON.stringify({
        type: 'ERROR',
        error: 'Failed to process chat message',
        timestamp: new Date().toISOString(),
      })
    );
  }
}

/**
 * 广播 MEMBER_LEFT 消息给房间内其他成员
 *
 * @param roomId 房间 ID
 * @param userId 离开的用户 ID
 */
async function broadcastMemberLeft(roomId: string, userId: string): Promise<void> {
  try {
    // 从数据库获取用户信息（可能已经离开，所以不检查 leftAt）
    const prisma = getPrismaClient();
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
      wsLogger.warn({ roomId, userId }, 'Member not found in room (MEMBER_LEFT)');
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
        if (connectionUserId !== userId && connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.send(messageStr);
        }
      });
    }
  } catch (error) {
    wsLogger.error({ err: error as Error, roomId, userId }, 'Error broadcasting MEMBER_LEFT');
  }
}

/**
 * 处理 WebSocket 连接
 *
 * @param ws WebSocket 连接
 * @param req HTTP 请求
 */
async function handleConnection(ws: WebSocket, req: { url?: string; headers?: { [key: string]: string | string[] | undefined }; socket?: { remoteAddress?: string } }): Promise<void> {
  try {
    // 解析 URL 参数
    const url = new URL(req.url || '', 'http://localhost');
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

    // 生成唯一连接 ID（用于 Redis 连接数限制）
    const connectionId = `${roomId}:${userId}:${Date.now()}:${Math.random().toString(36).substring(7)}`;

    // 检查连接数限制
    const canConnect = await checkConnectionLimit(clientIp);
    if (!canConnect) {
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
    const connection: WebSocketConnection = {
      ws,
      roomId,
      userId,
      lastPongTime: Date.now(),
      clientIp,
      connectionId,
    };

    // 增加 IP 连接数
    await incrementIpConnectionCount(clientIp, connectionId);

    // 检查是否已有其他成员在房间中（用于判断是否需要广播 MEMBER_JOINED）
    const hadOtherMembers = connections.has(roomId) && connections.get(roomId)!.size > 0;

    // 存储连接
    if (!connections.has(roomId)) {
      connections.set(roomId, new Map());
    }
    connections.get(roomId)!.set(userId, connection);

    // 存储到 Redis
    await storeConnectionInRedis(roomId, userId);

    // 启动心跳机制
    startHeartbeat(connection);

    wsLogger.info({ roomId, userId, ip: clientIp }, 'WebSocket connected');

    // 如果有其他成员在房间中，广播 MEMBER_JOINED 消息
    if (hadOtherMembers) {
      await broadcastMemberJoined(roomId, userId);
    }

    // 处理 pong 消息（心跳响应）
    ws.on('pong', () => {
      connection.lastPongTime = Date.now();
      // 更新成员最后活动时间
      updateMemberLastActiveAt(roomId, userId).catch(error => {
        wsLogger.error({ err: error as Error, roomId, userId }, 'Error updating lastActiveAt on pong');
      });
    });

    // 处理消息
    ws.on('message', async (data: Buffer) => {
      // 更新最后活动时间（收到任何消息都表示连接活跃）
      connection.lastPongTime = Date.now();
      try {
        const message = JSON.parse(data.toString());
        wsLogger.debug({ roomId, userId, messageType: message.type }, 'Received WebSocket message');

        // 处理 SYNC_REQUEST 消息
        if (message.type === 'SYNC_REQUEST') {
          await sendSyncState(ws, roomId);
          return;
        }

        // 处理 CHAT_MESSAGE 消息
        if (message.type === 'CHAT_MESSAGE') {
          await handleChatMessage(ws, message as ChatMessageRequest, roomId, userId);
          return;
        }

        // 处理 URL_CHANGE 消息
        if (message.type === 'URL_CHANGE') {
          await handleUrlChange(ws, message as UrlChangeRequest, roomId, userId);
          return;
        }

        // 处理 OP_SOURCE_OPERATION 消息
        if (message.type === 'OP_SOURCE_OPERATION') {
          await handleOpSourceOperation(ws, message as OpSourceOperationRequest, roomId, userId);
          return;
        }

        // 处理 WebRTC 信令消息（透明路由）
        if (isWebRTCSignalingType(message.type)) {
          await handleWebRTCSignalingMessage(ws, message, roomId, userId);
          return;
        }

        // 未知消息类型
        ws.send(
          JSON.stringify({
            type: 'ERROR',
            error: `Unknown message type: ${message.type}`,
            timestamp: new Date().toISOString(),
          })
        );
      } catch (error) {
        wsLogger.error({ err: error as Error, roomId, userId }, 'Error parsing WebSocket message');
        ws.send(
          JSON.stringify({
            type: 'ERROR',
            error: 'Invalid message format',
            timestamp: new Date().toISOString(),
          })
        );
      }
    });

    // 处理连接关闭
    ws.on('close', async () => {
      wsLogger.info({ roomId, userId }, 'WebSocket disconnected');

      // 停止心跳机制
      stopHeartbeat(connection);

      // 减少 IP 连接数
      if (connection.clientIp && connection.connectionId) {
        await decrementIpConnectionCount(connection.clientIp, connection.connectionId);
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
      wsLogger.error({ err: error as Error, roomId, userId }, 'WebSocket error');
    });

    // 发送连接成功消息
    ws.send(
      JSON.stringify({
        type: 'CONNECTED',
        data: {
          roomId,
          userId,
        },
        timestamp: new Date().toISOString(),
      })
    );

    // 连接建立时自动发送 SYNC_STATE 消息
    await sendSyncState(ws, roomId);
  } catch (error) {
    wsLogger.error({ err: error as Error }, 'Error handling WebSocket connection');
    ws.close(1011, 'Internal server error');
  }
}

/**
 * 创建并启动 WebSocket 服务器
 *
 * @param server HTTP 服务器实例
 * @returns WebSocket 服务器实例
 */
export function createWebSocketServer(server: Server): WebSocketServer {
  if (wss) {
    return wss;
  }

  wss = new WebSocketServer({
    server,
    path: '/ws',
  });

  wss.on('connection', (ws: WebSocket, req) => {
    handleConnection(ws, req).catch(error => {
      wsLogger.error({ err: error as Error }, 'Error in handleConnection');
      ws.close(1011, 'Internal server error');
    });
  });

  wss.on('error', error => {
    wsLogger.error({ err: error as Error }, 'WebSocket server error');
  });

  wsLogger.info({ path: '/ws' }, 'WebSocket server started');

  return wss;
}

/**
 * 关闭 WebSocket 服务器
 *
 * @returns Promise<void>
 */
export async function closeWebSocketServer(): Promise<void> {
  if (wss) {
    return new Promise((resolve, reject) => {
      wss!.close(error => {
        if (error) {
          wsLogger.error({ err: error as Error }, 'Error closing WebSocket server');
          reject(error);
        } else {
          wsLogger.info('WebSocket server closed');
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
export function getRoomConnections(roomId: string): WebSocketConnection[] {
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
export function broadcastToRoom(roomId: string, message: object): void {
  const roomConnections = connections.get(roomId);
  if (!roomConnections) {
    return;
  }

  const messageStr = JSON.stringify(message);
  roomConnections.forEach(connection => {
    if (connection.ws.readyState === WebSocket.OPEN) {
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
export function sendToUser(roomId: string, userId: string, message: object): boolean {
  const roomConnections = connections.get(roomId);
  if (!roomConnections) {
    return false;
  }

  const connection = roomConnections.get(userId);
  if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
    return false;
  }

  connection.ws.send(JSON.stringify(message));
  return true;
}
