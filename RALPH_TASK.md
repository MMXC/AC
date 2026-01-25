---
task: Mock 数据和 API 模拟
backlog_id: "watch-together-002"
---
# Task: Mock 数据和 API 模拟

## Project Context

网页版一起看功能

**总体功能描述**:  
我想做一个网页版一起看功能，大致功能是中间是任意网页地址，外面是房间号及成员聊天信息。需要包含首页（创建房间并生成房间链接邀请成员），邀请成功后进入主功能界面（成员可一起操作中间共享区域，最好无需成员进行登录等操作）。

**技术栈**: Web 应用（前端 + 后端 + WebSocket）

## Tasks

## Task Description

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

## Success Criteria

1. [ ] 创建房间 API Mock 返回正确的数据结构
2. [ ] 获取房间信息 API Mock 返回房间数据和成员列表
3. [ ] WebSocket 连接 Mock 可以模拟实时消息
4. [ ] Mock 数据格式与真实 API 一致
5. [ ] 前端可以正常使用 Mock 数据进行开发
6. [ ] 可以轻松切换到真实 API

---

## Ralph Instructions

1. **Write test cases first** - Use the test cases and assertions provided above
2. Work on the next incomplete criterion (marked [ ])
3. Check off completed criteria (change [ ] to [x])
4. **Run tests after changes** - Execute the test command to verify: `npm test`
5. Commit your changes frequently
6. When ALL criteria are [x] and tests pass, output: `<ralph>COMPLETE</ralph>`
7. If stuck on the same issue 3+ times, output: `<ralph>GUTTER</ralph>`
