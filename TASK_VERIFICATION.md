# 权限、安全与连接稳定性校验 - 验证文档

本文档提供了完整的验证步骤，用于回归测试系统的权限校验和连接稳定性功能。

## 前置条件

1. 确保后端服务器正在运行：
   ```bash
   cd watch-together-server
   npm start
   ```

2. 确保前端应用正在运行：
   ```bash
   cd watch-together
   npm start
   ```

3. 确保数据库和 Redis 正在运行（如果使用 Docker）：
   ```bash
   docker-compose up -d postgres redis
   ```

## 验证步骤

### 1. 权限校验验证

#### 1.1 使用测试脚本验证（推荐）

运行自动化测试脚本：

```bash
cd watch-together-server
./scripts/test-security.sh
```

该脚本会：
- 创建房间（房主）
- 加入房间（普通成员）
- 测试非房主更新 URL（应返回 403）
- 测试房主更新 URL（应返回 200）
- 测试非房主设置操作来源（应返回 403）
- 测试房主设置操作来源（应返回 200）
- 测试伪造用户 ID（应返回 404）
- 测试跨房间攻击（应返回 403）

**预期结果**：所有测试通过（PASSED）

#### 1.2 手动验证（使用 curl）

##### 步骤 1: 创建房间（房主）

```bash
curl -X POST http://localhost:3001/api/v1/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "hostNickname": "测试房主",
    "url": "https://www.example.com"
  }'
```

记录返回的 `roomId` 和 `hostUserId`。

##### 步骤 2: 加入房间（普通成员）

```bash
curl -X POST http://localhost:3001/api/v1/rooms/{ROOM_ID}/join \
  -H "Content-Type: application/json" \
  -d '{
    "nickname": "测试成员"
  }'
```

记录返回的 `userId`（成员ID）。

##### 步骤 3: 测试非房主更新 URL（应被拒绝）

```bash
curl -X PUT http://localhost:3001/api/v1/rooms/{ROOM_ID}/url \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.example2.com",
    "userId": "{MEMBER_USER_ID}"
  }'
```

**预期结果**：HTTP 403 Forbidden，响应包含：
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Only host can update room URL"
}
```

##### 步骤 4: 测试房主更新 URL（应成功）

```bash
curl -X PUT http://localhost:3001/api/v1/rooms/{ROOM_ID}/url \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.example2.com",
    "userId": "{HOST_USER_ID}"
  }'
```

**预期结果**：HTTP 200 OK，响应包含更新后的房间信息。

##### 步骤 5: 测试非房主设置操作来源（应被拒绝）

```bash
curl -X POST http://localhost:3001/api/v1/rooms/{ROOM_ID}/operation-source \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "{MEMBER_USER_ID}",
    "operationSourceUserId": "{MEMBER_USER_ID}"
  }'
```

**预期结果**：HTTP 403 Forbidden，响应包含：
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Only host can set operation source"
}
```

##### 步骤 6: 测试房主设置操作来源（应成功）

```bash
curl -X POST http://localhost:3001/api/v1/rooms/{ROOM_ID}/operation-source \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "{HOST_USER_ID}",
    "operationSourceUserId": "{MEMBER_USER_ID}"
  }'
```

**预期结果**：HTTP 200 OK，响应包含更新后的操作来源信息。

##### 步骤 7: 测试伪造用户 ID（应被拒绝）

```bash
curl -X PUT http://localhost:3001/api/v1/rooms/{ROOM_ID}/url \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.example3.com",
    "userId": "user-12345678"
  }'
```

**预期结果**：HTTP 404 Not Found，响应包含：
```json
{
  "success": false,
  "error": "Not Found",
  "message": "User not found in room or has left"
}
```

### 2. WebSocket 1008 关闭码验证

#### 2.1 连接数限制测试

**目标**：验证当同一 IP 的连接数超过限制（10个）时，新连接会被拒绝并返回 1008 关闭码。

##### 步骤 1: 打开多个浏览器标签页

1. 在同一浏览器中打开 11 个标签页
2. 每个标签页都访问同一个房间（使用不同的 userId）
3. 观察第 11 个连接的行为

**预期结果**：
- 前 10 个连接成功建立
- 第 11 个连接被拒绝，WebSocket 关闭码为 1008
- 页面显示错误提示："连接失败：连接过多，请关闭多余页面后刷新"
- 不会无限重连

##### 步骤 2: 验证错误提示显示

1. 打开浏览器开发者工具（F12）
2. 查看控制台日志
3. 查看页面上的错误提示区域

**预期结果**：
- 控制台显示：`WebSocket 连接因连接数限制而关闭，停止重连`
- 页面上显示错误提示（通过 `showError` 函数或错误区域）
- 错误提示内容包含："连接过多，请关闭多余页面后刷新"

##### 步骤 3: 验证不会无限重连

1. 观察被拒绝的连接（第 11 个）
2. 等待 10 秒
3. 检查是否尝试重连

