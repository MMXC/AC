---
backlog_id: backlog-98
task: POST /api/v1/rooms/:roomId/leave 离开房间接口
test_command: "docker compose up -d && cd watch-together-server && npm run test:api:leave"
---

# Task: POST /api/v1/rooms/:roomId/leave 离开房间接口

## Description

实现 POST /api/v1/rooms/:roomId/leave，接收 { userId }，从 RoomMember 中移除该成员或标记离开，返回 { success }。

**Test Command**: `docker compose up -d && cd watch-together-server && npm run test:api:leave`（脚本会先轮询 /health 等待 API 就绪。）

## Success Criteria

- [ ] #1 接口路径为 /api/v1/rooms/:roomId/leave
- [ ] #2 能从房间成员列表中移除或标记该用户
- [ ] #3 返回 200 与 success
- [ ] #4 房间无成员时可选择保留或清理房间
