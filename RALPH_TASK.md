---
backlog_id: backlog-97
task: PUT /api/v1/rooms/:roomId/url 更新房间 URL 接口
test_command: "docker compose up -d && cd watch-together-server && npm run test:api:url"
---

# Task: PUT /api/v1/rooms/:roomId/url 更新房间 URL 接口

## Description

实现 PUT /api/v1/rooms/:roomId/url，接收 { url, userId }，校验 userId 为房主后更新 room.currentUrl，返回 { success }。

**Test Command**: `docker compose up -d && cd watch-together-server && npm run test:api:url`（脚本会先轮询 /health 等待 API 就绪。）

## Success Criteria

- [ ] #1 接口路径为 /api/v1/rooms/:roomId/url
- [ ] #2 仅房主可更新，非房主返回 403
- [ ] #3 更新后 GET 房间能拿到最新 currentUrl
- [ ] #4 url 需为合法 http/https