**预期结果**：
- 连接被拒绝后不会尝试重连
- 控制台不会出现重复的连接尝试日志

#### 2.2 多设备访问测试

**目标**：验证多设备同时访问同一房间时的系统行为。

##### 步骤 1: 多设备连接

1. 使用不同的设备（电脑、手机、平板）访问同一个房间
2. 每个设备使用不同的 userId
3. 观察系统行为

**预期结果**：
- 每个设备都能成功连接
- 系统行为可预期（成员列表正确更新、消息同步正常）
- 不会出现连接风暴或后端崩溃

##### 步骤 2: 多标签页访问

1. 在同一设备上打开多个标签页访问同一房间
2. 每个标签页使用不同的 userId
3. 观察系统行为

**预期结果**：
- 如果同一 IP 的连接数超过 10 个，新连接会被拒绝（1008）
- 已建立的连接正常工作
- 系统不会因为连接数过多而崩溃

### 3. 系统稳定性验证

#### 3.1 并发连接测试

**目标**：验证系统在高并发连接下的稳定性。

##### 步骤 1: 使用压力测试工具

使用 `websocat` 或类似工具创建多个并发连接：

```bash
# 安装 websocat（如果未安装）
# cargo install websocat

# 创建多个并发连接（示例：20个连接）
for i in {1..20}; do
  websocat "ws://localhost:3001/ws?roomId=room-test123&userId=user-$(printf '%08d' $i)" &
done
wait
```

**预期结果**：
- 前 10 个连接成功建立
- 后续连接被拒绝（1008）
- 系统保持稳定，不会崩溃
- 已建立的连接正常工作

#### 3.2 长时间运行测试

**目标**：验证系统在长时间运行下的稳定性。

##### 步骤 1: 长时间保持连接

1. 建立多个 WebSocket 连接
2. 保持连接 1 小时以上
3. 观察系统行为

**预期结果**：
- 连接保持稳定
- 心跳机制正常工作
- 没有内存泄漏
- 系统性能稳定

### 4. 日志验证

#### 4.1 检查后端日志

查看后端日志，确认：

1. **权限校验日志**：
   - 非房主尝试更新 URL 时记录 403 错误
   - 非房主尝试设置操作来源时记录 403 错误

2. **连接限制日志**：
   - 连接数超过限制时记录警告
   - 连接被拒绝时记录 1008 关闭码

3. **错误处理日志**：
   - 所有错误都有相应的日志记录
   - 日志包含足够的上下文信息

#### 4.2 检查前端日志

查看浏览器控制台，确认：

1. **WebSocket 连接日志**：
   - 连接建立成功
   - 连接关闭时记录关闭码和原因
   - 1008 关闭码时显示用户友好的错误提示

2. **错误提示日志**：
   - 错误提示正确显示
   - 错误信息清晰易懂

## 验证清单

- [ ] 权限校验测试脚本通过
- [ ] 非房主更新 URL 被拒绝（403）
- [ ] 房主更新 URL 成功（200）
- [ ] 非房主设置操作来源被拒绝（403）
- [ ] 房主设置操作来源成功（200）
- [ ] 伪造用户 ID 被拒绝（404）
- [ ] 跨房间攻击被拒绝（403）
- [ ] WebSocket 1008 关闭码时显示错误提示
- [ ] WebSocket 1008 关闭码时不会无限重连
- [ ] 多设备访问时系统行为可预期
- [ ] 多标签页访问时连接数限制生效
- [ ] 并发连接测试通过
- [ ] 长时间运行测试通过
- [ ] 日志记录完整

## 常见问题

### Q1: 测试脚本无法连接到服务器

**A**: 确保服务器正在运行，并检查 `API_BASE` 环境变量是否正确设置。

### Q2: WebSocket 连接总是失败

**A**: 检查：
1. WebSocket 服务器是否正在运行
2. 端口是否正确（默认 3001）
3. 防火墙设置是否允许连接

### Q3: 连接数限制不生效

**A**: 检查：
1. Redis 是否正在运行
2. Redis 连接配置是否正确
3. 后端日志中是否有 Redis 连接错误

### Q4: 错误提示不显示

**A**: 检查：
1. `showError` 函数是否已定义（在 `room.js` 中）
2. HTML 中是否有错误提示区域（`id="error"`）
3. 浏览器控制台是否有 JavaScript 错误

## 回归测试建议

1. **每次代码变更后**：运行权限校验测试脚本
2. **每次部署前**：执行完整的验证步骤
3. **定期（每周）**：执行长时间运行测试
4. **性能测试**：定期执行并发连接测试

## 相关文档

- [权限校验实现文档](./watch-together-server/docs/security.md)（如果存在）
- [WebSocket 连接管理文档](./watch-together-server/docs/websocket.md)（如果存在）
- [API 文档](./watch-together-server/docs/api.md)（如果存在）
