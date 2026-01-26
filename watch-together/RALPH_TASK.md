---
backlog_id: backlog-8
task: 数据库 Schema 设计和 Prisma 配置
test_command: "npx prisma migrate dev --name init && npx prisma generate
npx prisma migrate dev --name init && npx prisma generate"
---

# Task: 数据库 Schema 设计和 Prisma 配置

## Description

使用 Prisma 设计数据库模型（rooms, room_members, messages, room_events），创建迁移文件
数据库创建对应的Dcokerfile 并加入docker-compose.yml中 Dockerfile创建完成后通知用户执行docker-compose 再执行后续步骤
**Test Command**: `npx prisma migrate dev --name init && npx prisma generate`

**测试用例**:

**测试数据**:
1. 输入: `Prisma schema 定义`
   预期输出: `数据库表创建成功`

**测试场景**:
1. 运行迁移后，PostgreSQL 中应该存在 4 张表
2. 表结构应该符合设计文档要求
3. 索引和外键约束应该正确创建

**断言示例**:
1. `const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'``
2. `expect(tables).toContainEqual({table_name: 'Room'})`
3. `expect(tables).toContainEqual({table_name: 'RoomMember'})`
4. `expect(tables).toContainEqual({table_name: 'Message'})`

**Test Command**: `npx prisma migrate dev --name init && npx prisma generate`

## Success Criteria

- [x] Prisma schema 文件创建完成（prisma/schema.prisma）
- [x] 定义了 4 个数据模型：Room, RoomMember, Message, RoomEvent
- [x] 所有字段类型和约束正确（主键、外键、索引等）
- [ ] 迁移文件生成成功（需要先启动数据库：`docker-compose up -d postgres`）
- [x] Prisma Client 生成成功，可以导入使用
