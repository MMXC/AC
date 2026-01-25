---
task: Mock 数据和 API 模拟
backlog_id: "watch-together-002"
test_command: "npm test -- --testNamePattern='Mock数据'"
---

# Task: Mock 数据和 API 模拟

## Project Context

**项目需求**: 网页版一起看功能

**总体功能描述**:  
我想做一个网页版一起看功能，大致功能是中间是任意网页地址，外面是房间号及成员聊天信息。需要包含首页（创建房间并生成房间链接邀请成员），邀请成功后进入主功能界面（成员可一起操作中间共享区域，最好无需成员进行登录等操作）。

**技术栈**: Web 应用（前端 + 后端 + WebSocket）

## Task Description

创建测试数据和 API Mock 服务，模拟后端返回数据，避免后端功能阻塞前端开发。

**为什么需要这个任务**:  
在开发前端功能时，如果等待后端 API 完成会阻塞开发进度。通过创建 Mock 数据和 API 模拟服务，前端可以独立开发，不依赖后端。当后端 API 完成后，可以轻松切换到真实 API。

**技术实现建议**:
- 使用 Mock Service Worker (MSW) 或类似的 Mock 工具
- 或者创建一个简单的 Express/Node.js Mock 服务器
- Mock 数据应该模拟真实的 API 响应格式
- 支持房间创建、房间信息查询、成员管理等 API
- WebSocket Mock 可以使用简单的 EventEmitter 或 Socket.io Mock

**项目结构建议**:
- 如果项目还没有初始化，先创建基础项目结构（package.json, 目录结构等）
- Mock 数据可以放在 `mock/` 或 `__mocks__/` 目录
- API Mock 服务可以放在 `mock-server/` 目录

## Success Criteria

1. [ ] 创建房间 API Mock 返回正确的数据结构
2. [ ] 获取房间信息 API Mock 返回房间数据和成员列表
3. [ ] WebSocket 连接 Mock 可以模拟实时消息
4. [ ] Mock 数据格式与真实 API 一致
5. [ ] 前端可以正常使用 Mock 数据进行开发
6. [ ] 可以轻松切换到真实 API

---

## Ralph Instructions

1. Work on the next incomplete criterion (marked [ ])
2. Check off completed criteria (change [ ] to [x])
3. Run tests after changes
4. Commit your changes frequently
5. When ALL criteria are [x], output: `<ralph>COMPLETE</ralph>`
6. If stuck on the same issue 3+ times, output: `<ralph>GUTTER</ralph>`
