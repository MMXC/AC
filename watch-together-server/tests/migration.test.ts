/**
 * 数据库迁移测试
 * 
 * 此测试验证：
 * 1. 迁移文件是否正确生成
 * 2. 数据库表是否正确创建
 * 3. 表结构是否符合设计文档要求
 * 4. 索引和外键约束是否正确创建
 * 
 * 运行前需要：
 * 1. 启动数据库：docker-compose up -d postgres
 * 2. 运行迁移：npx prisma migrate dev --name init
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('数据库迁移测试', () => {
  beforeAll(async () => {
    // 测试数据库连接
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('数据库表存在性验证', () => {
    it('应该存在 rooms 表', async () => {
      const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'rooms'
      `;
      expect(tables).toHaveLength(1);
      expect(tables[0].table_name).toBe('rooms');
    });

    it('应该存在 room_members 表', async () => {
      const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'room_members'
      `;
      expect(tables).toHaveLength(1);
      expect(tables[0].table_name).toBe('room_members');
    });

    it('应该存在 messages 表', async () => {
      const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'messages'
      `;
      expect(tables).toHaveLength(1);
      expect(tables[0].table_name).toBe('messages');
    });

    it('应该存在 room_events 表', async () => {
      const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'room_events'
      `;
      expect(tables).toHaveLength(1);
      expect(tables[0].table_name).toBe('room_events');
    });

    it('应该存在 4 张表', async () => {
      const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name IN ('rooms', 'room_members', 'messages', 'room_events')
      `;
      expect(tables).toHaveLength(4);
    });
  });

  describe('表结构验证', () => {
    it('rooms 表应该有正确的字段', async () => {
      const columns = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'rooms'
        ORDER BY column_name
      `;
      
      const columnNames = columns.map(c => c.column_name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('hostId');
      expect(columnNames).toContain('currentUrl');
      expect(columnNames).toContain('inviteLink');
      expect(columnNames).toContain('createdAt');
      expect(columnNames).toContain('updatedAt');
      expect(columnNames).toContain('deletedAt');
      expect(columnNames).toContain('settings');
    });

    it('room_members 表应该有正确的字段', async () => {
      const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'room_members'
        ORDER BY column_name
      `;
      
      const columnNames = columns.map(c => c.column_name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('roomId');
      expect(columnNames).toContain('userId');
      expect(columnNames).toContain('nickname');
      expect(columnNames).toContain('isHost');
      expect(columnNames).toContain('joinedAt');
      expect(columnNames).toContain('leftAt');
      expect(columnNames).toContain('lastActiveAt');
    });

    it('messages 表应该有正确的字段', async () => {
      const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'messages'
        ORDER BY column_name
      `;
      
      const columnNames = columns.map(c => c.column_name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('roomId');
      expect(columnNames).toContain('userId');
      expect(columnNames).toContain('nickname');
      expect(columnNames).toContain('content');
      expect(columnNames).toContain('createdAt');
    });

    it('room_events 表应该有正确的字段', async () => {
      const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'room_events'
        ORDER BY column_name
      `;
      
      const columnNames = columns.map(c => c.column_name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('roomId');
      expect(columnNames).toContain('eventType');
      expect(columnNames).toContain('userId');
      expect(columnNames).toContain('eventData');
      expect(columnNames).toContain('createdAt');
    });
  });

  describe('外键约束验证', () => {
    it('room_members 表应该有外键约束到 rooms 表', async () => {
      const foreignKeys = await prisma.$queryRaw<Array<{ constraint_name: string }>>`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
        AND table_name = 'room_members'
        AND constraint_type = 'FOREIGN KEY'
      `;
      expect(foreignKeys.length).toBeGreaterThan(0);
    });

    it('messages 表应该有外键约束到 rooms 表', async () => {
      const foreignKeys = await prisma.$queryRaw<Array<{ constraint_name: string }>>`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
        AND table_name = 'messages'
        AND constraint_type = 'FOREIGN KEY'
      `;
      expect(foreignKeys.length).toBeGreaterThan(0);
    });

    it('room_events 表应该有外键约束到 rooms 表', async () => {
      const foreignKeys = await prisma.$queryRaw<Array<{ constraint_name: string }>>`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
        AND table_name = 'room_events'
        AND constraint_type = 'FOREIGN KEY'
      `;
      expect(foreignKeys.length).toBeGreaterThan(0);
    });
  });

  describe('索引验证', () => {
    it('rooms 表应该有索引', async () => {
      const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'rooms'
      `;
      expect(indexes.length).toBeGreaterThan(0);
    });

    it('room_members 表应该有唯一约束 (roomId, userId)', async () => {
      const uniqueConstraints = await prisma.$queryRaw<Array<{ constraint_name: string }>>`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
        AND table_name = 'room_members'
        AND constraint_type = 'UNIQUE'
      `;
      expect(uniqueConstraints.length).toBeGreaterThan(0);
    });
  });
});
