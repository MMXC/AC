/**
 * 所有 API 端点测试 - 确保所有端点都有测试覆盖
 * 
 * 此文件用于验证所有 API 端点都有测试用例
 */

import request from 'supertest';
import { createApp } from '../src/app';
import { getPrismaClient } from '../src/db';
import { getCacheService } from '../src/redis';
import { getRoomCacheService } from '../src/services/roomCache';

// Mock 数据库和 Redis
jest.mock('../src/db');
jest.mock('../src/redis');
jest.mock('../src/services/roomCache');

describe('所有 API 端点测试覆盖验证', () => {
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
        update: jest.fn(),
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
      getJSON: jest.fn(),
      sadd: jest.fn(),
      srem: jest.fn(),
      smembers: jest.fn(),
      scard: jest.fn(),
      expire: jest.fn(),
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
    it('应该有测试覆盖', async () => {
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
      expect(response.body.data.id).toBe(roomId);
    });
  });

  describe('GET /api/v1/rooms/:roomId - 获取房间信息', () => {
    it('应该有测试覆盖', async () => {
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
      expect(response.body.data.id).toBe(roomId);
    });
  });

  describe('PUT /api/v1/rooms/:roomId - 更新房间', () => {
    it('应该有测试覆盖', async () => {
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

      mockPrisma.room.findFirst.mockResolvedValue(mockRoom);
      mockPrisma.room.update.mockResolvedValue(mockRoom);

      const response = await request(app)
        .put(`/api/v1/rooms/${roomId}`)
        .send({
          name: 'Updated Room',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/v1/rooms/:roomId - 删除房间', () => {
    it('应该有测试覆盖', async () => {
      const roomId = 'room-abc12345';
      const mockRoom = {
        id: roomId,
        name: 'Test Room',
        hostId: 'user-xyz67890',
        deletedAt: null,
      };

      mockPrisma.room.findFirst.mockResolvedValue(mockRoom);
      mockPrisma.room.update.mockResolvedValue({ ...mockRoom, deletedAt: new Date() });

      const response = await request(app)
        .delete(`/api/v1/rooms/${roomId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/rooms/:roomId/join - 加入房间', () => {
    it('应该有测试覆盖', async () => {
      const roomId = 'room-abc12345';
      const mockRoom = {
        id: roomId,
        name: 'Test Room',
        hostId: 'user-xyz67890',
        deletedAt: null,
        currentUrl: null,
        inviteLink: `/room/${roomId}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockMember = {
        id: 1,
        roomId: roomId,
        userId: 'user-new123',
        nickname: 'New Member',
        isHost: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
      };

      mockPrisma.room.findFirst.mockResolvedValue(mockRoom);
      mockPrisma.roomMember.create.mockResolvedValue(mockMember);

      const response = await request(app)
        .post(`/api/v1/rooms/${roomId}/join`)
        .send({
          nickname: 'New Member',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/rooms/:roomId/leave - 离开房间', () => {
    it('应该有测试覆盖', async () => {
      const roomId = 'room-abc12345';
      const userId = 'user-xyz67890';
      const mockRoom = {
        id: roomId,
        name: 'Test Room',
        deletedAt: null,
      };

      const mockMember = {
        id: 1,
        roomId: roomId,
        userId: userId,
        leftAt: null,
      };

      mockPrisma.room.findFirst.mockResolvedValue(mockRoom);
      mockPrisma.roomMember.findFirst.mockResolvedValue(mockMember);
      mockPrisma.roomMember.update.mockResolvedValue({ ...mockMember, leftAt: new Date() });

      const response = await request(app)
        .post(`/api/v1/rooms/${roomId}/leave`)
        .send({
          userId: userId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/rooms/:roomId/members - 获取成员列表', () => {
    it('应该有测试覆盖', async () => {
      const roomId = 'room-abc12345';
      const mockRoom = {
        id: roomId,
        name: 'Test Room',
        deletedAt: null,
      };

      const mockMembers = [
        {
          userId: 'user-xyz67890',
          nickname: 'Member 1',
          isHost: true,
          joinedAt: new Date(),
          lastActiveAt: new Date(),
        },
      ];

      mockPrisma.room.findFirst.mockResolvedValue(mockRoom);
      mockPrisma.roomMember.findMany.mockResolvedValue(mockMembers);

      const response = await request(app)
        .get(`/api/v1/rooms/${roomId}/members`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.members).toBeDefined();
    });
  });

  describe('POST /api/v1/rooms/:roomId/messages - 发送消息', () => {
    it('应该有测试覆盖', async () => {
      const roomId = 'room-abc12345';
      const userId = 'user-xyz67890';
      const mockRoom = {
        id: roomId,
        name: 'Test Room',
        deletedAt: null,
      };

      const mockMember = {
        id: 1,
        roomId: roomId,
        userId: userId,
        nickname: 'Test User',
        leftAt: null,
      };

      const mockMessage = {
        id: 'msg-abc12345',
        roomId: roomId,
        userId: userId,
        nickname: 'Test User',
        content: 'Test message',
        createdAt: new Date(),
      };

      mockPrisma.room.findFirst.mockResolvedValue(mockRoom);
      mockPrisma.roomMember.findFirst.mockResolvedValue(mockMember);
      mockPrisma.message.create.mockResolvedValue(mockMessage);

      const response = await request(app)
        .post(`/api/v1/rooms/${roomId}/messages`)
        .send({
          userId: userId,
          content: 'Test message',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('Test message');
    });
  });

  describe('GET /api/v1/rooms/:roomId/messages - 获取消息历史', () => {
    it('应该有测试覆盖', async () => {
      const roomId = 'room-abc12345';
      const mockRoom = {
        id: roomId,
        name: 'Test Room',
        deletedAt: null,
      };

      const mockMessages = [
        {
          id: 'msg-abc12345',
          roomId: roomId,
          userId: 'user-xyz67890',
          nickname: 'Test User',
          content: 'Test message',
          createdAt: new Date(),
        },
      ];

      mockPrisma.room.findFirst.mockResolvedValue(mockRoom);
      mockPrisma.message.count.mockResolvedValue(1);
      mockPrisma.message.findMany.mockResolvedValue(mockMessages);

      const response = await request(app)
        .get(`/api/v1/rooms/${roomId}/messages`)
        .query({ limit: 50, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.messages).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
    });
  });

  describe('PUT /api/v1/rooms/:roomId/url - 更新房间 URL', () => {
    it('应该有测试覆盖', async () => {
      const roomId = 'room-abc12345';
      const userId = 'user-xyz67890';
      const mockRoom = {
        id: roomId,
        name: 'Test Room',
        hostId: userId,
        currentUrl: null,
        inviteLink: `/room/${roomId}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const mockMember = {
        id: 1,
        roomId: roomId,
        userId: userId,
        leftAt: null,
      };

      const updatedRoom = {
        ...mockRoom,
        currentUrl: 'https://example.com',
      };

      mockPrisma.room.findFirst.mockResolvedValue(mockRoom);
      mockPrisma.roomMember.findFirst.mockResolvedValue(mockMember);
      mockPrisma.room.update.mockResolvedValue(updatedRoom);
      mockPrisma.roomEvent.create.mockResolvedValue({});

      const response = await request(app)
        .put(`/api/v1/rooms/${roomId}/url`)
        .send({
          url: 'https://example.com',
          userId: userId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.currentUrl).toBe('https://example.com');
    });
  });
});
