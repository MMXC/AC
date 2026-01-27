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
        hostId: 'user-host12', // 8位格式：user-host12
        inviteLink: '/room/room-testjoin',
      },
    });

    // 创建房主成员
    await prisma.roomMember.create({
      data: {
        roomId: room.id,
        userId: 'user-host12', // 8位格式：user-host12
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
      expect(response.body.data.room.hostId).toBe('user-host12');
    });

    it('如果房间不存在应该返回 404', async () => {
      const response = await request(app)
        .post('/api/v1/rooms/room-nonexist/join')
        .send({
          nickname: 'Test User',
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code', 'NOT_FOUND');
      expect(response.body).toHaveProperty('message', 'Room not found');
    });

    it('应该拒绝缺少 nickname 的请求', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
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

      // trim 后的空字符串会触发 min(1) 验证失败
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
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
      expect(response.body).toHaveProperty('code', 'NOT_FOUND');

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

    it('房主使用 hostUserId 加入房间应识别为房主', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: 'Test Host Rejoin',
          userId: 'user-host12', // 使用房主的 userId（8位格式）
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isHost).toBe(true);
      expect(response.body.data.userId).toBe('user-host12');

      // 验证数据库中的记录
      const member = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: testRoomId,
            userId: 'user-host12',
          },
        },
      });

      expect(member).toBeDefined();
      expect(member?.isHost).toBe(true);
      expect(member?.leftAt).toBeNull();
      expect(member?.lastActiveAt).toBeDefined();
    });

    it('普通成员加入房间应创建新成员', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: 'Regular Member',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isHost).toBe(false);
      expect(response.body.data.userId).toMatch(/^user-[a-z0-9]{8}$/);

      // 验证数据库中的记录
      const member = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: testRoomId,
            userId: response.body.data.userId,
          },
        },
      });

      expect(member).toBeDefined();
      expect(member?.isHost).toBe(false);
    });

    it('传入无效 userId（不等于 hostId）时，仍创建新成员', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: 'Invalid User',
          userId: 'user-invali', // 不等于 hostId（8位格式）
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isHost).toBe(false);
      // 应该使用传入的 userId 创建新成员
      expect(response.body.data.userId).toBe('user-invali');

      // 验证数据库中的记录
      const member = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: testRoomId,
            userId: 'user-invali',
          },
        },
      });

      expect(member).toBeDefined();
      expect(member?.isHost).toBe(false);
    });

    it('不传 userId 时行为不变（向后兼容）', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: 'Backward Compatible User',
          // 不传 userId
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isHost).toBe(false);
      expect(response.body.data.userId).toMatch(/^user-[a-z0-9]{8}$/);
    });

    it('房主加入时复用现有 RoomMember 记录，更新 leftAt 为 null', async () => {
      // 先让房主离开（设置 leftAt）
      await prisma.roomMember.update({
        where: {
          roomId_userId: {
            roomId: testRoomId,
            userId: 'user-host12',
          },
        },
        data: {
          leftAt: new Date(),
        },
      });

      // 房主重新加入
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: 'Test Host Rejoin',
          userId: 'user-host12',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.isHost).toBe(true);

      // 验证 leftAt 已被设置为 null
      const member = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: testRoomId,
            userId: 'user-host12',
          },
        },
      });

      expect(member?.leftAt).toBeNull();
      expect(member?.lastActiveAt).toBeDefined();
    });
  });
});
