/**
 * URL 同步 API 测试
 */

import request from 'supertest';
import { createApp } from '../src/app';
import { getPrismaClient } from '../src/db';

describe('URL同步', () => {
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
          currentUrl: null,
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
      // 如果数据库不可用，测试会失败，这是预期的
      console.warn('Database not available, some tests will fail:', error);
    }
  });

  afterAll(async () => {
    try {
      // 清理测试数据
      await prisma.roomEvent.deleteMany({
        where: { roomId: testRoomId },
      });
      await prisma.message.deleteMany({
        where: { roomId: testRoomId },
      });
      await prisma.roomMember.deleteMany({
        where: { roomId: testRoomId },
      });
      await prisma.room.deleteMany({
        where: { id: testRoomId },
      });
    } catch (error) {
      // 忽略清理错误
      console.warn('Cleanup error:', error);
    }
  });

  describe('PUT /api/v1/rooms/:roomId/url', () => {
    it('应该成功更新有效的 HTTP URL', async () => {
      const response = await request(app)
        .put(`/api/v1/rooms/${testRoomId}/url`)
        .send({
          url: 'http://example.com',
          userId: testUserId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.currentUrl).toBe('http://example.com');
      expect(response.body.data.id).toBe(testRoomId);

      // 验证数据库记录已更新
      const room = await prisma.room.findUnique({
        where: { id: testRoomId },
      });
      expect(room?.currentUrl).toBe('http://example.com');
    });

    it('应该成功更新有效的 HTTPS URL', async () => {
      const response = await request(app)
        .put(`/api/v1/rooms/${testRoomId}/url`)
        .send({
          url: 'https://www.bilibili.com/video/xxx',
          userId: testUserId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.currentUrl).toBe('https://www.bilibili.com/video/xxx');

      // 验证数据库记录已更新
      const room = await prisma.room.findUnique({
        where: { id: testRoomId },
      });
      expect(room?.currentUrl).toBe('https://www.bilibili.com/video/xxx');
    });

    it('应该拒绝无效的 URL 格式', async () => {
      const response = await request(app)
        .put(`/api/v1/rooms/${testRoomId}/url`)
        .send({
          url: 'not-a-valid-url',
          userId: testUserId,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bad Request');
      expect(response.body.message).toContain('valid HTTP or HTTPS URL');
    });

    it('应该拒绝非 HTTP/HTTPS 协议的 URL', async () => {
      const response = await request(app)
        .put(`/api/v1/rooms/${testRoomId}/url`)
        .send({
          url: 'ftp://example.com',
          userId: testUserId,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bad Request');
      expect(response.body.message).toContain('valid HTTP or HTTPS URL');
    });

    it('应该拒绝缺少 url 字段的请求', async () => {
      const response = await request(app)
        .put(`/api/v1/rooms/${testRoomId}/url`)
        .send({
          userId: testUserId,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bad Request');
      expect(response.body.message).toContain('url is required');
    });

    it('应该拒绝缺少 userId 字段的请求', async () => {
      const response = await request(app)
        .put(`/api/v1/rooms/${testRoomId}/url`)
        .send({
          url: 'https://example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bad Request');
      expect(response.body.message).toContain('userId is required');
    });

    it('应该拒绝空字符串 url', async () => {
      const response = await request(app)
        .put(`/api/v1/rooms/${testRoomId}/url`)
        .send({
          url: '',
          userId: testUserId,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bad Request');
    });

    it('应该拒绝空字符串 userId', async () => {
      const response = await request(app)
        .put(`/api/v1/rooms/${testRoomId}/url`)
        .send({
          url: 'https://example.com',
          userId: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bad Request');
    });

    it('应该拒绝不存在的房间', async () => {
      const nonExistentRoomId = 'room-nonexistent';
      const response = await request(app)
        .put(`/api/v1/rooms/${nonExistentRoomId}/url`)
        .send({
          url: 'https://example.com',
          userId: testUserId,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Not Found');
      expect(response.body.message).toBe('Room not found');
    });

    it('应该拒绝不在房间中的用户', async () => {
      const nonExistentUserId = 'user-nonexistent';
      const response = await request(app)
        .put(`/api/v1/rooms/${testRoomId}/url`)
        .send({
          url: 'https://example.com',
          userId: nonExistentUserId,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Not Found');
      expect(response.body.message).toContain('User not found in room');
    });

    it('应该拒绝无效的 roomId 格式', async () => {
      const response = await request(app)
        .put('/api/v1/rooms//url')
        .send({
          url: 'https://example.com',
          userId: testUserId,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bad Request');
    });

    it('应该正确处理 URL 前后的空格', async () => {
      const response = await request(app)
        .put(`/api/v1/rooms/${testRoomId}/url`)
        .send({
          url: '  https://example.com  ',
          userId: testUserId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.currentUrl).toBe('https://example.com');

      // 验证数据库记录已更新（去除空格）
      const room = await prisma.room.findUnique({
        where: { id: testRoomId },
      });
      expect(room?.currentUrl).toBe('https://example.com');
    });

    it('应该返回更新后的完整房间信息', async () => {
      const response = await request(app)
        .put(`/api/v1/rooms/${testRoomId}/url`)
        .send({
          url: 'https://test.com',
          userId: testUserId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testRoomId);
      expect(response.body.data.name).toBeDefined();
      expect(response.body.data.hostId).toBe(testHostId);
      expect(response.body.data.currentUrl).toBe('https://test.com');
      expect(response.body.data.inviteLink).toBeDefined();
      expect(response.body.data.createdAt).toBeDefined();
      expect(response.body.data.updatedAt).toBeDefined();
    });

    it('应该记录 URL 变更事件到 RoomEvent 表', async () => {
      const oldUrl = 'https://old.com';
      
      // 先设置一个旧 URL
      await prisma.room.update({
        where: { id: testRoomId },
        data: { currentUrl: oldUrl },
      });

      const newUrl = 'https://new.com';
      const response = await request(app)
        .put(`/api/v1/rooms/${testRoomId}/url`)
        .send({
          url: newUrl,
          userId: testUserId,
        });

      expect(response.status).toBe(200);

      // 验证事件已记录
      const events = await prisma.roomEvent.findMany({
        where: {
          roomId: testRoomId,
          eventType: 'URL_CHANGED',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      });

      expect(events.length).toBeGreaterThan(0);
      const latestEvent = events[0];
      expect(latestEvent.eventType).toBe('URL_CHANGED');
      expect(latestEvent.userId).toBe(testUserId);
      expect(latestEvent.eventData).toBeDefined();
      if (latestEvent.eventData && typeof latestEvent.eventData === 'object') {
        const eventData = latestEvent.eventData as { oldUrl?: string; newUrl?: string };
        expect(eventData.oldUrl).toBe(oldUrl);
        expect(eventData.newUrl).toBe(newUrl);
      }
    });

    it('应该更新 updatedAt 时间戳', async () => {
      // 获取当前房间的 updatedAt
      const roomBefore = await prisma.room.findUnique({
        where: { id: testRoomId },
      });
      const updatedAtBefore = roomBefore?.updatedAt;

      // 等待一小段时间确保时间戳会变化
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await request(app)
        .put(`/api/v1/rooms/${testRoomId}/url`)
        .send({
          url: 'https://updated.com',
          userId: testUserId,
        });

      expect(response.status).toBe(200);

      // 验证 updatedAt 已更新
      const roomAfter = await prisma.room.findUnique({
        where: { id: testRoomId },
      });
      expect(roomAfter?.updatedAt).not.toEqual(updatedAtBefore);
      expect(new Date(roomAfter?.updatedAt || '').getTime()).toBeGreaterThan(
        new Date(updatedAtBefore || '').getTime()
      );
    });
  });
});
