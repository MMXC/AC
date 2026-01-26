/**
 * 成员管理 API - 离开房间和获取成员列表测试
 */

import request from 'supertest';
import { createApp } from '../src/app';
import { getPrismaClient } from '../src/db';

describe('成员管理', () => {
  let app: ReturnType<typeof createApp>;
  const prisma = getPrismaClient();
  let testRoomId: string;
  let testUserId1: string;
  let testUserId2: string;

  beforeAll(async () => {
    app = createApp();

    // 创建一个测试房间
    const room = await prisma.room.create({
      data: {
        id: 'room-testmembers',
        name: 'Test Members Room',
        hostId: 'user-host789',
        inviteLink: '/room/room-testmembers',
      },
    });

    testRoomId = room.id;

    // 创建房主成员
    await prisma.roomMember.create({
      data: {
        roomId: room.id,
        userId: 'user-host789',
        nickname: 'Test Host',
        isHost: true,
      },
    });

    // 创建几个测试成员
    const member1 = await prisma.roomMember.create({
      data: {
        roomId: room.id,
        userId: 'user-member001',
        nickname: 'Member 1',
        isHost: false,
      },
    });

    const member2 = await prisma.roomMember.create({
      data: {
        roomId: room.id,
        userId: 'user-member002',
        nickname: 'Member 2',
        isHost: false,
      },
    });

    testUserId1 = member1.userId;
    testUserId2 = member2.userId;
  });

  afterAll(async () => {
    // 清理测试数据
    try {
      await prisma.roomMember.deleteMany({
        where: {
          room: {
            id: {
              in: ['room-testmembers', 'room-nonexist', 'room-deleted'],
            },
          },
        },
      });
      await prisma.room.deleteMany({
        where: {
          id: {
            in: ['room-testmembers', 'room-nonexist', 'room-deleted'],
          },
        },
      });
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
  });

  describe('POST /api/v1/rooms/:roomId/leave', () => {
    it('应该返回 200 状态码', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/leave`)
        .send({
          userId: testUserId1,
        });

      expect(response.status).toBe(200);
    });

    it('应该返回正确的响应格式', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/leave`)
        .send({
          userId: testUserId2,
        });

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Member left room successfully');
    });

    it('应该更新数据库中的 leftAt 字段', async () => {
      // 先创建一个新成员用于测试
      const newMember = await prisma.roomMember.create({
        data: {
          roomId: testRoomId,
          userId: 'user-leavetest',
          nickname: 'Leave Test Member',
          isHost: false,
        },
      });

      // 调用离开接口
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/leave`)
        .send({
          userId: newMember.userId,
        });

      expect(response.status).toBe(200);

      // 验证数据库中的 leftAt 字段已设置
      const updatedMember = await prisma.roomMember.findUnique({
        where: {
          id: newMember.id,
        },
      });

      expect(updatedMember).toBeDefined();
      expect(updatedMember?.leftAt).not.toBeNull();
      expect(updatedMember?.leftAt).toBeInstanceOf(Date);
    });

    it('如果房间不存在应该返回 404', async () => {
      const response = await request(app)
        .post('/api/v1/rooms/room-nonexist/leave')
        .send({
          userId: 'user-test',
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Not Found');
      expect(response.body).toHaveProperty('message', 'Room not found');
    });

    it('如果成员不存在应该返回 404', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/leave`)
        .send({
          userId: 'user-nonexist',
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Not Found');
      expect(response.body).toHaveProperty('message', 'Member not found or already left');
    });

    it('如果成员已经离开应该返回 404', async () => {
      // 创建一个已离开的成员
      const leftMember = await prisma.roomMember.create({
        data: {
          roomId: testRoomId,
          userId: 'user-alreadyleft',
          nickname: 'Already Left Member',
          isHost: false,
          leftAt: new Date(),
        },
      });

      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/leave`)
        .send({
          userId: leftMember.userId,
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Not Found');
      expect(response.body).toHaveProperty('message', 'Member not found or already left');

      // 清理
      await prisma.roomMember.delete({
        where: { id: leftMember.id },
      });
    });

    it('应该拒绝缺少 userId 的请求', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/leave`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Bad Request');
    });

    it('应该拒绝空的 userId', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/${testRoomId}/leave`)
        .send({
          userId: '',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('应该拒绝无效的 roomId 格式', async () => {
      const response = await request(app)
        .post('/api/v1/rooms/ /leave')
        .send({
          userId: 'user-test',
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
          hostId: 'user-host999',
          inviteLink: '/room/room-deleted',
          deletedAt: new Date(),
        },
      });

      const response = await request(app)
        .post(`/api/v1/rooms/${deletedRoom.id}/leave`)
        .send({
          userId: 'user-test',
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Not Found');

      // 清理
      await prisma.room.delete({
        where: { id: deletedRoom.id },
      });
    });
  });

  describe('GET /api/v1/rooms/:roomId/members', () => {
    it('应该返回 200 状态码', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/members`);

      expect(response.status).toBe(200);
    });

    it('应该返回正确的响应格式', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/members`);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('members');
      expect(response.body.data).toHaveProperty('memberCount');
      expect(Array.isArray(response.body.data.members)).toBe(true);
      expect(typeof response.body.data.memberCount).toBe('number');
    });

    it('应该返回所有未离开的成员', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/members`);

      // 应该包含房主和未离开的成员
      expect(response.body.data.members.length).toBeGreaterThan(0);
      expect(response.body.data.memberCount).toBe(response.body.data.members.length);

      // 验证每个成员都有必需的字段
      response.body.data.members.forEach((member: any) => {
        expect(member).toHaveProperty('userId');
        expect(member).toHaveProperty('nickname');
        expect(member).toHaveProperty('isHost');
        expect(member).toHaveProperty('joinedAt');
        expect(member).toHaveProperty('lastActiveAt');
      });
    });

    it('成员列表应该按加入时间排序（升序）', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/members`);

      const members = response.body.data.members;
      if (members.length > 1) {
        for (let i = 1; i < members.length; i++) {
          const prevJoinedAt = new Date(members[i - 1].joinedAt).getTime();
          const currJoinedAt = new Date(members[i].joinedAt).getTime();
          expect(currJoinedAt).toBeGreaterThanOrEqual(prevJoinedAt);
        }
      }
    });

    it('不应该返回已离开的成员', async () => {
      // 创建一个成员并让其离开
      const leaveMember = await prisma.roomMember.create({
        data: {
          roomId: testRoomId,
          userId: 'user-leavemember',
          nickname: 'Leave Member',
          isHost: false,
        },
      });

      // 让成员离开
      await request(app)
        .post(`/api/v1/rooms/${testRoomId}/leave`)
        .send({
          userId: leaveMember.userId,
        });

      // 获取成员列表
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/members`);

      // 验证已离开的成员不在列表中
      const memberIds = response.body.data.members.map((m: any) => m.userId);
      expect(memberIds).not.toContain(leaveMember.userId);
    });

    it('应该包含房主在成员列表中', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/members`);

      const hostMember = response.body.data.members.find((m: any) => m.isHost === true);
      expect(hostMember).toBeDefined();
      expect(hostMember.userId).toBe('user-host789');
      expect(hostMember.nickname).toBe('Test Host');
    });

    it('应该返回有效的 ISO 格式时间戳', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/members`);

      response.body.data.members.forEach((member: any) => {
        expect(() => new Date(member.joinedAt)).not.toThrow();
        expect(() => new Date(member.lastActiveAt)).not.toThrow();
        expect(new Date(member.joinedAt).toISOString()).toBe(member.joinedAt);
        expect(new Date(member.lastActiveAt).toISOString()).toBe(member.lastActiveAt);
      });
    });

    it('如果房间不存在应该返回 404', async () => {
      const response = await request(app).get('/api/v1/rooms/room-nonexist/members');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Not Found');
      expect(response.body).toHaveProperty('message', 'Room not found');
    });

    it('应该拒绝无效的 roomId 格式', async () => {
      const response = await request(app).get('/api/v1/rooms/ /members');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Bad Request');
    });

    it('如果房间已删除应该返回 404', async () => {
      // 创建一个已删除的房间
      const deletedRoom = await prisma.room.create({
        data: {
          id: 'room-deleted',
          name: 'Deleted Room',
          hostId: 'user-host888',
          inviteLink: '/room/room-deleted',
          deletedAt: new Date(),
        },
      });

      const response = await request(app).get(`/api/v1/rooms/${deletedRoom.id}/members`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Not Found');

      // 清理
      await prisma.room.delete({
        where: { id: deletedRoom.id },
      });
    });

    it('memberCount 应该等于 members 数组的长度', async () => {
      const response = await request(app).get(`/api/v1/rooms/${testRoomId}/members`);

      expect(response.body.data.memberCount).toBe(response.body.data.members.length);
    });
  });
});
