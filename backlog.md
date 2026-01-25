# Backlog

## Project Overview

**项目需求**: 网页版一起看功能

**总体功能描述**:  
我想做一个网页版一起看功能，大致功能是中间是任意网页地址，外面是房间号及成员聊天信息。需要包含首页（创建房间并生成房间链接邀请成员），邀请成功后进入主功能界面（成员可一起操作中间共享区域，最好无需成员进行登录等操作）。

**技术栈**: Web 应用（前端 + 后端 + WebSocket）

## Tasks

### [ ] Build CLI Todo App (TypeScript)

**ID**: todo-app-typescript  
**Status**: To Do

**Description**:  
Build a simple command-line todo application in TypeScript.

**Requirements**:
- Single file: `todo.ts`
- Uses `todos.json` for persistence
- Three commands: add, list, done
- TypeScript with proper types

**Success Criteria**:
1. [ ] `npx ts-node todo.ts add "Buy milk"` adds a todo and confirms
2. [ ] `npx ts-node todo.ts list` shows all todos with IDs and status
3. [ ] `npx ts-node todo.ts done 1` marks todo 1 as complete
4. [ ] Todos survive script restart (JSON persistence)
5. [ ] Invalid commands show helpful usage message
6. [ ] Code has proper TypeScript types (no `any`)

**Test Command**: `npx ts-node todo.ts list`

---

### [ ] Mock 数据和 API 模拟

**ID**: watch-together-002  
**Status**: In Progress

**Description**:  
创建测试数据和 API Mock 服务，模拟后端返回数据，避免后端功能阻塞前端开发

**Test Command**: `npm test -- --testNamePattern='Mock数据'`

**Success Criteria**:
1. [ ] 创建房间 API Mock 返回正确的数据结构
2. [ ] 获取房间信息 API Mock 返回房间数据和成员列表
3. [ ] WebSocket 连接 Mock 可以模拟实时消息
4. [ ] Mock 数据格式与真实 API 一致
5. [ ] 前端可以正常使用 Mock 数据进行开发
6. [ ] 可以轻松切换到真实 API

---

### [ ] 创建首页 - 房间创建功能

**ID**: watch-together-001  
**Status**: To Do

**Description**:  
实现首页，包含创建房间功能，生成唯一房间号和房间链接

**Test Command**: `npm test -- --testNamePattern='首页创建房间'`

**Success Criteria**:
1. [ ] 首页可以正常访问
2. [ ] 点击创建房间按钮可以创建新房间
3. [ ] 生成唯一的房间号
4. [ ] 生成可分享的房间链接
5. [ ] 房间链接格式正确

**Dependencies**: watch-together-002

---

### [ ] 房间页面布局 - 共享浏览区域

**ID**: watch-together-003  
**Status**: To Do

**Description**:  
实现房间主界面，中间显示共享的网页地址（iframe），支持加载任意网页

**Test Command**: `npm test -- --testNamePattern='共享浏览区域'`

**Success Criteria**:
1. [ ] 房间页面可以正常加载
2. [ ] 中间区域显示 iframe
3. [ ] 可以通过 URL 参数加载指定网页
4. [ ] iframe 可以正常显示外部网页
5. [ ] 支持常见网站的加载

**Dependencies**: watch-together-002

---

### [ ] 房间页面布局 - 侧边栏信息

**ID**: watch-together-004  
**Status**: To Do

**Description**:  
实现房间页面侧边栏，显示房间号和成员列表

**Test Command**: `npm test -- --testNamePattern='侧边栏信息'`

**Success Criteria**:
1. [ ] 侧边栏正确显示房间号
2. [ ] 侧边栏显示当前成员列表
3. [ ] 新成员加入时列表自动更新
4. [ ] 成员离开时列表自动更新
5. [ ] UI 布局合理美观

**Dependencies**: watch-together-002

---

### [ ] 实时聊天功能

