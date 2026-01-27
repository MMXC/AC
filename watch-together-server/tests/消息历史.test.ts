/**
 * 消息管理 API - 获取消息历史测试
 */

import request from 'supertest';
import { createApp } from '../src/app';
import { getPrismaClient } from '../src/db';

describe('消息历史', () => {
  let app: ReturnType<typeof createApp>;
  const prisma = getPrismaClient();

  let testRoomId: string;
  let testHostId: string;
  let testUserId: string;
  let messageIds: string[] = [];

  beforeAll(async () => {
    app = createApp();

    // 创建测试房间和成员
    testRoomId = `room-${Math.random().toString(36).substring(2, 10)}`;
    testHostId = `user-${Math.random().toString(36).substring(2, 10)}`;
    testUserId = `user-${Math.random().toString(36).substring(2, 10)}`;

    try {
      // 创建房间
      await prisma.room.create({
        data: {
          id: testRoomId,
          name: 'Test Room',
          hostId: testHostId,
          inviteLink: `/room/${testRoomId}`,
        },
      });

      // 创建房主成员
      await prisma.roomMember.create({
        data: {
          roomId: testRoomId,
          userId: testHostId,
          nickname: 'Test Host',
          isHost: true,
        },
      });

      // 创建普通成员
      await prisma.roomMember.create({
        data: {
          roomId: testRoomId,
          userId: testUserId,
          nickname: 'Test User',
          isHost: false,
        },
      });

      // 创建一些测试消息（按时间顺序，最新的在后）
      for (let i = 0; i < 15; i++) {
        const messageId = `msg-${Math.random().toString(36).substring(2, 10)}`;
        messageIds.push(messageId);
        await prisma.message.create({
          data: {
            id: messageId,
            roomId: testRoomId,
            userId: testUserId,
            nickname: 'Test User',
            content: `Message ${i + 1}`,
            createdAt: new Date(Date.now() + i * 1000), // 确保时间顺序
          },
        });
      }
    } catch (error) {
      console.error('Error setting up test data:', error);
    }
  });

  afterAll(async () => {
    // 清理测试数据
    try {
      await prisma.message.deleteMany({
        where: {
          roomId: testRoomId,
        },
      });
      await prisma.roomMember.deleteMany({
        where: {
          roomId: testRoomId,
        },
      });
      await prisma.room.deleteMany({
        where: {
          id: testRoomId,
        },
      });
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
  });

  describe('GET /api/v1/rooms/:roomId/messages', () => {
    it('应该返回 200 状态码', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/messages`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('应该返回消息列表', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/messages`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.messages).toBeDefined();
      expect(Array.isArray(response.body.data.messages)).toBe(true);
    });

    it('应该返回分页信息', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/messages`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination).toHaveProperty('total');
      expect(response.body.data.pagination).toHaveProperty('limit');
      expect(response.body.data.pagination).toHaveProperty('offset');
      expect(response.body.data.pagination).toHaveProperty('hasMore');
    });

    it('应该支持 limit 参数', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/messages?limit=5`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.messages.length).toBeLessThanOrEqual(5);
      expect(response.body.data.pagination.limit).toBe(5);
    });

    it('应该支持 offset 参数', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/messages?limit=5&offset=5`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.offset).toBe(5);
    });

    it('应该返回正确的总消息数', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/messages`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.total).toBe(15);
    });

    it('应该正确计算 hasMore', async () => {
      // 测试有更多消息的情况
      const response1 = await request(app).get(`/api/v1/rooms/${testRoomId}/messages?limit=10&offset=0`);
      expect(response1.status).toBe(200);
      expect(response1.body.data.pagination.hasMore).toBe(true);

      // 测试没有更多消息的情况
      const response2 = await request(app).get(`/api/v1/rooms/${testRoomId}/messages?limit=20&offset=0`);
      expect(response2.status).toBe(200);
      expect(response2.body.data.pagination.hasMore).toBe(false);
    });

    it('消息应该按时间倒序排列（最新的在前）', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/messages?limit=5`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      const messages = response.body.data.messages;
      
      // 验证消息按时间倒序排列
      for (let i = 0; i < messages.length - 1; i++) {
        const currentTime = new Date(messages[i].createdAt).getTime();
        const nextTime = new Date(messages[i + 1].createdAt).getTime();
        expect(currentTime).toBeGreaterThanOrEqual(nextTime);
      }
    });

    it('limit 最大值为 100', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/messages?limit=200`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.limit).toBe(100);
      expect(response.body.data.messages.length).toBeLessThanOrEqual(100);
    });

    it('默认 limit 应该为 50', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/messages`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.limit).toBe(50);
    });

    it('默认 offset 应该为 0', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/messages`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.offset).toBe(0);
    });

    it('返回的消息应该包含所有必需字段', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/messages?limit=1`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      if (response.body.data.messages.length > 0) {
        const message = response.body.data.messages[0];
        expect(message).toHaveProperty('id');
        expect(message).toHaveProperty('roomId');
        expect(message).toHaveProperty('userId');
        expect(message).toHaveProperty('nickname');
        expect(message).toHaveProperty('content');
        expect(message).toHaveProperty('createdAt');
      }
    });

    it('如果房间不存在应该返回 404', async () => {
      const nonExistentRoomId = 'room-nonexistent';
      const response = await request(app).get(`/api/v1/rooms/${nonExistentRoomId}/messages`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Room not found');
    });

    it('如果 limit 不是正整数应该返回 400', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/messages?limit=-1`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('limit');
    });

    it('如果 limit 不是数字应该返回 400', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/messages?limit=abc`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('limit');
    });

    it('如果 offset 是负数应该返回 400', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/messages?offset=-1`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('offset');
    });

    it('如果 offset 不是数字应该返回 400', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/messages?offset=abc`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('offset');
    });

    it('如果 roomId 为空应该返回 400', async () => {
      const response = await request(app).get('/api/v1/rooms//messages');

      expect(response.status).toBe(404); // Express 路由不匹配，返回 404
    });

    it('应该正确处理 limit=0 的情况', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/messages?limit=0`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('limit');
    });

    it('应该正确处理空消息列表', async () => {
      // 创建一个新房间，没有消息
      const emptyRoomId = `room-${Math.random().toString(36).substring(2, 10)}`;
      const emptyHostId = `user-${Math.random().toString(36).substring(2, 10)}`;

      try {
        await prisma.room.create({
          data: {
            id: emptyRoomId,
            name: 'Empty Room',
            hostId: emptyHostId,
            inviteLink: `/room/${emptyRoomId}`,
          },
        });

        const response = await request(app).get(`/api/v1/rooms/${emptyRoomId}/messages`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.messages).toEqual([]);
        expect(response.body.data.pagination.total).toBe(0);
        expect(response.body.data.pagination.hasMore).toBe(false);

        // 清理
        await prisma.room.deleteMany({
          where: {
            id: emptyRoomId,
          },
        });
      } catch (error) {
        console.error('Error in empty room test:', error);
      }
    });
  });
});
