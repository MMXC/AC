/**
 * 房间管理 API - 更新和删除房间测试
 */

import request from 'supertest';
import { createApp } from '../src/app';
import { getPrismaClient } from '../src/db';

describe('更新删除房间', () => {
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

  describe('PUT /api/v1/rooms/:roomId', () => {
    it('PUT 请求可以更新房间名称', async () => {
      // 先创建一个房间
      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'Original Room Name',
          hostNickname: 'Test Host',
        });

      const roomId = createResponse.body.data.id;

      // 更新房间名称
      const updateResponse = await request(app)
        .put(`/api/v1/rooms/${roomId}`)
        .send({
          name: 'Updated Room Name',
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body).toHaveProperty('success', true);
      expect(updateResponse.body.data.name).toBe('Updated Room Name');

      // 验证数据库中的记录已更新
      const room = await prisma.room.findUnique({
        where: { id: roomId },
      });
      expect(room?.name).toBe('Updated Room Name');
    });

    it('更新房间名称后 updatedAt 应该改变', async () => {
      // 先创建一个房间
      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'Time Test Room',
          hostNickname: 'Time Test Host',
        });

      const roomId = createResponse.body.data.id;

      // 获取原始更新时间
      const originalRoom = await prisma.room.findUnique({
        where: { id: roomId },
      });
      const originalUpdatedAt = originalRoom?.updatedAt;

      // 等待一小段时间确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 100));

      // 更新房间名称
      await request(app)
        .put(`/api/v1/rooms/${roomId}`)
        .send({
          name: 'Updated Time Test Room',
        });

      // 验证更新时间已改变
      const updatedRoom = await prisma.room.findUnique({
        where: { id: roomId },
      });
      expect(updatedRoom?.updatedAt).not.toEqual(originalUpdatedAt);
    });

    it('应该拒绝无效的房间名称（超过255字符）', async () => {
      // 先创建一个房间
      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'Test Room',
          hostNickname: 'Test Host',
        });

      const roomId = createResponse.body.data.id;

      // 尝试更新为超长名称
      const longName = 'a'.repeat(256);
      const updateResponse = await request(app)
        .put(`/api/v1/rooms/${roomId}`)
        .send({
          name: longName,
        });

      expect(updateResponse.status).toBe(400);
      expect(updateResponse.body).toHaveProperty('success', false);
      expect(updateResponse.body).toHaveProperty('error', 'Bad Request');
    });

    it('应该拒绝空的更新请求体', async () => {
      // 先创建一个房间
      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'Test Room',
          hostNickname: 'Test Host',
        });

      const roomId = createResponse.body.data.id;

      // 尝试发送空更新
      const updateResponse = await request(app)
        .put(`/api/v1/rooms/${roomId}`)
        .send({});

      expect(updateResponse.status).toBe(400);
      expect(updateResponse.body).toHaveProperty('success', false);
      expect(updateResponse.body).toHaveProperty('error', 'Bad Request');
    });

    it('应该拒绝更新不存在的房间', async () => {
      const updateResponse = await request(app)
        .put('/api/v1/rooms/room-nonexistent')
        .send({
          name: 'Updated Name',
        });

      expect(updateResponse.status).toBe(404);
      expect(updateResponse.body).toHaveProperty('success', false);
      expect(updateResponse.body).toHaveProperty('error', 'Not Found');
    });

    it('应该拒绝更新已删除的房间', async () => {
      // 先创建一个房间
      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'To Be Deleted Room',
          hostNickname: 'Delete Host',
        });

      const roomId = createResponse.body.data.id;

      // 删除房间
      await request(app).delete(`/api/v1/rooms/${roomId}`);

      // 尝试更新已删除的房间
      const updateResponse = await request(app)
        .put(`/api/v1/rooms/${roomId}`)
        .send({
          name: 'Updated Name',
        });

      expect(updateResponse.status).toBe(404);
      expect(updateResponse.body).toHaveProperty('success', false);
      expect(updateResponse.body).toHaveProperty('error', 'Not Found');
    });

    it('更新后的响应应该包含所有必需字段', async () => {
      // 先创建一个房间
      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'Complete Update Room',
          hostNickname: 'Complete Update Host',
        });

      const roomId = createResponse.body.data.id;

      // 更新房间名称
      const updateResponse = await request(app)
        .put(`/api/v1/rooms/${roomId}`)
        .send({
          name: 'Updated Complete Room',
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data).toHaveProperty('id');
      expect(updateResponse.body.data).toHaveProperty('name');
      expect(updateResponse.body.data).toHaveProperty('hostId');
      expect(updateResponse.body.data).toHaveProperty('currentUrl');
      expect(updateResponse.body.data).toHaveProperty('inviteLink');
      expect(updateResponse.body.data).toHaveProperty('createdAt');
      expect(updateResponse.body.data).toHaveProperty('updatedAt');
    });

    it('应该正确处理空字符串房间名称（转换为默认值）', async () => {
      // 先创建一个房间
      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'Original Name',
          hostNickname: 'Test Host',
        });

      const roomId = createResponse.body.data.id;

      // 更新为空字符串
      const updateResponse = await request(app)
        .put(`/api/v1/rooms/${roomId}`)
        .send({
          name: '',
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.name).toBe('未命名房间');
    });
  });

  describe('DELETE /api/v1/rooms/:roomId', () => {
    it('DELETE 请求可以软删除房间（设置 deleted_at）', async () => {
      // 先创建一个房间
      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'To Delete Room',
          hostNickname: 'Delete Host',
        });

      const roomId = createResponse.body.data.id;

      // 删除房间
      const deleteResponse = await request(app).delete(`/api/v1/rooms/${roomId}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toHaveProperty('success', true);
      expect(deleteResponse.body).toHaveProperty('message', 'Room deleted successfully');

      // 验证数据库中的 deletedAt 已设置
      const room = await prisma.room.findUnique({
        where: { id: roomId },
      });
      expect(room?.deletedAt).not.toBeNull();
      expect(room?.deletedAt).toBeInstanceOf(Date);
    });

    it('删除后的房间无法通过 GET 获取', async () => {
      // 先创建一个房间
      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'Get After Delete Room',
          hostNickname: 'Get After Delete Host',
        });

      const roomId = createResponse.body.data.id;

      // 删除房间
      await request(app).delete(`/api/v1/rooms/${roomId}`);

      // 尝试获取已删除的房间
      const getResponse = await request(app).get(`/api/v1/rooms/${roomId}`);

      expect(getResponse.status).toBe(404);
      expect(getResponse.body).toHaveProperty('success', false);
      expect(getResponse.body).toHaveProperty('error', 'Not Found');
      expect(getResponse.body).toHaveProperty('message', 'Room not found');
    });

    it('应该拒绝删除不存在的房间', async () => {
      const deleteResponse = await request(app).delete('/api/v1/rooms/room-nonexistent');

      expect(deleteResponse.status).toBe(404);
      expect(deleteResponse.body).toHaveProperty('success', false);
      expect(deleteResponse.body).toHaveProperty('error', 'Not Found');
    });

    it('应该拒绝删除已经删除的房间', async () => {
      // 先创建一个房间
      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'Already Deleted Room',
          hostNickname: 'Already Deleted Host',
        });

      const roomId = createResponse.body.data.id;

      // 第一次删除
      const firstDelete = await request(app).delete(`/api/v1/rooms/${roomId}`);
      expect(firstDelete.status).toBe(200);

      // 尝试再次删除
      const secondDelete = await request(app).delete(`/api/v1/rooms/${roomId}`);
      expect(secondDelete.status).toBe(404);
      expect(secondDelete.body).toHaveProperty('success', false);
      expect(secondDelete.body).toHaveProperty('error', 'Not Found');
    });

    it('删除房间应该返回正确的 HTTP 状态码', async () => {
      // 先创建一个房间
      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'Status Code Room',
          hostNickname: 'Status Code Host',
        });

      const roomId = createResponse.body.data.id;

      // 删除房间
      const deleteResponse = await request(app).delete(`/api/v1/rooms/${roomId}`);

      expect(deleteResponse.status).toBe(200);
    });

    it('数据库记录正确更新（deletedAt 字段）', async () => {
      // 先创建一个房间
      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'Database Update Room',
          hostNickname: 'Database Update Host',
        });

      const roomId = createResponse.body.data.id;

      // 验证删除前 deletedAt 为 null
      const beforeDelete = await prisma.room.findUnique({
        where: { id: roomId },
      });
      expect(beforeDelete?.deletedAt).toBeNull();

      // 删除房间
      await request(app).delete(`/api/v1/rooms/${roomId}`);

      // 验证删除后 deletedAt 已设置
      const afterDelete = await prisma.room.findUnique({
        where: { id: roomId },
      });
      expect(afterDelete?.deletedAt).not.toBeNull();
      expect(afterDelete?.deletedAt).toBeInstanceOf(Date);
    });

    it('删除房间不应该删除关联的成员记录', async () => {
      // 先创建一个房间
      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .send({
          name: 'Members Persist Room',
          hostNickname: 'Members Persist Host',
        });

      const roomId = createResponse.body.data.id;

      // 验证成员存在
      const membersBefore = await prisma.roomMember.findMany({
        where: { roomId: roomId },
      });
      expect(membersBefore.length).toBeGreaterThan(0);

      // 删除房间
      await request(app).delete(`/api/v1/rooms/${roomId}`);

      // 验证成员记录仍然存在（软删除不应该级联删除成员）
      const membersAfter = await prisma.roomMember.findMany({
        where: { roomId: roomId },
      });
      expect(membersAfter.length).toBe(membersBefore.length);
    });
  });
});
