---
backlog_id: task-28
task: 日志系统
test_command: "npm test -- --testNamePattern='日志系统'"
---

# Task: 日志系统

## Description

使用 Pino 实现结构化日志，记录所有关键操作和错误

**Test Command**: `npm test -- --testNamePattern='日志系统'`

**测试用例**:

**测试数据**:
1. 输入: `API 请求和错误`
   预期输出: `日志文件包含结构化 JSON 日志`

**测试场景**:
1. API 请求应该记录日志
2. 错误应该记录 ERROR 级别日志
3. 日志应该包含时间戳和上下文

**断言示例**:
1. `const logContent = fs.readFileSync('logs/app.log', 'utf-8')`
2. `const logLines = logContent.split('\n').filter(Boolean)`
3. `const lastLog = JSON.parse(logLines[logLines.length - 1])`
4. `expect(lastLog.level).toBeDefined()`
5. `expect(lastLog.time).toBeDefined()`

**Test Command**: `npm test -- --testNamePattern='日志系统'`

## Success Criteria

- [ ] 所有日志使用 JSON 格式
- [ ] 日志级别正确（DEBUG, INFO, WARN, ERROR）
- [ ] API 请求和响应记录日志
- [ ] WebSocket 连接和消息记录日志
- [ ] 错误日志包含堆栈信息