**ID**: watch-together-005  
**Status**: To Do

**Description**:  
实现房间内的实时聊天功能，成员可以发送消息

**Test Command**: `npm test -- --testNamePattern='实时聊天'`

**Success Criteria**:
1. [ ] 聊天界面可以正常显示
2. [ ] 可以发送消息
3. [ ] 消息实时同步给所有成员
4. [ ] 消息显示发送者信息
5. [ ] 消息历史记录正确保存

**Dependencies**: watch-together-002

---

### [ ] WebSocket 实时通信服务

**ID**: watch-together-006  
**Status**: To Do

**Description**:  
实现 WebSocket 服务器，支持房间内成员实时通信（聊天、操作同步）

**Test Command**: `npm test -- --testNamePattern='WebSocket服务'`

**Success Criteria**:
1. [ ] WebSocket 服务器可以正常启动
2. [ ] 客户端可以成功连接
3. [ ] 支持房间分组通信
4. [ ] 消息可以正确广播给房间内所有成员
5. [ ] 连接断开时正确处理

---

### [ ] 共享区域操作同步

**ID**: watch-together-007  
**Status**: To Do

**Description**:  
实现共享浏览区域的操作同步，成员的操作（滚动、点击等）同步给其他成员

**Test Command**: `npm test -- --testNamePattern='操作同步'`

**Success Criteria**:
1. [ ] 可以捕获 iframe 内的操作事件
2. [ ] 操作事件可以发送到服务器
3. [ ] 操作可以同步给其他成员
4. [ ] 滚动位置可以同步
5. [ ] URL 变化可以同步

**Dependencies**: watch-together-006

---

### [ ] 无登录加入房间功能

**ID**: watch-together-008  
**Status**: To Do

**Description**:  
实现通过房间链接直接加入房间，无需登录注册，自动分配临时昵称

**Test Command**: `npm test -- --testNamePattern='无登录加入'`

**Success Criteria**:
1. [ ] 通过房间链接可以访问房间
2. [ ] 无需登录即可加入
3. [ ] 自动分配临时昵称或使用访客身份
4. [ ] 可以正常使用所有功能
5. [ ] 离开后可以重新加入

---

### [ ] 房间路由和导航

**ID**: watch-together-009  
**Status**: To Do

**Description**:  
实现前端路由，支持首页和房间页面的导航，处理房间链接参数

**Test Command**: `npm test -- --testNamePattern='路由导航'`

**Success Criteria**:
1. [ ] 首页路由 / 可以正常访问
2. [ ] 房间路由 /room/:roomId 可以正常访问
3. [ ] 通过房间链接可以正确跳转到房间页面
4. [ ] URL 参数可以正确解析
5. [ ] 无效房间号显示错误提示

---

### [ ] 后端房间管理 API

**ID**: watch-together-011  
**Status**: To Do

**Description**:  
实现后端房间管理 API，包括创建房间、获取房间信息、房间成员管理

**Test Command**: `npm test -- --testNamePattern='房间管理API'`

**Success Criteria**:
1. [ ] POST /api/rooms 可以创建房间
2. [ ] GET /api/rooms/:roomId 可以获取房间信息
3. [ ] 房间信息包含房间号、成员列表
4. [ ] API 返回正确的状态码和数据结构
5. [ ] API 接口与 Mock 数据格式一致

**Dependencies**: watch-together-002

---

### [ ] 数据持久化（可选）

**ID**: watch-together-010  
**Status**: To Do

**Description**:  
实现房间和聊天记录的持久化存储，支持房间历史记录查询

**Test Command**: `npm test -- --testNamePattern='数据持久化'`

**Success Criteria**:
1. [ ] 房间信息可以保存到数据库
2. [ ] 聊天记录可以保存
3. [ ] 可以查询历史聊天记录
4. [ ] 数据可以正确恢复
5. [ ] 支持数据清理策略

---
