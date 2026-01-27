/**
 * URL 同步 API 测试
 * 测试 PUT /api/v1/rooms/:roomId/url 接口
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

    // 创建测试房间和用户
    testHostId = 'user-host999';
    testUserId = 'user-test999';
    testRoomId = 'room-test999';

    try {
      // 创建测试房间
      await prisma.room.create({
        data: {
          id: testRoomId,
          name: 'Test Room for URL Sync API',
          hostId: testHostId,
          currentUrl: 'https://example.com',
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
      throw error;
    }
  });

  afterAll(async () => {
    // 清理测试数据
    try {
      if (testRoomId) {
        await prisma.roomEvent.deleteMany({
          where: {
            roomId: testRoomId,
          },
        });
        await prisma.roomMember.deleteMany({
          where: {
            roomId: testRoomId,
          },
        });
        await prisma.room.delete({
          where: {
            id: testRoomId,
          },
        });
      }
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
  });

  describe('PUT /api/v1/rooms/:roomId/url', () => {
    it('PUT 请求可以更新房间 URL', async () => {
      const newUrl = 'https://www.bilibili.com/video/xxx';
      const response = await request(app)
        .put(`/api/v1/rooms/${testRoomId}/url`)
        .send({
          url: newUrl,
          userId: testHostId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.currentUrl).toBe(newUrl);
    });

    it('返回更新后的 URL 信息', async () => {
      const newUrl = 'https://example-updated.com';
      const response = await request(app)
        .put(`/api/v1/rooms/${testRoomId}/url`)
        .send({
          url: newUrl,
          userId: testHostId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('hostId');
      expect(response.body.data).toHaveProperty('currentUrl');
      expect(response.body.data).toHaveProperty('inviteLink');
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('updatedAt');
      expect(response.body.data.currentUrl).toBe(newUrl);
    });

    it('数据库记录正确更新', async () => {
      const newUrl = `https://db-test-${Date.now()}.com`;
      const response = await request(app)
        .put(`/api/v1/rooms/${testRoomId}/url`)
        .send({
          url: newUrl,
          userId: testHostId,
        });

      expect(response.status).toBe(200);

      // 验证数据库中的记录已更新
      const room = await prisma.room.findUnique({
        where: { id: testRoomId },
      });

      expect(room).toBeDefined();
      expect(room?.currentUrl).toBe(newUrl);
    });

    it('URL 格式验证 - 有效的 HTTP URL 应该成功', async () => {
      const response = await request(app)
        .put(`/api/v1/rooms/${testRoomId}/url`)
        .send({
          url: 'http://example.com',
          userId: testHostId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('URL 格式验证 - 有效的 HTTPS URL 应该成功', async () => {
      const response = await request(app)
        .put(`/api/v1/rooms/${testRoomId}/url`)
        .send({
          url: 'https://example.com',
          userId: testHostId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('URL 格式验证 - 无效的 URL 应该返回 400', async () => {
      const response = await request(app)
        .put(`/api/v1/rooms/${testRoomId}/url`)
        .send({
          url: 'not-a-valid-url',
          userId: testHostId,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('URL 格式验证 - 非 HTTP/HTTPS URL 应该返回 400', async () => {
      const response = await request(app)
        .put(`/api/v1/rooms/${testRoomId}/url`)
        .send({
          url: 'ftp://example.com',
          userId: testHostId,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('如果房间不存在返回 404', async () => {
      const nonExistentRoomId = 'room-nonexist';
      const response = await request(app)
        .put(`/api/v1/rooms/${nonExistentRoomId}/url`)
        .send({
          url: 'https://example.com',
          userId: testHostId,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('Room not found');
    });

    it('如果用户不在房间中返回 404', async () => {
      const nonExistentUserId = 'user-nonexist';
      const response = await request(app)
        .put(`/api/v1/rooms/${testRoomId}/url`)
        .send({
          url: 'https://example.com',
          userId: nonExistentUserId,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('User not found in room');
    });

    it('应该记录 URL 变更事件到 RoomEvent 表', async () => {
      const oldUrl = 'https://old-url.com';
      const newUrl = 'https://new-url.com';

      // 先设置一个旧 URL
      await prisma.room.update({
        where: { id: testRoomId },
        data: { currentUrl: oldUrl },
      });

      // 更新 URL
      const response = await request(app)
        .put(`/api/v1/rooms/${testRoomId}/url`)
        .send({
          url: newUrl,
          userId: testHostId,
        });

      expect(response.status).toBe(200);

      // 验证 RoomEvent 已创建
      const event = await prisma.roomEvent.findFirst({
        where: {
          roomId: testRoomId,
          eventType: 'URL_CHANGED',
          userId: testHostId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(event).toBeDefined();
      expect(event?.eventData).toBeDefined();
      if (event?.eventData && typeof event.eventData === 'object' && 'newUrl' in event.eventData) {
        expect((event.eventData as { newUrl: string }).newUrl).toBe(newUrl);
      }
    });

    it('普通成员不可以更新 URL，应该返回 403，且 URL 不被修改', async () => {
      const originalRoom = await prisma.room.findUnique({
        where: { id: testRoomId },
      });

      const newUrl = `https://member-update-${Date.now()}.com`;
      const response = await request(app)
        .put(`/api/v1/rooms/${testRoomId}/url`)
        .send({
          url: newUrl,
          userId: testUserId,
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toContain('Only host');

      const roomAfter = await prisma.room.findUnique({
        where: { id: testRoomId },
      });

      expect(roomAfter).toBeDefined();
      if (originalRoom) {
        expect(roomAfter?.currentUrl).toBe(originalRoom.currentUrl);
      }
    });

    it('缺少 url 字段应该返回 400', async () => {
      const response = await request(app)
        .put(`/api/v1/rooms/${testRoomId}/url`)
        .send({
          userId: testHostId,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('缺少 userId 字段应该返回 400', async () => {
      const response = await request(app)
        .put(`/api/v1/rooms/${testRoomId}/url`)
        .send({
          url: 'https://example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
