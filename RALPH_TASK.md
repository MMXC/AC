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

**第一步：初始化项目结构（必须完成）**
1. **立即创建 package.json** - 如果项目中没有 package.json，创建一个包含基本信息的 package.json
   - 项目名称：watch-together
   - 版本：0.1.0
   - 描述：网页版一起看功能
   - 添加必要的 scripts（start, test 等）
2. **创建目录结构**：
   - 创建 `mock/` 目录用于存放 Mock 数据
   - 创建 `mock-server/` 目录用于 Mock 服务器代码
   - 创建 `src/` 目录（如果需要）
3. **安装依赖**（可选，但建议）：
   - 如果使用 MSW：`npm install --save-dev msw`
   - 如果使用 Express：`npm install express`
   - 或者先创建基础结构，依赖可以稍后安装

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

**必须按顺序完成，不能跳过任何步骤：**

1. [ ] **创建 package.json** - 项目根目录必须有 package.json 文件，包含项目基本信息
2. [ ] **创建目录结构** - 创建 mock/ 和 mock-server/ 目录
3. [ ] **创建 Mock 数据文件** - 在 mock/ 目录下创建示例房间数据（JSON 格式）
4. [ ] **实现创建房间 API Mock** - POST /api/rooms 返回正确的数据结构
5. [ ] **实现获取房间信息 API Mock** - GET /api/rooms/:roomId 返回房间数据和成员列表
6. [ ] **实现 WebSocket Mock** - 可以模拟实时消息（成员加入、消息发送等）
7. [ ] **创建测试文件** - 有简单的测试或示例代码验证 Mock 功能
8. [ ] **创建使用文档** - README 或文档说明如何使用 Mock 数据

---

## Ralph Instructions

1. Work on the next incomplete criterion (marked [ ])
2. Check off completed criteria (change [ ] to [x])
3. Run tests after changes
4. Commit your changes frequently
5. When ALL criteria are [x], output: `<ralph>COMPLETE</ralph>`
6. If stuck on the same issue 3+ times, output: `<ralph>GUTTER</ralph>`
