# 创建后端任务到 Backlog

## 使用方法

### 方法 1: 使用脚本（推荐）

```bash
cd c:\project\AC
./.cursor/ralph-scripts/create-tasks-from-decomposed.sh BACKEND_TASKS_DECOMPOSED.md
```

这个脚本会：
1. 解析 `BACKEND_TASKS_DECOMPOSED.md` 文件
2. 提取所有 26 个任务
3. 显示任务列表供确认
4. 批量创建 backlog 任务

### 方法 2: 手动解析并创建

```bash
# 1. 解析任务为 JSON
python3 .cursor/ralph-scripts/parse-decomposed-tasks.py BACKEND_TASKS_DECOMPOSED.md --json > tasks.json

# 2. 查看解析结果
python3 .cursor/ralph-scripts/parse-decomposed-tasks.py BACKEND_TASKS_DECOMPOSED.md

# 3. 使用 backlog-integration.py 批量创建
python3 .cursor/ralph-scripts/backlog-integration.py create-tasks tasks.json
```

## 任务列表

文档包含 26 个任务，分为 4 个阶段：

### 阶段 1：项目基础搭建（5 个任务）
- backend-001: 项目初始化和 TypeScript 配置
- backend-002: 数据库 Schema 设计和 Prisma 配置
- backend-003: Express 服务器基础框架
- backend-004: 数据库连接和 Prisma Client 集成
- backend-005: Redis 连接和缓存服务

### 阶段 2：REST API 实现（8 个任务）
- backend-006: 房间管理 API - 创建房间
- backend-007: 房间管理 API - 获取房间信息
- backend-008: 房间管理 API - 更新和删除房间
- backend-009: 成员管理 API - 加入房间
- backend-010: 成员管理 API - 离开房间和获取成员列表
- backend-011: 消息管理 API - 发送消息
- backend-012: 消息管理 API - 获取消息历史
- backend-013: URL 同步 API

### 阶段 3：WebSocket 实时通信（6 个任务）
- backend-014: WebSocket 服务器基础框架
- backend-015: WebSocket 消息处理 - 状态同步
- backend-016: WebSocket 消息处理 - 成员加入和离开
- backend-017: WebSocket 消息处理 - 聊天消息
- backend-018: WebSocket 消息处理 - URL 同步
- backend-019: WebSocket 心跳和连接管理

### 阶段 4：优化和部署（7 个任务）
- backend-020: 输入验证和错误处理
- backend-021: 限流和防刷
- backend-022: 日志系统
- backend-023: 缓存策略优化
- backend-024: 性能测试和优化
- backend-025: Docker 容器化
- backend-026: 单元测试和集成测试

## 注意事项

1. **依赖关系**：某些任务有依赖（如 backend-003 依赖 backend-001），创建后可以手动调整顺序
2. **测试命令**：每个任务都有明确的测试命令，创建后可以直接使用
3. **成功标准**：每个任务都有 5 个明确的成功标准，将作为 Acceptance Criteria

## 创建后

创建任务后，可以：

1. **查看任务列表**：
   ```bash
   backlog task list --plain
   ```

2. **开始执行第一个任务**：
   ```bash
   ./.cursor/ralph-scripts/ralph-once.sh
   ```

3. **查看任务详情**：
   ```bash
   backlog task <task-id> --plain
   ```
