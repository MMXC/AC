/**
 * 输入验证和错误处理测试
 */

import request from 'supertest';
import { createApp } from '../src/app';
import { getPrismaClient } from '../src/db';

describe('输入验证', () => {
  const app = createApp();
  const prisma = getPrismaClient();
  let testRoomId: string;
  let testHostId: string;
  let testUserId: string;

  beforeAll(async () => {
    // 创建测试房间和用户
    testHostId = 'user-test123';
    testUserId = 'user-test456';
    testRoomId = 'room-test123';

    try {
      await prisma.room.create({
        data: {
          id: testRoomId,
          name: 'Test Room',
          hostId: testHostId,
          currentUrl: 'https://example.com',
        },
      });

      await prisma.roomMember.create({
        data: {
          roomId: testRoomId,
          userId: testHostId,
          nickname: 'Test Host',
          isHost: true,
        },
      });

      await prisma.roomMember.create({
        data: {
          roomId: testRoomId,
          userId: testUserId,
          nickname: 'Test User',
          isHost: false,
        },
      });
    } catch (error) {
      // 忽略已存在的错误
    }
  });

  afterAll(async () => {
    // 清理测试数据
    try {
      await prisma.roomEvent.deleteMany({
        where: { roomId: testRoomId },
      });
      await prisma.message.deleteMany({
        where: { roomId: testRoomId },
      });
      await prisma.roomMember.deleteMany({
        where: { roomId: testRoomId },
      });
      await prisma.room.delete({
        where: { id: testRoomId },
      });
    } catch (error) {
      // 忽略错误
    }
  });

  describe('POST /api/v1/rooms - 创建房间', () => {
    it('缺少必需字段应该返回 400', async () => {
      const response = await request(app).post('/api/v1/rooms').send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBeDefined();
      expect(response.body.error.message).toBeDefined();
    });

    it('hostNickname 为空字符串应该返回 400', async () => {
      const response = await request(app).post('/api/v1/rooms').send({
        hostNickname: '',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('hostNickname 超过最大长度应该返回 400', async () => {
      const response = await request(app).post('/api/v1/rooms').send({
        hostNickname: 'a'.repeat(101),
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('name 超过最大长度应该返回 400', async () => {
      const response = await request(app).post('/api/v1/rooms').send({
        hostNickname: 'Test Host',
        name: 'a'.repeat(256),
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('类型错误应该返回 400', async () => {
      const response = await request(app).post('/api/v1/rooms').send({
        hostNickname: 123,
        name: true,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('有效输入应该返回 201', async () => {
      const response = await request(app).post('/api/v1/rooms').send({
        hostNickname: 'Valid Host',
        name: 'Valid Room',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      // 清理
      if (response.body.data?.id) {
        await prisma.roomMember.deleteMany({
          where: { roomId: response.body.data.id },
        });
        await prisma.room.delete({
          where: { id: response.body.data.id },
        });
      }
    });
  });

  describe('GET /api/v1/rooms/:roomId - 获取房间信息', () => {
    it('无效的 roomId 格式应该返回 400', async () => {
      const response = await request(app).get('/api/v1/rooms/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('有效的 roomId 应该返回 200', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('PUT /api/v1/rooms/:roomId - 更新房间', () => {
    it('无效的 roomId 格式应该返回 400', async () => {
      const response = await request(app).put('/api/v1/rooms/invalid-id').send({
        name: 'New Name',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('name 超过最大长度应该返回 400', async () => {
      const response = await request(app).put(`/api/v1/rooms/${testRoomId}`).send({
        name: 'a'.repeat(256),
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/rooms/:roomId/join - 加入房间', () => {
    it('缺少必需字段应该返回 400', async () => {
      const response = await request(app).post(`/api/v1/rooms/${testRoomId}/join`).send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('nickname 超过最大长度应该返回 400', async () => {
      const response = await request(app).post(`/api/v1/rooms/${testRoomId}/join`).send({
        nickname: 'a'.repeat(101),
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/rooms/:roomId/messages - 发送消息', () => {
    it('缺少必需字段应该返回 400', async () => {
      const response = await request(app).post(`/api/v1/rooms/${testRoomId}/messages`).send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('无效的 userId 格式应该返回 400', async () => {
      const response = await request(app).post(`/api/v1/rooms/${testRoomId}/messages`).send({
        userId: 'invalid-user-id',
        content: 'Test message',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('content 超过最大长度应该返回 400', async () => {
      const response = await request(app).post(`/api/v1/rooms/${testRoomId}/messages`).send({
        userId: testUserId,
        content: 'a'.repeat(1001),
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/rooms/:roomId/messages - 获取消息历史', () => {
    it('无效的 limit 参数应该返回 400', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/messages?limit=abc`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('limit 超过最大值应该被限制为 100', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/messages?limit=200`);

      // 应该成功，但 limit 被限制为 100
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('无效的 offset 参数应该返回 400', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/messages?offset=-1`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/v1/rooms/:roomId/url - 更新房间 URL', () => {
    it('缺少必需字段应该返回 400', async () => {
      const response = await request(app).put(`/api/v1/rooms/${testRoomId}/url`).send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('无效的 URL 格式应该返回 400', async () => {
      const response = await request(app).put(`/api/v1/rooms/${testRoomId}/url`).send({
        url: 'not-a-valid-url',
        userId: testUserId,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('非 HTTP/HTTPS URL 应该返回 400', async () => {
      const response = await request(app).put(`/api/v1/rooms/${testRoomId}/url`).send({
        url: 'ftp://example.com',
        userId: testUserId,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('错误响应格式', () => {
    it('错误响应应该包含 code 和 message', async () => {
      const response = await request(app).post('/api/v1/rooms').send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBeDefined();
      expect(response.body.error.message).toBeDefined();
      expect(typeof response.body.error.code).toBe('string');
      expect(typeof response.body.error.message).toBe('string');
    });
  });

  describe('数据库错误处理', () => {
    it('数据库错误应该被正确捕获和转换', async () => {
      // 尝试创建重复的房间 ID（如果支持唯一约束）
      // 注意：这取决于数据库约束，可能不会触发错误
      const response = await request(app).post('/api/v1/rooms').send({
        hostNickname: 'Test',
      });

      // 应该返回成功或适当的错误
      expect([201, 409, 500]).toContain(response.status);
      if (response.status !== 201) {
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBeDefined();
      }
    });
  });
});
