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

/**
 * WebSocket 连接信息
 */
interface WebSocketConnection {
  ws: WebSocket;
  roomId: string;
  userId: string;
}

/**
 * WebSocket 服务器实例
 */
let wss: WebSocketServer | null = null;

/**
 * 活动连接映射（roomId -> userId -> WebSocket）
 */
const connections = new Map<string, Map<string, WebSocketConnection>>();

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
async function storeConnectionInRedis(roomId: string, userId: string): Promise<void> {
  try {
    const cache = getCacheService();
    const key = `ws:room:${roomId}:connections`;
    await cache.sadd(key, userId);
    // 设置过期时间（24小时）
    await cache.expire(key, 24 * 60 * 60);
  } catch (error) {
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
async function removeConnectionFromRedis(roomId: string, userId: string): Promise<void> {
  try {
    const cache = getCacheService();
    const key = `ws:room:${roomId}:connections`;
    await cache.srem(key, userId);
  } catch (error) {
    console.error('Error removing connection from Redis:', error);
    // Redis 错误不应该阻止清理，只记录日志
  }
}

/**
 * 房间状态数据接口
 */
interface RoomState {
  currentUrl: string | null;
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
    const state: RoomState = {
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
  } catch (error) {
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
    console.error('Error sending SYNC_STATE:', error);
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
        if (connectionUserId !== userId && connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.send(messageStr);
        }
      });
    }
  } catch (error) {
    console.error('Error broadcasting MEMBER_JOINED:', error);
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
        if (connectionUserId !== userId && connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.send(messageStr);
        }
      });
    }
  } catch (error) {
    console.error('Error broadcasting MEMBER_LEFT:', error);
  }
}

/**
 * 处理 WebSocket 连接
 *
 * @param ws WebSocket 连接
 * @param req HTTP 请求
 */
async function handleConnection(ws: WebSocket, req: { url?: string }): Promise<void> {
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
    };

    // 检查是否已有其他成员在房间中（用于判断是否需要广播 MEMBER_JOINED）
    const hadOtherMembers = connections.has(roomId) && connections.get(roomId)!.size > 0;

    // 存储连接
    if (!connections.has(roomId)) {
      connections.set(roomId, new Map());
    }
    connections.get(roomId)!.set(userId, connection);

    // 存储到 Redis
    await storeConnectionInRedis(roomId, userId);

    console.log(`WebSocket connected: roomId=${roomId}, userId=${userId}`);

    // 如果有其他成员在房间中，广播 MEMBER_JOINED 消息
    if (hadOtherMembers) {
      await broadcastMemberJoined(roomId, userId);
    }

    // 处理消息
    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`Received message from ${userId} in ${roomId}:`, message);

        // 处理 SYNC_REQUEST 消息
        if (message.type === 'SYNC_REQUEST') {
          await sendSyncState(ws, roomId);
          return;
        }

        // 其他消息类型（后续任务会扩展）
      } catch (error) {
        console.error('Error parsing message:', error);
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
      console.log(`WebSocket disconnected: roomId=${roomId}, userId=${userId}`);

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
export async function closeWebSocketServer(): Promise<void> {
  if (wss) {
    return new Promise((resolve, reject) => {
      wss!.close(error => {
        if (error) {
          console.error('Error closing WebSocket server:', error);
          reject(error);
        } else {
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
