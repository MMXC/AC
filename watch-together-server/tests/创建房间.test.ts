/**
 * 房间管理 API - 创建房间测试
 */

import request from 'supertest';
import { createApp } from '../src/app';
import { getPrismaClient } from '../src/db';

describe('创建房间', () => {
  let app: ReturnType<typeof createApp>;
  const prisma = getPrismaClient();

  beforeAll(async () => {
    app = createApp();
  });

  afterAll(async () => {
    // 清理测试数据
    try {
      // 删除测试创建的房间和成员
      await prisma.roomMember.deleteMany({
        where: {
          room: {
            id: {
              startsWith: 'room-',
            },
          },
        },
      });
      await prisma.room.deleteMany({
        where: {
          id: {
            startsWith: 'room-',
          },
        },
      });
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
  });

  describe('POST /api/v1/rooms', () => {
    it('应该返回 201 状态码', async () => {
      const response = await request(app)
        .post('/api/v1/rooms')
        .send({
          url: 'https://example.com',
          name: 'Test Room',
          hostNickname: 'Test Host',
        });

      expect(response.status).toBe(201);
    });

    it('应该返回正确的响应格式', async () => {
      const response = await request(app)
        .post('/api/v1/rooms')
        .send({
          url: 'https://example.com',
          name: 'Test Room',
          hostNickname: 'Test Host',
        });

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('roomId');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('hostId');
      expect(response.body.data).toHaveProperty('hostUserId');
      expect(response.body.data).toHaveProperty('hostNickname');
      expect(response.body.data).toHaveProperty('currentUrl');
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('inviteLink');
    });

    it('返回的房间 ID 格式应该正确（如 room-abc12345）', async () => {
      const response = await request(app)
        .post('/api/v1/rooms')
        .send({
          url: 'https://example.com',
          name: 'Test Room',
          hostNickname: 'Test Host',
        });

      expect(response.body.data.id).toMatch(/^room-[a-z0-9]{8}$/);
    });

    it('应该正确保存房间信息到数据库', async () => {
      const response = await request(app)
        .post('/api/v1/rooms')
        .send({
          url: 'https://db-test.com',
          name: 'Database Test Room',
          hostNickname: 'Database Test Host',
        });

      const roomId = response.body.data.id;

      // 验证房间记录存在于数据库
      const room = await prisma.room.findUnique({
        where: { id: roomId },
      });

      expect(room).toBeDefined();
      expect(room?.name).toBe('Database Test Room');
      expect(room?.hostId).toBe(response.body.data.hostId);
      expect(room?.currentUrl).toBe('https://db-test.com');
      expect(room?.inviteLink).toBe(`/room/${roomId}`);
    });

    it('应该自动创建房主成员记录', async () => {
      const response = await request(app)
        .post('/api/v1/rooms')
        .send({
          url: 'https://member-test.com',
          name: 'Member Test Room',
          hostNickname: 'Member Test Host',
        });

      const roomId = response.body.data.id;
      const hostId = response.body.data.hostUserId;

      // 验证房主成员记录存在于数据库
      const member = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: roomId,
            userId: hostId,
          },
        },
      });

      expect(member).toBeDefined();
      expect(member?.nickname).toBe('Member Test Host');
      expect(member?.isHost).toBe(true);
    });

    it('应该使用默认房间名称（如果未提供）', async () => {
      const response = await request(app)
        .post('/api/v1/rooms')
        .send({
          url: 'https://default-name.com',
          hostNickname: 'Default Name Host',
        });

      expect(response.body.data.name).toBe('未命名房间');
    });

    it('缺少 hostNickname 时应该使用默认昵称“房主”', async () => {
      const response = await request(app)
        .post('/api/v1/rooms')
        .send({
          url: 'https://default-host.com',
          name: 'Test Room',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.hostNickname).toBe('房主');
    });

    it('空或只包含空格的 hostNickname 应该被自动修剪或使用默认值', async () => {
      const response = await request(app)
        .post('/api/v1/rooms')
        .send({
          url: 'https://trim-host.com',
          name: 'Test Room',
          hostNickname: '   ',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.hostNickname).toBe('房主');
    });

    it('应该拒绝超过 255 字符的房间名称', async () => {
      const longName = 'a'.repeat(256);
      const response = await request(app)
        .post('/api/v1/rooms')
        .send({
          url: 'https://too-long-name.com',
          name: longName,
          hostNickname: 'Test Host',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('应该正确处理 255 字符的房间名称', async () => {
      const maxLengthName = 'a'.repeat(255);
      const response = await request(app)
        .post('/api/v1/rooms')
        .send({
          url: 'https://max-length.com',
          name: maxLengthName,
          hostNickname: 'Test Host',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe(maxLengthName);
    });

    it('应该自动修剪 hostNickname 的前后空格', async () => {
      const response = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'Test Room',
          hostNickname: '  Trimmed Host  ',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.hostNickname).toBe('Trimmed Host');
    });

    it('应该自动修剪房间名称的前后空格', async () => {
      const response = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: '  Trimmed Room  ',
          hostNickname: 'Test Host',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('Trimmed Room');
    });

    it('应该生成唯一的房间 ID', async () => {
      const response1 = await request(app)
        .post('/api/v1/rooms')
        .send({
          url: 'https://room1.com',
          name: 'Room 1',
          hostNickname: 'Host 1',
        });

      const response2 = await request(app)
        .post('/api/v1/rooms')
        .send({
          url: 'https://room2.com',
          name: 'Room 2',
          hostNickname: 'Host 2',
        });

      expect(response1.body.data.id).not.toBe(response2.body.data.id);
    });

    it('应该生成唯一的房主 ID', async () => {
      const response1 = await request(app)
        .post('/api/v1/rooms')
        .send({
          url: 'https://room1-host.com',
          name: 'Room 1',
          hostNickname: 'Host 1',
        });

      const response2 = await request(app)
        .post('/api/v1/rooms')
        .send({
          url: 'https://room2-host.com',
          name: 'Room 2',
          hostNickname: 'Host 2',
        });

      expect(response1.body.data.hostId).not.toBe(response2.body.data.hostId);
    });

    it('应该返回有效的 ISO 格式时间戳', async () => {
      const response = await request(app)
        .post('/api/v1/rooms')
        .send({
          url: 'https://timestamp-test.com',
          name: 'Test Room',
          hostNickname: 'Test Host',
        });

      const createdAt = response.body.data.createdAt;
      expect(() => new Date(createdAt)).not.toThrow();
      expect(new Date(createdAt).toISOString()).toBe(createdAt);
    });

    it('应该返回正确的邀请链接格式', async () => {
      const response = await request(app)
        .post('/api/v1/rooms')
        .send({
          url: 'https://invite-link.com',
          name: 'Test Room',
          hostNickname: 'Test Host',
        });

      const roomId = response.body.data.id;
      expect(response.body.data.inviteLink).toBe(`/room/${roomId}`);
    });
  });
});
