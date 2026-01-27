/**
 * 房间缓存服务测试
 * 使用 mock 来测试缓存服务，不依赖真实的 Redis
 */

import { RoomCacheService, RoomCacheData } from '../src/services/roomCache';
import { getCacheService } from '../src/redis';
import { getPrismaClient } from '../src/db';

// Mock Redis 和数据库
jest.mock('../src/redis');
jest.mock('../src/db');

describe('房间缓存服务测试', () => {
  let roomCacheService: RoomCacheService;
  let mockCache: any;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Cache Service
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      getJSON: jest.fn(),
    };
    (getCacheService as jest.Mock).mockReturnValue(mockCache);

    // Mock Prisma Client
    mockPrisma = {
      room: {
        findFirst: jest.fn(),
      },
    };
    (getPrismaClient as jest.Mock).mockReturnValue(mockPrisma);

    roomCacheService = new RoomCacheService();
  });

  describe('getRoom - 从缓存获取房间信息', () => {
    it('应该从缓存获取房间信息', async () => {
      const roomId = 'room-abc12345';
      const cachedData: RoomCacheData = {
        id: roomId,
        name: 'Test Room',
        hostId: 'user-xyz67890',
        currentUrl: null,
        inviteLink: '/room/room-abc12345',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        members: [],
        memberCount: 0,
      };

      mockCache.getJSON.mockResolvedValue(cachedData);

      const result = await roomCacheService.getRoom(roomId);

      expect(result).toEqual(cachedData);
      expect(mockCache.getJSON).toHaveBeenCalledWith(`room:${roomId}`);
    });

    it('应该返回 null 当缓存不存在时', async () => {
      const roomId = 'room-abc12345';

      mockCache.getJSON.mockResolvedValue(null);

      const result = await roomCacheService.getRoom(roomId);

      expect(result).toBeNull();
      expect(mockCache.getJSON).toHaveBeenCalledWith(`room:${roomId}`);
    });
  });

  describe('setRoom - 将房间信息写入缓存', () => {
    it('应该将房间信息写入缓存', async () => {
      const roomId = 'room-abc12345';
      const roomData: RoomCacheData = {
        id: roomId,
        name: 'Test Room',
        hostId: 'user-xyz67890',
        currentUrl: null,
        inviteLink: '/room/room-abc12345',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        members: [],
        memberCount: 0,
      };

      mockCache.set.mockResolvedValue(undefined);

      await roomCacheService.setRoom(roomId, roomData);

      expect(mockCache.set).toHaveBeenCalledWith(
        `room:${roomId}`,
        roomData,
        3600 // TTL: 1 小时
      );
    });
  });

  describe('loadRoomFromDatabase - 从数据库加载房间信息', () => {
    it('应该从数据库加载房间信息并缓存', async () => {
      const roomId = 'room-abc12345';
      const mockRoom = {
        id: roomId,
        name: 'Test Room',
        hostId: 'user-xyz67890',
        currentUrl: null,
        inviteLink: '/room/room-abc12345',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [
          {
            userId: 'user-xyz67890',
            nickname: 'Test User',
            isHost: true,
            joinedAt: new Date(),
            lastActiveAt: new Date(),
          },
        ],
      };

      mockPrisma.room.findFirst.mockResolvedValue(mockRoom);
      mockCache.set.mockResolvedValue(undefined);

      const result = await roomCacheService.loadRoomFromDatabase(roomId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(roomId);
      expect(result?.members).toHaveLength(1);
      expect(mockPrisma.room.findFirst).toHaveBeenCalledWith({
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
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('应该返回 null 当房间不存在时', async () => {
      const roomId = 'room-abc12345';

      mockPrisma.room.findFirst.mockResolvedValue(null);

      const result = await roomCacheService.loadRoomFromDatabase(roomId);

      expect(result).toBeNull();
      expect(mockPrisma.room.findFirst).toHaveBeenCalled();
      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it('应该排除已删除的房间', async () => {
      const roomId = 'room-abc12345';

      mockPrisma.room.findFirst.mockResolvedValue(null);

      const result = await roomCacheService.loadRoomFromDatabase(roomId);

      expect(result).toBeNull();
      expect(mockPrisma.room.findFirst).toHaveBeenCalledWith({
        where: {
          id: roomId,
          deletedAt: null,
        },
        include: expect.any(Object),
      });
    });

    it('应该只包含未离开的成员', async () => {
      const roomId = 'room-abc12345';
      const mockRoom = {
        id: roomId,
        name: 'Test Room',
        hostId: 'user-xyz67890',
        currentUrl: null,
        inviteLink: '/room/room-abc12345',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [
          {
            userId: 'user-xyz67890',
            nickname: 'Test User',
            isHost: true,
            joinedAt: new Date(),
            lastActiveAt: new Date(),
          },
        ],
      };

      mockPrisma.room.findFirst.mockResolvedValue(mockRoom);
      mockCache.set.mockResolvedValue(undefined);

      await roomCacheService.loadRoomFromDatabase(roomId);

      expect(mockPrisma.room.findFirst).toHaveBeenCalledWith({
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
    });
  });

  describe('getRoomWithFallback - 获取房间信息（优先缓存）', () => {
    it('应该从缓存获取房间信息（缓存命中）', async () => {
      const roomId = 'room-abc12345';
      const cachedData: RoomCacheData = {
        id: roomId,
        name: 'Test Room',
        hostId: 'user-xyz67890',
        currentUrl: null,
        inviteLink: '/room/room-abc12345',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        members: [],
        memberCount: 0,
      };

      mockCache.getJSON.mockResolvedValue(cachedData);

      const result = await roomCacheService.getRoomWithFallback(roomId);

      expect(result).toEqual(cachedData);
      expect(mockCache.getJSON).toHaveBeenCalled();
      expect(mockPrisma.room.findFirst).not.toHaveBeenCalled();
    });

    it('应该从数据库加载房间信息（缓存未命中）', async () => {
      const roomId = 'room-abc12345';
      const mockRoom = {
        id: roomId,
        name: 'Test Room',
        hostId: 'user-xyz67890',
        currentUrl: null,
        inviteLink: '/room/room-abc12345',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [],
      };

      mockCache.getJSON.mockResolvedValue(null);
      mockPrisma.room.findFirst.mockResolvedValue(mockRoom);
      mockCache.set.mockResolvedValue(undefined);

      const result = await roomCacheService.getRoomWithFallback(roomId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(roomId);
      expect(mockCache.getJSON).toHaveBeenCalled();
      expect(mockPrisma.room.findFirst).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('应该返回 null 当房间不存在时', async () => {
      const roomId = 'room-abc12345';

      mockCache.getJSON.mockResolvedValue(null);
      mockPrisma.room.findFirst.mockResolvedValue(null);

      const result = await roomCacheService.getRoomWithFallback(roomId);

      expect(result).toBeNull();
      expect(mockCache.getJSON).toHaveBeenCalled();
      expect(mockPrisma.room.findFirst).toHaveBeenCalled();
    });
  });

  describe('invalidateRoom - 失效房间缓存', () => {
    it('应该删除房间缓存', async () => {
      const roomId = 'room-abc12345';

      mockCache.delete.mockResolvedValue(undefined);

      await roomCacheService.invalidateRoom(roomId);

      expect(mockCache.delete).toHaveBeenCalledWith(`room:${roomId}`);
    });
  });

  describe('invalidateRooms - 批量失效房间缓存', () => {
    it('应该批量删除房间缓存', async () => {
      const roomIds = ['room-abc12345', 'room-def67890', 'room-ghi01234'];

      mockCache.delete.mockResolvedValue(undefined);

      await roomCacheService.invalidateRooms(roomIds);

      expect(mockCache.delete).toHaveBeenCalledTimes(roomIds.length);
      roomIds.forEach(roomId => {
        expect(mockCache.delete).toHaveBeenCalledWith(`room:${roomId}`);
      });
    });

    it('应该处理空数组', async () => {
      await roomCacheService.invalidateRooms([]);

      expect(mockCache.delete).not.toHaveBeenCalled();
    });
  });
});
