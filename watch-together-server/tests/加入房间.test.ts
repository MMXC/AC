/**
 * 成员管理 API - 加入房间测试
 */

import request from 'supertest';
import { createApp } from '../src/app';
import { getPrismaClient } from '../src/db';

describe('加入房间', () => {
  let app: ReturnType<typeof createApp>;
  const prisma = getPrismaClient();
  let testRoomId: string;

  beforeAll(async () => {
    app = createApp();

    // 创建一个测试房间
    const room = await prisma.room.create({
      data: {
        id: 'room-testjoin',
        name: 'Test Join Room',
        hostId: 'user-host123',
        inviteLink: '/room/room-testjoin',
      },
    });

    // 创建房主成员
    await prisma.roomMember.create({
      data: {
        roomId: room.id,
        userId: 'user-host123',
        nickname: 'Test Host',
        isHost: true,
      },
    });

    testRoomId = room.id;
  });

  afterAll(async () => {
    // 清理测试数据
    try {
      await prisma.roomMember.deleteMany({
        where: {
          room: {
            id: {
              in: ['room-testjoin', 'room-nonexist'],
            },
          },
        },
      });
      await prisma.room.deleteMany({
        where: {
          id: {
            in: ['room-testjoin', 'room-nonexist'],
          },
        },
      });
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
  });

  describe('POST /api/v1/rooms/:roomId/join', () => {
    it('应该返回 200 状态码', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: 'New Member',
        });

      expect(response.status).toBe(200);
    });

    it('应该返回正确的响应格式', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: 'Test User',
        });

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('userId');
      expect(response.body.data).toHaveProperty('roomId');
      expect(response.body.data).toHaveProperty('nickname');
      expect(response.body.data).toHaveProperty('room');
      expect(response.body.data).toHaveProperty('joinedAt');
    });

    it('返回的用户 ID 格式应该正确（如 user-abc12345）', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: 'Format Test User',
        });

      expect(response.body.data.userId).toMatch(/^user-[a-z0-9]{8}$/);
    });

    it('应该正确保存成员记录到数据库', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: 'Database Test User',
        });

      const userId = response.body.data.userId;

      // 验证成员记录存在于数据库
      const member = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: testRoomId,
            userId: userId,
          },
        },
      });

      expect(member).toBeDefined();
      expect(member?.nickname).toBe('Database Test User');
      expect(member?.isHost).toBe(false);
      expect(member?.roomId).toBe(testRoomId);
    });

    it('应该返回房间信息', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: 'Room Info Test User',
        });

      expect(response.body.data.room).toBeDefined();
      expect(response.body.data.room.id).toBe(testRoomId);
      expect(response.body.data.room.name).toBe('Test Join Room');
      expect(response.body.data.room.hostId).toBe('user-host123');
    });

    it('如果房间不存在应该返回 404', async () => {
      const response = await request(app)
        .post('/api/v1/rooms/room-nonexist/join')
        .send({
          nickname: 'Test User',
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Not Found');
      expect(response.body).toHaveProperty('message', 'Room not found');
    });

    it('应该拒绝缺少 nickname 的请求', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Bad Request');
    });

    it('应该拒绝空的 nickname', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: '',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('应该拒绝只包含空格的 nickname', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: '   ',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('应该拒绝超过 100 字符的 nickname', async () => {
      const longNickname = 'a'.repeat(101);
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: longNickname,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('应该正确处理 100 字符的 nickname', async () => {
      const maxLengthNickname = 'a'.repeat(100);
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: maxLengthNickname,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.nickname).toBe(maxLengthNickname);
    });

    it('应该自动修剪 nickname 的前后空格', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: '  Trimmed User  ',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.nickname).toBe('Trimmed User');
    });

    it('应该生成唯一的用户 ID', async () => {
      const response1 = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: 'User 1',
        });

      const response2 = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: 'User 2',
        });

      expect(response1.body.data.userId).not.toBe(response2.body.data.userId);
    });

    it('应该返回有效的 ISO 格式时间戳', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: 'Timestamp Test User',
        });

      const joinedAt = response.body.data.joinedAt;
      expect(() => new Date(joinedAt)).not.toThrow();
      expect(new Date(joinedAt).toISOString()).toBe(joinedAt);
    });

    it('应该拒绝无效的 roomId 格式', async () => {
      const response = await request(app)
        .post('/api/v1/rooms/ /join')
        .send({
          nickname: 'Test User',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('如果房间已删除应该返回 404', async () => {
      // 创建一个已删除的房间
      const deletedRoom = await prisma.room.create({
        data: {
          id: 'room-deleted',
          name: 'Deleted Room',
          hostId: 'user-host456',
          inviteLink: '/room/room-deleted',
          deletedAt: new Date(),
        },
      });

      const response = await request(app)
        .post(`/api/v1/rooms/${deletedRoom.id}/join`)
        .send({
          nickname: 'Test User',
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Not Found');

      // 清理
      await prisma.room.delete({
        where: { id: deletedRoom.id },
      });
    });

    it('应该允许同一房间有多个成员', async () => {
      const response1 = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: 'Member 1',
        });

      const response2 = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: 'Member 2',
        });

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.data.userId).not.toBe(response2.body.data.userId);
    });
  });
});
