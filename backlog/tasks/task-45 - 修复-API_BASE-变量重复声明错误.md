---
id: TASK-45
title: 修复 API_BASE 变量重复声明错误
status: In Progress
assignee: []
created_date: '2026-01-27 15:49'
updated_date: '2026-01-27 15:50'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
修复 `operation-source.js` 和 `room.js` 中 `API_BASE` 变量重复声明导致的语法错误。统一使用 `window.API_BASE` 作为全局变量，各文件检查并设置，避免重复声明。

**Test Command**: `cd watch-together && npm test -- operation-source`

**测试用例**:

**测试数据**:
1. 输入: `打开房间页面，加载所有 JavaScript 文件`
   预期输出: `控制台无重复声明错误，API 请求正常`

**测试场景**:
1. 打开房间页面，检查浏览器控制台应无 `API_BASE` 重复声明错误
2. 验证 API 请求功能正常（如获取房间信息）
3. 验证操作来源相关 API 调用正常

**断言示例**:
1. `expect(typeof window.API_BASE).toBe('string')`
2. `expect(() => { const test = window.API_BASE }).not.toThrow()`

**Test Command**: `cd watch-together && npm test -- operation-source`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `operation-source.js` 中不再使用 `let API_BASE` 声明，改为使用 `window.API_BASE`
- [ ] #2 `room.js` 中统一使用 `window.API_BASE` 或检查是否已定义
- [ ] #3 浏览器控制台无 `Identifier 'API_BASE' has already been declared` 错误
- [ ] #4 两个文件都能正确访问 API_BASE 变量
- [ ] #5 API 请求功能正常工作
<!-- AC:END -->
