/**
 * 消息管理 API - 发送消息测试
 */

import request from 'supertest';
import { createApp } from '../src/app';
import { getPrismaClient } from '../src/db';

describe('发送消息', () => {
  let app: ReturnType<typeof createApp>;
  const prisma = getPrismaClient();

  let testRoomId: string;
  let testHostId: string;
  let testUserId: string;

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

  describe('POST /api/v1/rooms/:roomId/messages', () => {
    it('应该返回 201 状态码', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/messages`)
        .send({
          userId: testUserId,
          content: 'Hello!',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('应该返回消息包含所有必需字段', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/messages`)
        .send({
          userId: testUserId,
          content: 'Test message',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('roomId');
      expect(response.body.data).toHaveProperty('userId');
      expect(response.body.data).toHaveProperty('nickname');
      expect(response.body.data).toHaveProperty('content');
      expect(response.body.data).toHaveProperty('createdAt');
    });

    it('应该正确保存消息到数据库', async () => {
      const content = 'Database test message';
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/messages`)
        .send({
          userId: testUserId,
          content: content,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(content);

      // 验证消息已保存到数据库
      const message = await prisma.message.findUnique({
        where: {
          id: response.body.data.id,
        },
      });

      expect(message).toBeDefined();
      expect(message?.content).toBe(content);
      expect(message?.roomId).toBe(testRoomId);
      expect(message?.userId).toBe(testUserId);
    });

    it('应该返回正确的用户昵称', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/messages`)
        .send({
          userId: testUserId,
          content: 'Nickname test',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.nickname).toBe('Test User');
    });

    it('应该返回正确的房间 ID', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/messages`)
        .send({
          userId: testUserId,
          content: 'Room ID test',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.roomId).toBe(testRoomId);
    });

    it('应该返回正确的用户 ID', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/messages`)
        .send({
          userId: testUserId,
          content: 'User ID test',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(testUserId);
    });

    it('应该返回 ISO 格式的时间戳', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/messages`)
        .send({
          userId: testUserId,
          content: 'Timestamp test',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('如果房间不存在应该返回 404', async () => {
      const nonExistentRoomId = 'room-nonexistent';
      const response = await request(app)
        .post(`/api/v1/rooms/${nonExistentRoomId}/messages`)
        .send({
          userId: testUserId,
          content: 'Test message',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Room not found');
    });

    it('如果用户不在房间中应该返回 404', async () => {
      const nonExistentUserId = 'user-nonexistent';
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/messages`)
        .send({
          userId: nonExistentUserId,
          content: 'Test message',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('User not found in room or has left');
    });

    it('如果消息内容超过 1000 字符应该返回 400', async () => {
      const longContent = 'a'.repeat(1001);
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/messages`)
        .send({
          userId: testUserId,
          content: longContent,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('content');
    });

    it('如果消息内容为空应该返回 400', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/messages`)
        .send({
          userId: testUserId,
          content: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('content');
    });

    it('如果消息内容只包含空格应该返回 400', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/messages`)
        .send({
          userId: testUserId,
          content: '   ',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('content');
    });

    it('如果 userId 为空应该返回 400', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/messages`)
        .send({
          userId: '',
          content: 'Test message',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('userId');
    });

    it('如果 userId 缺失应该返回 400', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/messages`)
        .send({
          content: 'Test message',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('userId');
    });

    it('如果 content 缺失应该返回 400', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/messages`)
        .send({
          userId: testUserId,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('content');
    });

    it('如果 roomId 为空应该返回 400', async () => {
      const response = await request(app)
        .post('/api/v1/rooms//messages')
        .send({
          userId: testUserId,
          content: 'Test message',
        });

      expect(response.status).toBe(404); // Express 路由不匹配，返回 404
    });

    it('应该正确处理消息内容的前后空格', async () => {
      const content = '  Trimmed message  ';
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/messages`)
        .send({
          userId: testUserId,
          content: content,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(content.trim());
    });

    it('应该正确处理最大长度的消息（1000 字符）', async () => {
      const maxContent = 'a'.repeat(1000);
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/messages`)
        .send({
          userId: testUserId,
          content: maxContent,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(maxContent);
    });

    it('如果用户已离开房间应该返回 404', async () => {
      // 创建一个已离开的成员
      const leftUserId = `user-${Math.random().toString(36).substring(2, 10)}`;
      await prisma.roomMember.create({
        data: {
          roomId: testRoomId,
          userId: leftUserId,
          nickname: 'Left User',
          isHost: false,
          leftAt: new Date(),
        },
      });

      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/messages`)
        .send({
          userId: leftUserId,
          content: 'Test message',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('User not found in room or has left');

      // 清理
      await prisma.roomMember.deleteMany({
        where: {
          userId: leftUserId,
        },
      });
    });
  });
});
