---
backlog_id: backlog-99
task: watch-together-server 后端接口汇总（E2E）
test_command: "docker compose up -d && cd watch-together-server && npm run test:api"
---

# Task: watch-together-server 后端接口汇总（E2E）

## Description

汇总 api-a1～api-a6，使 watch-together-server 提供完整 REST 房间接口。前端 create-room、room 等页面可正常调用 localhost:3000，创建房间、加入房间、获取房间、更新 URL、离开房间流程可端到端跑通。

**Test Command**: `docker compose up -d && cd watch-together-server && npm run test:api`（脚本会先轮询 /health 等待 API 就绪。）

## Success Criteria

- [ ] #1 POST /api/v1/rooms 创建房间成功
- [ ] #2 GET /api/v1/rooms/:roomId 获取房间成功
- [ ] #3 POST join、PUT url、POST leave 均能正常执行
- [ ] #4 前端创建房间后能跳转到 /room/:roomId 并加载房间内容
