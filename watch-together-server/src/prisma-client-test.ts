// 测试 Prisma Client 是否可以正常导入
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 验证 Prisma Client 已正确生成
console.log('Prisma Client 导入成功！');
console.log('可用模型:', {
  Room: prisma.room,
  RoomMember: prisma.roomMember,
  Message: prisma.message,
  RoomEvent: prisma.roomEvent,
});

export { prisma };
