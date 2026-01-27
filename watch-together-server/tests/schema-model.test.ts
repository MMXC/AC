/**
 * Prisma Schema 数据模型测试（Room / RoomMember）
 *
 * 覆盖点：
 * - Room 表中 hostId / currentUrl / operationSourceUserId 字段存在
 * - RoomMember 表中 isHost 字段存在
 * - 字段空值策略符合设计：
 *   - hostId: NOT NULL
 *   - currentUrl: NULL
 *   - operationSourceUserId: NULL
 *   - isHost: NOT NULL
 *
 * 运行前需要：
 * 1. 启动数据库：docker-compose up -d postgres
 * 2. 运行迁移：npx prisma migrate dev --name init
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Prisma Schema 数据模型 - Room / RoomMember', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rooms 表中应该包含 hostId / currentUrl / operationSourceUserId 字段，且空值策略正确', async () => {
    const columns = await prisma.$queryRaw<
      Array<{ column_name: string; is_nullable: 'YES' | 'NO' }>
    >`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'rooms'
        AND column_name IN ('hostId', 'currentUrl', 'operationSourceUserId')
    `;

    const byName = new Map(columns.map(c => [c.column_name, c.is_nullable]));

    // hostId: 房主身份单一真源，必须非空
    expect(byName.get('hostId')).toBe('NO');

    // currentUrl: 当前共享 URL，可以为空（未设置或已清空）
    expect(byName.get('currentUrl')).toBe('YES');

    // operationSourceUserId: 可选操作来源用户 ID，可以为空（仅房主可操作时为 null）
    expect(byName.get('operationSourceUserId')).toBe('YES');
  });

  it('room_members 表中应该包含 isHost 字段，且不可为空', async () => {
    const columns = await prisma.$queryRaw<
      Array<{ column_name: string; is_nullable: 'YES' | 'NO' }>
    >`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'room_members'
        AND column_name = 'isHost'
    `;

    expect(columns).toHaveLength(1);
    expect(columns[0].column_name).toBe('isHost');
    expect(columns[0].is_nullable).toBe('NO');
  });
});

