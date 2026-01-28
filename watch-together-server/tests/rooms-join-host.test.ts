/**
 * 房主加入房间的集成测试
 * 
 * 测试场景：
 * 1. 房主首次加入房间（创建时已创建 RoomMember）
 * 2. 房主重新加入房间（RoomMember 的 leftAt 不为 null）
 * 3. 普通成员加入房间（不应受影响）
 */

import request from 'supertest';
import { createApp } from '../src/app';
import { getPrismaClient } from '../src/db';

describe('rooms-join-host', () => {
  let app: ReturnType<typeof createApp>;
  const prisma = getPrismaClient();
  let testRoomId: string;
  let hostUserId: string;

  beforeAll(async () => {
    app = createApp();

    // 生成房主用户ID
    hostUserId = 'user-host99';

    // 创建一个测试房间
    const room = await prisma.room.create({
      data: {
        id: 'room-hostjoin',
        name: 'Host Join Test Room',
        hostId: hostUserId,
        currentUrl: 'https://example.com',
        inviteLink: '/room/room-hostjoin',
      },
    });

    // 创建房主成员记录（模拟创建房间时已创建 RoomMember）
    await prisma.roomMember.create({
      data: {
        roomId: room.id,
        userId: hostUserId,
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
          roomId: testRoomId,
        },
      });
      await prisma.room.delete({
        where: { id: testRoomId },
      });
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
  });

  describe('房主首次加入房间', () => {
    it('房主使用 hostUserId 调用 /join 接口应返回 isHost: true', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: 'Test Host',
          userId: hostUserId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isHost).toBe(true);
      expect(response.body.data.userId).toBe(hostUserId);
    });

    it('房主加入时 RoomMember 记录应被复用，leftAt 应为 null', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: 'Test Host Updated',
          userId: hostUserId,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.isHost).toBe(true);

      // 验证数据库中的记录
      const member = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: testRoomId,
            userId: hostUserId,
          },
        },
      });

      expect(member).toBeDefined();
      expect(member?.isHost).toBe(true);
      expect(member?.leftAt).toBeNull();
      expect(member?.lastActiveAt).toBeDefined();
      expect(member?.nickname).toBe('Test Host Updated');
    });

    it('房主加入时 lastActiveAt 应被更新', async () => {
      // 获取加入前的 lastActiveAt
      const beforeMember = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: testRoomId,
            userId: hostUserId,
          },
        },
      });

      const beforeLastActiveAt = beforeMember?.lastActiveAt;

      // 等待一小段时间确保时间戳不同
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 房主加入
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: 'Test Host',
          userId: hostUserId,
        });

      expect(response.status).toBe(200);

      // 验证 lastActiveAt 已更新
      const afterMember = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: testRoomId,
            userId: hostUserId,
          },
        },
      });

      expect(afterMember?.lastActiveAt).toBeDefined();
      if (beforeLastActiveAt) {
        expect(afterMember?.lastActiveAt!.getTime()).toBeGreaterThan(
          beforeLastActiveAt.getTime()
        );
      }
    });
  });

  describe('房主重新加入房间', () => {
    beforeEach(async () => {
      // 设置房主为已离开状态（leftAt 不为 null）
      await prisma.roomMember.update({
        where: {
          roomId_userId: {
            roomId: testRoomId,
            userId: hostUserId,
          },
        },
        data: {
          leftAt: new Date(),
        },
      });
    });

    it('房主重新加入时 leftAt 应被设置为 null', async () => {
      // 验证 leftAt 不为 null（离开状态）
      const beforeMember = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: testRoomId,
            userId: hostUserId,
          },
        },
      });

      expect(beforeMember?.leftAt).not.toBeNull();

      // 房主重新加入
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: 'Test Host Rejoin',
          userId: hostUserId,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.isHost).toBe(true);

      // 验证 leftAt 已被设置为 null
      const afterMember = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: testRoomId,
            userId: hostUserId,
          },
        },
      });

      expect(afterMember?.leftAt).toBeNull();
      expect(afterMember?.lastActiveAt).toBeDefined();
    });

    it('房主重新加入时返回 isHost: true', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: 'Test Host Rejoin',
          userId: hostUserId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isHost).toBe(true);
      expect(response.body.data.userId).toBe(hostUserId);
    });

    it('房主重新加入时 RoomMember 记录应被复用', async () => {
      // 获取加入前的记录ID
      const beforeMember = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: testRoomId,
            userId: hostUserId,
          },
        },
      });

      const beforeMemberId = beforeMember?.id;

      // 房主重新加入
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: 'Test Host Rejoin',
          userId: hostUserId,
        });

      expect(response.status).toBe(200);

      // 验证是同一个记录（ID相同）
      const afterMember = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: testRoomId,
            userId: hostUserId,
          },
        },
      });

      expect(afterMember?.id).toBe(beforeMemberId);
      expect(afterMember?.leftAt).toBeNull();
    });
  });

  describe('普通成员加入场景不受影响', () => {
    it('普通成员加入时不传 userId 应创建新成员，返回 isHost: false', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: 'Regular Member',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isHost).toBe(false);
      expect(response.body.data.userId).toMatch(/^user-[a-z0-9]{8}$/);
      expect(response.body.data.userId).not.toBe(hostUserId);
    });

    it('普通成员加入时传入不同的 userId 应创建新成员', async () => {
      const regularUserId = 'user-member1';

      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: 'Regular Member 2',
          userId: regularUserId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isHost).toBe(false);
      expect(response.body.data.userId).toBe(regularUserId);

      // 验证数据库中的记录
      const member = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: testRoomId,
            userId: regularUserId,
          },
        },
      });

      expect(member).toBeDefined();
      expect(member?.isHost).toBe(false);
    });

    it('普通成员加入时不应影响房主记录', async () => {
      // 确保房主记录存在且 leftAt 为 null
      await prisma.roomMember.update({
        where: {
          roomId_userId: {
            roomId: testRoomId,
            userId: hostUserId,
          },
        },
        data: {
          leftAt: null,
        },
      });

      // 普通成员加入
      await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: 'Regular Member 3',
        });

      // 验证房主记录未受影响
      const hostMember = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: testRoomId,
            userId: hostUserId,
          },
        },
      });

      expect(hostMember).toBeDefined();
      expect(hostMember?.isHost).toBe(true);
      expect(hostMember?.leftAt).toBeNull();
    });
  });

  describe('边界情况', () => {
    it('传入无效的 userId（不等于 hostId）时，应创建新成员', async () => {
      const invalidUserId = 'user-invalid';

      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: 'Invalid User',
          userId: invalidUserId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isHost).toBe(false);
      expect(response.body.data.userId).toBe(invalidUserId);
    });

    it('不传 userId 时行为不变（向后兼容）', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/join`)
        .send({
          nickname: 'Backward Compatible User',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isHost).toBe(false);
      expect(response.body.data.userId).toMatch(/^user-[a-z0-9]{8}$/);
    });
  });
});
