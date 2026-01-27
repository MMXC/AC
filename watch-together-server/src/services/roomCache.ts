/**
 * Watch Together - 房间缓存服务
 *
 * 提供房间信息的 Redis 缓存功能，减少数据库查询，提高性能
 */

import { getCacheService, CacheService } from '../redis';
import { getPrismaClient } from '../db';

/**
 * 房间缓存键前缀
 */
const ROOM_CACHE_KEY_PREFIX = 'room:';

/**
 * 缓存 TTL（秒）- 1 小时
 */
const ROOM_CACHE_TTL = 3600;

/**
 * 房间信息接口
 */
export interface RoomCacheData {
  id: string;
  name: string;
  hostId: string;
  currentUrl: string | null;
  inviteLink: string | null;
  createdAt: string;
  updatedAt: string;
  members: Array<{
    userId: string;
    nickname: string;
    isHost: boolean;
    joinedAt: string;
    lastActiveAt: string;
  }>;
  memberCount: number;
}

/**
 * 房间缓存服务类
 */
export class RoomCacheService {
  private cache: CacheService;

  constructor() {
    this.cache = getCacheService();
  }

  /**
   * 生成房间缓存键
   *
   * @param roomId 房间 ID
   * @returns 缓存键
   */
  private getCacheKey(roomId: string): string {
    return `${ROOM_CACHE_KEY_PREFIX}${roomId}`;
  }

  /**
   * 从缓存获取房间信息
   *
   * @param roomId 房间 ID
   * @returns 房间信息，如果缓存不存在返回 null
   */
  async getRoom(roomId: string): Promise<RoomCacheData | null> {
    const cacheKey = this.getCacheKey(roomId);
    const cached = await this.cache.getJSON<RoomCacheData>(cacheKey);
    return cached;
  }

  /**
   * 将房间信息写入缓存
   *
   * @param roomId 房间 ID
   * @param roomData 房间信息
   * @returns Promise<void>
   */
  async setRoom(roomId: string, roomData: RoomCacheData): Promise<void> {
    const cacheKey = this.getCacheKey(roomId);
    await this.cache.set(cacheKey, roomData, ROOM_CACHE_TTL);
  }

  /**
   * 从数据库加载房间信息并缓存
   *
   * @param roomId 房间 ID
   * @returns 房间信息，如果房间不存在返回 null
   */
  async loadRoomFromDatabase(roomId: string): Promise<RoomCacheData | null> {
    const prisma = getPrismaClient();

    // 查询房间信息（包含成员列表，排除已删除的房间）
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
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

    // 如果房间不存在或已删除，返回 null
    if (!room) {
      return null;
    }

    // 格式化成员列表
    const members = room.members.map(member => ({
      userId: member.userId,
      nickname: member.nickname,
      isHost: member.isHost,
      joinedAt: member.joinedAt.toISOString(),
      lastActiveAt: member.lastActiveAt.toISOString(),
    }));

    // 构建缓存数据
    const roomData: RoomCacheData = {
      id: room.id,
      name: room.name,
      hostId: room.hostId,
      currentUrl: room.currentUrl,
      inviteLink: room.inviteLink,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
      members: members,
      memberCount: members.length,
    };

    // 写入缓存
    await this.setRoom(roomId, roomData);

    return roomData;
  }

  /**
   * 获取房间信息（优先从缓存，缓存未命中时从数据库加载）
   *
   * @param roomId 房间 ID
   * @returns 房间信息，如果房间不存在返回 null
   */
  async getRoomWithFallback(roomId: string): Promise<RoomCacheData | null> {
    try {
      // 先尝试从缓存获取
      const cached = await this.getRoom(roomId);
      if (cached) {
        return cached;
      }

      // 缓存未命中，从数据库加载并缓存
      return await this.loadRoomFromDatabase(roomId);
    } catch (error) {
      // 如果缓存操作失败，尝试直接从数据库加载
      console.error('Error getting room from cache, falling back to database:', error);
      try {
        return await this.loadRoomFromDatabase(roomId);
      } catch (dbError) {
        console.error('Error loading room from database:', dbError);
        throw dbError;
      }
    }
  }

  /**
   * 失效房间缓存
   *
   * @param roomId 房间 ID
   * @returns Promise<void>
   */
  async invalidateRoom(roomId: string): Promise<void> {
    const cacheKey = this.getCacheKey(roomId);
    await this.cache.delete(cacheKey);
  }

  /**
   * 批量失效房间缓存
   *
   * @param roomIds 房间 ID 数组
   * @returns Promise<void>
   */
  async invalidateRooms(roomIds: string[]): Promise<void> {
    const promises = roomIds.map(roomId => this.invalidateRoom(roomId));
    await Promise.all(promises);
  }
}

/**
 * 获取房间缓存服务实例
 *
 * @returns RoomCacheService 实例
 */
export function getRoomCacheService(): RoomCacheService {
  return new RoomCacheService();
}
