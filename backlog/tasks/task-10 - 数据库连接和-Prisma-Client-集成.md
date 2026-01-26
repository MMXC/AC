---
id: TASK-10
title: 数据库连接和 Prisma Client 集成
status: In Progress
assignee: []
created_date: '2026-01-26 06:36'
updated_date: '2026-01-26 12:28'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
配置数据库连接，创建 Prisma Client 单例，实现连接池管理

**Test Command**: `npm test -- database-connection.test.ts`

**测试用例**:

**测试数据**:
1. 输入: `有效的 DATABASE_URL`
   预期输出: `数据库连接成功`

**测试场景**:
1. 使用有效连接字符串应该成功连接
2. 使用无效连接字符串应该抛出错误
3. 连接池应该限制最大连接数

**断言示例**:
1. `await expect(prisma.$connect()).resolves.not.toThrow()`
2. `const result = await prisma.$queryRaw`SELECT 1 as test``
3. `expect(result[0].test).toBe(1)`

**Test Command**: `npm test -- database-connection.test.ts`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 可以从环境变量读取 DATABASE_URL
- [ ] #2 Prisma Client 可以成功连接数据库
- [ ] #3 连接池配置正确（最大连接数、超时等）
- [ ] #4 数据库连接错误可以正确处理
- [ ] #5 应用关闭时正确断开数据库连接
<!-- AC:END -->
