/**
 * API 端点综合测试
 * 使用 mock 来测试所有 API 端点，不依赖真实的数据库和 Redis
 */

import request from 'supertest';
import { createApp } from '../src/app';
import { getPrismaClient } from '../src/db';
import { getCacheService, getRoomCacheService } from '../src/services/roomCache';

// Mock 数据库和 Redis
jest.mock('../src/db');
jest.mock('../src/redis');
jest.mock('../src/services/roomCache');

describe('API 端点综合测试', () => {
  let app: ReturnType<typeof createApp>;
  let mockPrisma: any;
  let mockCache: any;
  let mockRoomCache: any;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Prisma Client
    mockPrisma = {
      room: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      roomMember: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      message: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      roomEvent: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    (getPrismaClient as jest.Mock).mockReturnValue(mockPrisma);

    // Mock Cache Service
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };
    (getCacheService as jest.Mock).mockReturnValue(mockCache);

    // Mock Room Cache Service
    mockRoomCache = {
      getRoomWithFallback: jest.fn(),
      invalidateRoom: jest.fn(),
    };
    (getRoomCacheService as jest.Mock).mockReturnValue(mockRoomCache);
  });

  describe('POST /api/v1/rooms - 创建房间', () => {
    it('应该成功创建房间', async () => {
      const roomId = 'room-abc12345';
      const hostId = 'user-xyz67890';
      const mockRoom = {
        id: roomId,
        name: 'Test Room',
        hostId: hostId,
        inviteLink: `/room/${roomId}`,
        createdAt: new Date(),
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          room: {
            create: jest.fn().mockResolvedValue(mockRoom),
          },
          roomMember: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const response = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'Test Room',
          hostNickname: 'Test Host',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name', 'Test Room');
    });

    it('应该使用默认名称当未提供名称时', async () => {
      const roomId = 'room-abc12345';
      const hostId = 'user-xyz67890';
      const mockRoom = {
        id: roomId,
        name: '未命名房间',
        hostId: hostId,
        inviteLink: `/room/${roomId}`,
        createdAt: new Date(),
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          room: {
            create: jest.fn().mockResolvedValue(mockRoom),
          },
          roomMember: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const response = await request(app)
        .post('/api/v1/rooms')
        .send({
          hostNickname: 'Test Host',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('未命名房间');
    });

    it('应该拒绝缺少 hostNickname 的请求', async () => {
      const response = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'Test Room',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/rooms/:roomId - 获取房间信息', () => {
    it('应该成功获取房间信息', async () => {
      const roomId = 'room-abc12345';
      const mockRoomData = {
        id: roomId,
        name: 'Test Room',
        hostId: 'user-xyz67890',
        currentUrl: null,
        inviteLink: `/room/${roomId}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        members: [],
        memberCount: 0,
      };

      mockRoomCache.getRoomWithFallback.mockResolvedValue(mockRoomData);

      const response = await request(app)
        .get(`/api/v1/rooms/${roomId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockRoomData);
    });

    it('应该返回 404 当房间不存在时', async () => {
      const roomId = 'room-abc12345';

      mockRoomCache.getRoomWithFallback.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/v1/rooms/${roomId}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/rooms/:roomId - 更新房间', () => {
    it('应该成功更新房间名称', async () => {
      const roomId = 'room-abc12345';
      const mockRoom = {
        id: roomId,
        name: 'Updated Room',
        hostId: 'user-xyz67890',
        currentUrl: null,
        inviteLink: `/room/${roomId}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.room.findFirst.mockResolvedValue({
        id: roomId,
        deletedAt: null,
      });
      mockPrisma.room.update.mockResolvedValue(mockRoom);
      mockRoomCache.invalidateRoom.mockResolvedValue(undefined);

      const response = await request(app)
        .put(`/api/v1/rooms/${roomId}`)
        .send({
          name: 'Updated Room',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Room');
      expect(mockRoomCache.invalidateRoom).toHaveBeenCalledWith(roomId);
    });

    it('应该返回 404 当房间不存在时', async () => {
      const roomId = 'room-abc12345';

      mockPrisma.room.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .put(`/api/v1/rooms/${roomId}`)
        .send({
          name: 'Updated Room',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/rooms/:roomId - 删除房间', () => {
    it('应该成功软删除房间', async () => {
      const roomId = 'room-abc12345';
      const mockRoom = {
        id: roomId,
        name: 'Test Room',
        hostId: 'user-xyz67890',
        deletedAt: new Date(),
      };

      mockPrisma.room.findFirst.mockResolvedValue({
        id: roomId,
        deletedAt: null,
      });
      mockPrisma.room.update.mockResolvedValue(mockRoom);
      mockRoomCache.invalidateRoom.mockResolvedValue(undefined);

      const response = await request(app)
        .delete(`/api/v1/rooms/${roomId}`);

      expect(response.status).toBe(200);
      expect(mockPrisma.room.update).toHaveBeenCalledWith({
        where: { id: roomId },
        data: { deletedAt: expect.any(Date) },
      });
      expect(mockRoomCache.invalidateRoom).toHaveBeenCalledWith(roomId);
    });
  });

  describe('POST /api/v1/rooms/:roomId/join - 加入房间', () => {
    it('应该成功加入房间', async () => {
      const roomId = 'room-abc12345';
      const userId = 'user-xyz67890';
      const mockRoom = {
        id: roomId,
        name: 'Test Room',
        hostId: 'user-host123',
      };
      const mockMember = {
        roomId,
        userId,
        nickname: 'New Member',
        isHost: false,
        joinedAt: new Date(),
      };

      mockPrisma.room.findFirst.mockResolvedValue(mockRoom);
      mockPrisma.roomMember.create.mockResolvedValue(mockMember);

      const response = await request(app)
        .post(`/api/v1/rooms/${roomId}/join`)
        .send({
          nickname: 'New Member',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('userId');
      expect(response.body.data).toHaveProperty('room');
    });

    it('应该返回 404 当房间不存在时', async () => {
      const roomId = 'room-abc12345';

      mockPrisma.room.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post(`/api/v1/rooms/${roomId}/join`)
        .send({
          nickname: 'New Member',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/rooms/:roomId/messages - 发送消息', () => {
    it('应该成功发送消息', async () => {
      const roomId = 'room-abc12345';
      const userId = 'user-xyz67890';
      const messageId = 'msg-12345678';
      const mockMessage = {
        id: messageId,
        userId,
        content: 'Hello, World!',
        createdAt: new Date(),
      };

      mockPrisma.room.findFirst.mockResolvedValue({
        id: roomId,
        deletedAt: null,
      });
      mockPrisma.roomMember.findFirst.mockResolvedValue({
        roomId,
        userId,
        nickname: 'Test User',
        leftAt: null,
      });
      mockPrisma.message.create.mockResolvedValue(mockMessage);

      const response = await request(app)
        .post(`/api/v1/rooms/${roomId}/messages`)
        .send({
          userId,
          content: 'Hello, World!',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', messageId);
      expect(response.body.data).toHaveProperty('content', 'Hello, World!');
    });

    it('应该返回 404 当房间不存在时', async () => {
      const roomId = 'room-abc12345';
      const userId = 'user-xyz67890';

      mockPrisma.room.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post(`/api/v1/rooms/${roomId}/messages`)
        .send({
          userId,
          content: 'Hello, World!',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/rooms/:roomId/messages - 获取消息历史', () => {
    it('应该成功获取消息列表', async () => {
      const roomId = 'room-abc12345';
      const mockMessages = [
        {
          id: 'msg-1',
          userId: 'user-1',
          content: 'Message 1',
          createdAt: new Date(),
          roomMember: {
            nickname: 'User 1',
          },
        },
        {
          id: 'msg-2',
          userId: 'user-2',
          content: 'Message 2',
          createdAt: new Date(),
          roomMember: {
            nickname: 'User 2',
          },
        },
      ];

      mockPrisma.room.findFirst.mockResolvedValue({
        id: roomId,
        deletedAt: null,
      });
      mockPrisma.message.findMany.mockResolvedValue(mockMessages);
      mockPrisma.message.count.mockResolvedValue(2);

      const response = await request(app)
        .get(`/api/v1/rooms/${roomId}/messages`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('messages');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('应该支持分页参数', async () => {
      const roomId = 'room-abc12345';

      mockPrisma.room.findFirst.mockResolvedValue({
        id: roomId,
        deletedAt: null,
      });
      mockPrisma.message.findMany.mockResolvedValue([]);
      mockPrisma.message.count.mockResolvedValue(0);

      const response = await request(app)
        .get(`/api/v1/rooms/${roomId}/messages`)
        .query({
          limit: 10,
          offset: 0,
        });

      expect(response.status).toBe(200);
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 0,
        })
      );
    });
  });

  describe('PUT /api/v1/rooms/:roomId/url - 更新房间 URL', () => {
    it('应该成功更新房间 URL', async () => {
      const roomId = 'room-abc12345';
      const userId = 'user-xyz67890';
      const newUrl = 'https://example.com';
      const mockRoom = {
        id: roomId,
        currentUrl: newUrl,
      };

      mockPrisma.room.findFirst.mockResolvedValue({
        id: roomId,
        deletedAt: null,
      });
      mockPrisma.roomMember.findFirst.mockResolvedValue({
        roomId,
        userId,
        leftAt: null,
      });
      mockPrisma.room.update.mockResolvedValue(mockRoom);
      mockPrisma.roomEvent.create.mockResolvedValue({});
      mockRoomCache.invalidateRoom.mockResolvedValue(undefined);

      const response = await request(app)
        .put(`/api/v1/rooms/${roomId}/url`)
        .send({
          userId,
          url: newUrl,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('url', newUrl);
      expect(mockRoomCache.invalidateRoom).toHaveBeenCalledWith(roomId);
    });

    it('应该拒绝无效的 URL 格式', async () => {
      const roomId = 'room-abc12345';
      const userId = 'user-xyz67890';

      mockPrisma.room.findFirst.mockResolvedValue({
        id: roomId,
        deletedAt: null,
      });
      mockPrisma.roomMember.findFirst.mockResolvedValue({
        roomId,
        userId,
        leftAt: null,
      });

      const response = await request(app)
        .put(`/api/v1/rooms/${roomId}/url`)
        .send({
          userId,
          url: 'not-a-valid-url',
        });

      expect(response.status).toBe(400);
    });
  });
});
