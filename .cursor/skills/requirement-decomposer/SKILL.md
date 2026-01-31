---
name: requirement-decomposer
description: 正交分解用户需求为可测试的原子子任务。将复杂需求拆分为独立的、可并行执行的、带有明确测试标准的单元任务。
license: MIT
---

# Requirement Decomposer

将用户需求正交分解为可测试的原子子任务，确保每个子任务都有明确的测试通过标准。

## 核心功能

1. **需求分析**：理解用户需求的完整上下文
2. **正交分解**：将需求拆分为相互独立、可并行执行的子任务
3. **测试标准定义**：为每个子任务定义明确的测试通过方式
4. **任务生成**：生成符合 backlog 格式的任务列表

## 使用场景

**Trigger**: 
- `/decompose <需求描述>` 
- "分解这个需求: <描述>"
- "将这个需求拆分为子任务: <描述>"

## 工作流程

1. **需求理解**：分析用户提供的需求描述
2. **正交分解**：识别相互独立的子任务（正交原则：任务之间无依赖）
3. **测试标准**：为每个子任务定义：
   - 测试命令
   - 成功标准（Success Criteria）
   - 验收条件
4. **生成任务列表**：输出结构化的任务列表供用户确认
5. **创建 Backlog 任务**：用户确认后，批量创建 backlog 任务

## 分解原则

### 正交性（Orthogonality）
- 子任务之间应该相互独立
- 可以并行执行，无依赖关系
- 每个子任务完成即可独立验证

### 原子性（Atomicity）
- 每个子任务应该是不可再分的单元
- 有明确的输入和输出
- 有明确的完成标准

### 可测试性（Testability）
- 每个子任务必须有明确的测试命令
- 测试结果应该是二元的（通过/失败）
- 测试应该可以自动化执行
- **测试命令必须是自包含的**：包含所有必要的前置条件（如启动服务、设置环境变量）

## 输出格式

生成的任务列表应包含：

```markdown
## 分解结果

### 任务 1: [任务标题]
- **ID**: task-id-1
- **描述**: 任务描述
- **测试命令**: `command to test`
- **成功标准**:
  1. [ ] 标准 1
  2. [ ] 标准 2
- **依赖**: 无

### 任务 2: [任务标题]
...
```

## 脚本

- `scripts/decompose_requirement.py`: 核心分解逻辑
- `scripts/validate_orthogonality.py`: 验证任务正交性
- `scripts/generate_tasks.py`: 生成 backlog 任务格式

## 最佳实践

1. **先分解后确认**：生成任务列表后，必须等待用户确认
2. **明确测试标准**：每个任务必须有可执行的测试命令
3. **避免依赖**：尽量创建可并行执行的任务
4. **粒度适中**：任务既不能太大（难以测试），也不能太小（过度拆分）
5. **自包含测试命令**：测试命令应包含所有前置条件，避免依赖外部环境配置

## 测试命令规范

### 数据库相关任务

对于需要数据库的任务，测试命令应：
- 使用 `docker compose exec` 在容器内执行（容器已有完整环境变量）
- 或使用 `docker compose up -d` 确保服务启动

**示例**：
```bash
# ❌ 错误：依赖外部 DATABASE_URL
cd watch-together-server && npx prisma db seed

# ✅ 正确：在容器内执行（有环境变量）
docker compose up -d postgres watch-together-server && docker compose exec watch-together-server npx prisma db seed

# ✅ 正确：内联环境变量
DATABASE_URL=postgresql://user:pass@localhost:5432/db npx prisma db seed
```

### API 测试任务

对于需要后端服务的任务：
```bash
# ✅ 确保服务启动后再测试
docker compose up -d && cd watch-together-server && npm run test:api
```

**生成或编写 API 测试脚本时**（如 bash 脚本里对 `localhost:3000` 发 curl）：
- 脚本**必须先等待 API 就绪**再发请求。`docker compose up -d` 只保证容器已启动，不等待应用监听端口，若立即请求会因连接被拒而失败。
- 实现方式：在脚本开头轮询健康端点（如 `$BASE/health`），每隔 2s 重试、最多约 30s，成功后再执行实际测试。
- 参考实现：`watch-together-server/scripts/test-rooms-api.sh` 中的 `wait_for_api()`。

### 前端 E2E 测试

对于浏览器测试，使用技能占位符：
```bash
# ✅ 使用 ${TASK_ID} 占位符（运行时替换）
skill:watch-together-webapp-testing ${TASK_ID}
```
