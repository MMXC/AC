/**
 * 房间管理 API - 获取房间信息测试
 */

import request from 'supertest';
import { createApp } from '../src/app';
import { getPrismaClient } from '../src/db';

describe('获取房间信息', () => {
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

  describe('GET /api/v1/rooms/:roomId', () => {
    it('GET 请求可以成功获取存在的房间', async () => {
      // 先创建一个房间
      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'Test Room',
          hostNickname: 'Test Host',
        });

      const roomId = createResponse.body.data.id;

      // 获取房间信息
      const response = await request(app).get(`/api/v1/rooms/${roomId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('返回 404 当房间不存在时', async () => {
      const response = await request(app).get('/api/v1/rooms/room-nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Not Found');
      expect(response.body).toHaveProperty('message', 'Room not found');
    });

    it('返回的房间信息包含所有必需字段', async () => {
      // 先创建一个房间
      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'Complete Room',
          hostNickname: 'Complete Host',
        });

      const roomId = createResponse.body.data.id;

      // 获取房间信息
      const response = await request(app).get(`/api/v1/rooms/${roomId}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('hostId');
      expect(response.body.data).toHaveProperty('currentUrl');
      expect(response.body.data).toHaveProperty('inviteLink');
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('updatedAt');
      expect(response.body.data).toHaveProperty('members');
      expect(response.body.data).toHaveProperty('memberCount');
    });

    it('成员列表正确包含在响应中', async () => {
      // 先创建一个房间
      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'Members Room',
          hostNickname: 'Members Host',
        });

      const roomId = createResponse.body.data.id;
      const hostId = createResponse.body.data.hostId;

      // 获取房间信息
      const response = await request(app).get(`/api/v1/rooms/${roomId}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data.members)).toBe(true);
      expect(response.body.data.members.length).toBeGreaterThan(0);

      // 验证房主在成员列表中
      const hostMember = response.body.data.members.find(
        (m: { userId: string }) => m.userId === hostId
      );
      expect(hostMember).toBeDefined();
      expect(hostMember.isHost).toBe(true);
    });

    it('响应格式符合 API 规范', async () => {
      // 先创建一个房间
      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'Format Room',
          hostNickname: 'Format Host',
        });

      const roomId = createResponse.body.data.id;

      // 获取房间信息
      const response = await request(app).get(`/api/v1/rooms/${roomId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');

      // 验证成员对象格式
      if (response.body.data.members.length > 0) {
        const member = response.body.data.members[0];
        expect(member).toHaveProperty('userId');
        expect(member).toHaveProperty('nickname');
        expect(member).toHaveProperty('isHost');
        expect(member).toHaveProperty('joinedAt');
        expect(member).toHaveProperty('lastActiveAt');
      }
    });

    it('memberCount 应该等于成员列表的长度', async () => {
      // 先创建一个房间
      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'Count Room',
          hostNickname: 'Count Host',
        });

      const roomId = createResponse.body.data.id;

      // 获取房间信息
      const response = await request(app).get(`/api/v1/rooms/${roomId}`);

      expect(response.status).toBe(200);
      expect(response.body.data.memberCount).toBe(response.body.data.members.length);
    });

    it('应该返回正确的房间名称', async () => {
      // 先创建一个房间
      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'Name Test Room',
          hostNickname: 'Name Test Host',
        });

      const roomId = createResponse.body.data.id;

      // 获取房间信息
      const response = await request(app).get(`/api/v1/rooms/${roomId}`);

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Name Test Room');
    });

    it('应该返回正确的房主 ID', async () => {
      // 先创建一个房间
      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'Host ID Room',
          hostNickname: 'Host ID Host',
        });

      const roomId = createResponse.body.data.id;
      const expectedHostId = createResponse.body.data.hostId;

      // 获取房间信息
      const response = await request(app).get(`/api/v1/rooms/${roomId}`);

      expect(response.status).toBe(200);
      expect(response.body.data.hostId).toBe(expectedHostId);
    });

    it('应该返回有效的 ISO 格式时间戳', async () => {
      // 先创建一个房间
      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'Timestamp Room',
          hostNickname: 'Timestamp Host',
        });

      const roomId = createResponse.body.data.id;

      // 获取房间信息
      const response = await request(app).get(`/api/v1/rooms/${roomId}`);

      expect(response.status).toBe(200);
      const createdAt = response.body.data.createdAt;
      const updatedAt = response.body.data.updatedAt;

      expect(() => new Date(createdAt)).not.toThrow();
      expect(() => new Date(updatedAt)).not.toThrow();
      expect(new Date(createdAt).toISOString()).toBe(createdAt);
      expect(new Date(updatedAt).toISOString()).toBe(updatedAt);
    });

    it('成员列表中的时间戳应该是有效的 ISO 格式', async () => {
      // 先创建一个房间
      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'Member Timestamp Room',
          hostNickname: 'Member Timestamp Host',
        });

      const roomId = createResponse.body.data.id;

      // 获取房间信息
      const response = await request(app).get(`/api/v1/rooms/${roomId}`);

      expect(response.status).toBe(200);
      if (response.body.data.members.length > 0) {
        const member = response.body.data.members[0];
        expect(() => new Date(member.joinedAt)).not.toThrow();
        expect(() => new Date(member.lastActiveAt)).not.toThrow();
        expect(new Date(member.joinedAt).toISOString()).toBe(member.joinedAt);
        expect(new Date(member.lastActiveAt).toISOString()).toBe(member.lastActiveAt);
      }
    });

    it('应该拒绝空的 roomId', async () => {
      const response = await request(app).get('/api/v1/rooms/');

      // Express 路由可能返回 404 或 400，取决于路由配置
      // 这里我们期望至少不是 200
      expect(response.status).not.toBe(200);
    });

    it('应该正确处理包含空格的 roomId', async () => {
      const response = await request(app).get('/api/v1/rooms/room-123 456');

      // 应该返回 404（因为房间不存在）或 400（如果验证失败）
      expect([400, 404]).toContain(response.status);
    });

    it('应该返回正确的邀请链接', async () => {
      // 先创建一个房间
      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'Invite Link Room',
          hostNickname: 'Invite Link Host',
        });

      const roomId = createResponse.body.data.id;

      // 获取房间信息
      const response = await request(app).get(`/api/v1/rooms/${roomId}`);

      expect(response.status).toBe(200);
      expect(response.body.data.inviteLink).toBe(`/room/${roomId}`);
    });

    it('成员列表应该按加入时间排序（最早加入的在前）', async () => {
      // 先创建一个房间
      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'Sorted Members Room',
          hostNickname: 'Sorted Members Host',
        });

      const roomId = createResponse.body.data.id;

      // 获取房间信息
      const response = await request(app).get(`/api/v1/rooms/${roomId}`);

      expect(response.status).toBe(200);
      if (response.body.data.members.length > 1) {
        const members = response.body.data.members;
        for (let i = 1; i < members.length; i++) {
          const prevJoinedAt = new Date(members[i - 1].joinedAt).getTime();
          const currJoinedAt = new Date(members[i].joinedAt).getTime();
          expect(currJoinedAt).toBeGreaterThanOrEqual(prevJoinedAt);
        }
      }
    });

    it('应该只返回未离开的成员', async () => {
      // 先创建一个房间
      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'Active Members Room',
          hostNickname: 'Active Members Host',
        });

      const roomId = createResponse.body.data.id;
      const hostId = createResponse.body.data.hostId;

      // 手动添加一个已离开的成员（通过数据库）
      const prisma = getPrismaClient();
      const leftUserId = 'user-left123';
      await prisma.roomMember.create({
        data: {
          roomId: roomId,
          userId: leftUserId,
          nickname: 'Left Member',
          isHost: false,
          leftAt: new Date(), // 标记为已离开
        },
      });

      // 获取房间信息
      const response = await request(app).get(`/api/v1/rooms/${roomId}`);

      expect(response.status).toBe(200);
      // 应该只包含房主，不包含已离开的成员
      expect(response.body.data.members.length).toBe(1);
      expect(response.body.data.members[0].userId).toBe(hostId);
      expect(response.body.data.memberCount).toBe(1);

      // 清理测试数据
      await prisma.roomMember.delete({
        where: {
          roomId_userId: {
            roomId: roomId,
            userId: leftUserId,
          },
        },
      });
    });
  });
});
