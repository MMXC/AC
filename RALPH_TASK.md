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

## Implementation Steps

**第一步：初始化项目结构**
1. 检查项目是否已有 package.json，如果没有则创建
2. 创建必要的目录结构（mock/, src/, 等）
3. 安装必要的依赖（如果使用 MSW，安装 msw；如果使用 Express，安装 express）

**第二步：创建 Mock 数据**
1. 定义房间数据结构（房间号、成员列表、创建时间等）
2. 创建示例房间数据（至少 2-3 个示例房间）
3. 定义 API 响应格式（与真实 API 保持一致）

**第三步：实现 API Mock**
1. 实现 POST /api/rooms - 创建房间 API Mock
2. 实现 GET /api/rooms/:roomId - 获取房间信息 API Mock
3. 确保返回的数据结构正确

**第四步：实现 WebSocket Mock**
1. 创建 WebSocket Mock 服务（可以使用 EventEmitter 或简单的模拟）
2. 实现消息广播功能
3. 实现成员加入/离开事件

**第五步：测试和文档**
1. 创建简单的测试文件验证 Mock 功能
2. 添加使用说明文档
3. 确保可以轻松切换到真实 API

## Success Criteria

1. [ ] 项目已初始化（有 package.json 和基础目录结构）
2. [ ] 创建房间 API Mock 返回正确的数据结构（POST /api/rooms）
3. [ ] 获取房间信息 API Mock 返回房间数据和成员列表（GET /api/rooms/:roomId）
4. [ ] WebSocket 连接 Mock 可以模拟实时消息（成员加入、消息发送等）
5. [ ] Mock 数据格式与真实 API 一致（数据结构匹配）
6. [ ] 有简单的测试或示例代码验证 Mock 功能
7. [ ] 有文档说明如何使用 Mock 数据

---

## Ralph Instructions

1. Work on the next incomplete criterion (marked [ ])
2. Check off completed criteria (change [ ] to [x])
3. Run tests after changes
4. Commit your changes frequently
5. When ALL criteria are [x], output: `<ralph>COMPLETE</ralph>`
6. If stuck on the same issue 3+ times, output: `<ralph>GUTTER</ralph>`
