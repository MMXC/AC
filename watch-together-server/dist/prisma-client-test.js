"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
// 测试 Prisma Client 是否可以正常导入
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
exports.prisma = prisma;
// 验证 Prisma Client 已正确生成
console.log('Prisma Client 导入成功！');
console.log('可用模型:', {
    Room: prisma.room,
    RoomMember: prisma.roomMember,
    Message: prisma.message,
    RoomEvent: prisma.roomEvent,
});
//# sourceMappingURL=prisma-client-test.js.map