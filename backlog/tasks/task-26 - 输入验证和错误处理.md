---
id: TASK-26
title: 输入验证和错误处理
status: Done
assignee: []
created_date: '2026-01-26 06:38'
updated_date: '2026-01-27 07:46'
labels: []
dependencies: []
ordinal: 32000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
使用 Zod 实现所有 API 输入验证，统一错误处理中间件

**Test Command**: `npm test -- --testNamePattern='输入验证'`

**测试用例**:

**测试数据**:
1. 输入: `无效的请求数据（缺少必需字段、类型错误等）`
   预期输出: `400 错误，包含错误详情`

**测试场景**:
1. 缺少必需字段应该返回 400
2. 类型错误应该返回 400
3. 格式错误应该返回 400

**断言示例**:
1. `const response = await request(app).post('/api/v1/rooms').send({})`
2. `expect(response.status).toBe(400)`
3. `expect(response.body.success).toBe(false)`
4. `expect(response.body.error.code).toBeDefined()`

**Test Command**: `npm test -- --testNamePattern='输入验证'`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 所有 API 端点都有输入验证 Schema
- [ ] #2 无效输入返回 400 错误，格式符合规范
- [ ] #3 错误响应包含错误代码和描述
- [ ] #4 数据库错误正确捕获和转换
- [ ] #5 日志记录所有错误
<!-- AC:END -->
