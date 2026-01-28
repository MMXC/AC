# Requirement Clarifier 使用示例

## 示例 1: TypeScript CLI Todo 应用

### 初始需求
**用户**: "创建一个待办事项应用"

### 对话澄清过程

**Agent**: 
```
我来帮您澄清这个需求。

**技术栈确认**：
1. 使用什么编程语言？(TypeScript/JavaScript/Python/其他)
2. 运行环境？(CLI 命令行工具/Web 应用/桌面应用)

**功能范围确认**：
1. 需要哪些核心功能？(添加/查看/完成/删除待办事项)
2. 是否需要优先级、分类、截止日期等功能？
3. 是否需要搜索功能？

**数据存储确认**：
1. 数据如何存储？(JSON 文件/数据库/浏览器存储)
```

**用户**: "TypeScript CLI 工具，支持 add/list/done，用 JSON 文件存储"

**Agent**:
```
好的，需求已明确：
- 技术栈：TypeScript CLI
- 功能：add/list/done 命令
- 存储：JSON 文件（todos.json）

## 💡 优化建议

基于您的需求，我识别到以下可能的优化方向：

### 🎨 用户体验
1. **帮助信息** - 添加 --help 参数，显示使用说明
2. **错误提示** - 友好的错误信息，如文件不存在、格式错误等

### 🔒 代码质量
1. **TypeScript 类型检查** - 确保类型安全
2. **单元测试** - 添加测试用例确保功能正确

### 📝 文档
1. **README** - 添加使用说明文档

**是否将这些优化项添加到任务列表中？** (Y/n)
```

**用户**: "Y"

### 生成的任务列表

```json
[
  {
    "id": "task-001",
    "title": "实现 add 命令",
    "description": "实现 TypeScript CLI 的 add 命令，支持添加待办事项到 JSON 文件。\n\n**实现要点**:\n- 解析命令行参数\n- 读取现有 todos.json 文件（如果存在）\n- 添加新待办事项\n- 保存到 todos.json 文件\n- 输出确认信息",
    "test_command": "npx ts-node todo.ts add \"测试任务\" && cat todos.json | grep -q \"测试任务\"",
    "success_criteria": [
      "add 命令可以正常执行",
      "待办事项成功添加到 JSON 文件",
      "JSON 格式正确",
      "重复添加不会产生重复项",
      "输出确认信息"
    ],
    "test_cases": {
      "test_data": [
        {
          "input": "npx ts-node todo.ts add \"买牛奶\"",
          "expected_output": "已添加: 买牛奶"
        }
      ],
      "test_scenarios": [
        "添加单个待办事项",
        "添加多个待办事项",
        "添加空字符串（应该报错）"
      ]
    },
    "dependencies": []
  },
  {
    "id": "task-002",
    "title": "实现 list 命令",
    "description": "实现 TypeScript CLI 的 list 命令，显示所有待办事项。\n\n**实现要点**:\n- 读取 todos.json 文件\n- 格式化输出待办事项列表\n- 显示待办状态（已完成/未完成）\n- 处理文件不存在的情况",
    "test_command": "npx ts-node todo.ts list | grep -q \"待办事项\"",
    "success_criteria": [
      "list 命令可以正常执行",
      "正确显示所有待办事项",
      "格式清晰易读",
      "文件不存在时给出友好提示"
    ],
    "test_cases": {
      "test_scenarios": [
        "显示空列表",
        "显示单个待办事项",
        "显示多个待办事项",
        "文件不存在的情况"
      ]
    },
    "dependencies": []
  },
  {
    "id": "task-003",
    "title": "实现 done 命令",
    "description": "实现 TypeScript CLI 的 done 命令，标记待办事项为已完成。\n\n**实现要点**:\n- 解析命令行参数（待办事项 ID 或索引）\n- 更新 JSON 文件中的状态\n- 保存到文件\n- 输出确认信息",
    "test_command": "npx ts-node todo.ts add \"测试\" && npx ts-node todo.ts done 1 && cat todos.json | grep -q '\"done\": true'",
    "success_criteria": [
      "done 命令可以正常执行",
      "待办事项状态正确更新",
      "无效 ID 时给出错误提示",
      "JSON 格式保持正确"
    ],
    "test_cases": {
      "test_scenarios": [
        "标记单个待办事项为完成",
        "标记不存在的待办事项（应该报错）",
        "标记已完成的待办事项（应该提示）"
      ]
    },
    "dependencies": []
  },
  {
    "id": "task-004",
    "title": "添加 --help 参数",
    "description": "为所有命令添加 --help 参数，显示使用说明。\n\n**实现要点**:\n- 解析 --help 参数\n- 显示命令使用说明\n- 显示参数说明\n- 显示示例",
    "test_command": "npx ts-node todo.ts --help | grep -q \"使用方法\"",
    "success_criteria": [
      "--help 参数可以正常显示",
      "帮助信息包含所有命令",
      "帮助信息清晰易读",
      "包含使用示例"
    ],
    "test_cases": {
      "test_scenarios": [
        "显示主命令帮助",
        "显示子命令帮助（如 add --help）"
      ]
    },
    "dependencies": []
  },
  {
    "id": "task-005",
    "title": "完善错误处理",
    "description": "为所有命令添加完善的错误处理机制。\n\n**实现要点**:\n- 文件不存在时的处理\n- JSON 格式错误时的处理\n- 无效参数时的处理\n- 友好的错误提示信息",
    "test_command": "npx ts-node todo.ts invalid-command 2>&1 | grep -q \"错误\"",
    "success_criteria": [
      "所有错误情况都有处理",
      "错误信息清晰友好",
      "程序不会崩溃",
      "退出码正确"
    ],
    "test_cases": {
      "test_scenarios": [
        "文件不存在",
        "JSON 格式错误",
        "无效命令",
        "无效参数"
      ]
    },
    "dependencies": []
  },
  {
    "id": "task-006",
    "title": "添加 TypeScript 类型定义",
    "description": "为项目添加完整的 TypeScript 类型定义。\n\n**实现要点**:\n- 定义 Todo 接口\n- 定义命令参数类型\n- 定义函数返回类型\n- 启用严格类型检查",
    "test_command": "npx tsc --noEmit",
    "success_criteria": [
      "所有代码都有类型定义",
      "TypeScript 编译无错误",
      "类型检查通过",
      "无 any 类型（除非必要）"
    ],
    "test_cases": {
      "test_scenarios": [
        "类型检查通过",
        "类型推断正确",
        "类型错误被捕获"
      ]
    },
    "dependencies": []
  },
  {
    "id": "task-007",
    "title": "添加单元测试",
    "description": "为所有命令添加单元测试。\n\n**实现要点**:\n- 使用 Jest 或 Vitest 作为测试框架\n- 为每个命令编写测试用例\n- 测试正常情况和边界情况\n- 测试覆盖率 > 80%",
    "test_command": "npm test",
    "success_criteria": [
      "所有测试用例通过",
      "测试覆盖率 > 80%",
      "测试用例覆盖正常情况和边界情况",
      "测试运行速度快"
    ],
    "test_cases": {
      "test_scenarios": [
        "add 命令测试",
        "list 命令测试",
        "done 命令测试",
        "错误处理测试"
      ]
    },
    "dependencies": []
  },
  {
    "id": "task-008",
    "title": "编写 README 文档",
    "description": "编写项目的 README 文档。\n\n**实现要点**:\n- 项目介绍\n- 安装说明\n- 使用说明\n- 示例\n- 贡献指南",
    "test_command": "test -f README.md && grep -q \"安装\" README.md",
    "success_criteria": [
      "README.md 文件存在",
      "包含项目介绍",
      "包含安装说明",
      "包含使用示例",
      "格式清晰易读"
    ],
    "test_cases": {
      "test_scenarios": [
        "文档完整性检查",
        "链接有效性检查"
      ]
    },
    "dependencies": []
  }
]
```

## 示例 2: Web 应用 - 在线协作白板

### 初始需求
**用户**: "创建一个在线协作白板"

### 对话澄清过程

**Agent**:
```
我来帮您澄清这个需求。

**技术栈确认**：
1. 前端框架？(React/Vue/原生)
2. 后端技术？(Node.js/Python/其他)
3. 实时通信？(WebSocket/Socket.io/其他)

**功能范围确认**：
1. 核心功能：绘制、擦除、文字、形状？
2. 是否需要多人协作？
3. 是否需要保存/加载功能？
4. 是否需要用户认证？

**性能与约束确认**：
1. 预期同时在线用户数？
2. 画布大小限制？
3. 是否需要支持移动端？
```

**用户**: "React 前端，Node.js 后端，WebSocket 实时通信，支持多人协作，不需要认证"

**Agent**:
```
好的，需求已明确：
- 前端：React
- 后端：Node.js + WebSocket
- 功能：多人协作白板
- 认证：不需要

## 💡 优化建议

### 🚀 性能优化
1. **画布优化** - 使用 Canvas 或 SVG 优化绘制性能
2. **消息节流** - 限制 WebSocket 消息频率，避免性能问题

### 🎨 用户体验
1. **加载状态** - 显示连接状态和加载提示
2. **错误提示** - 连接断开时的友好提示
3. **响应式设计** - 适配不同屏幕尺寸

### 🔒 代码质量
1. **TypeScript** - 添加类型检查
2. **单元测试** - 添加测试用例
3. **错误处理** - 完善的错误处理机制

**是否将这些优化项添加到任务列表中？** (Y/n)
```

**用户**: "Y"

### 生成的任务列表（部分）

```json
[
  {
    "id": "web-001",
    "title": "创建 React 前端项目结构",
    "description": "创建 React 前端项目的基础结构。\n\n**实现要点**:\n- 初始化 React 项目\n- 配置构建工具（Vite/Webpack）\n- 设置路由（如果需要）\n- 配置 TypeScript",
    "test_command": "npm run build && test -d dist",
    "success_criteria": [
      "项目可以正常构建",
      "TypeScript 配置正确",
      "项目结构清晰"
    ],
    "dependencies": []
  },
  {
    "id": "web-002",
    "title": "实现画布绘制功能",
    "description": "实现基础的画布绘制功能。\n\n**实现要点**:\n- 使用 Canvas 或 SVG\n- 实现画笔工具\n- 实现擦除工具\n- 实现基本形状绘制",
    "test_command": "npm test -- --testNamePattern='画布绘制'",
    "success_criteria": [
      "可以在画布上绘制",
      "擦除功能正常",
      "形状绘制正确",
      "性能流畅"
    ],
    "dependencies": ["web-001"]
  },
  {
    "id": "web-003",
    "title": "实现 WebSocket 服务器",
    "description": "创建 Node.js WebSocket 服务器。\n\n**实现要点**:\n- 使用 ws 或 Socket.io\n- 处理客户端连接\n- 广播绘制事件\n- 处理断开连接",
    "test_command": "node server.js & sleep 2 && curl -I http://localhost:3000 && pkill -f server.js",
    "success_criteria": [
      "WebSocket 服务器可以启动",
      "可以处理客户端连接",
      "可以广播消息",
      "连接断开处理正确"
    ],
    "dependencies": []
  },
  {
    "id": "web-004",
    "title": "实现实时同步功能",
    "description": "实现多人协作的实时同步功能。\n\n**实现要点**:\n- 前端发送绘制事件到服务器\n- 服务器广播给所有客户端\n- 前端接收并更新画布\n- 处理消息冲突",
    "test_command": "npm test -- --testNamePattern='实时同步'",
    "success_criteria": [
      "绘制操作可以实时同步",
      "多个客户端可以同时绘制",
      "消息顺序正确",
      "无消息丢失"
    ],
    "dependencies": ["web-002", "web-003"]
  },
  {
    "id": "web-005",
    "title": "添加连接状态显示",
    "description": "添加 WebSocket 连接状态的显示。\n\n**实现要点**:\n- 显示连接状态（已连接/断开）\n- 连接断开时显示提示\n- 自动重连机制",
    "test_command": "npm test -- --testNamePattern='连接状态'",
    "success_criteria": [
      "连接状态正确显示",
      "断开时显示提示",
      "自动重连功能正常"
    ],
    "dependencies": ["web-004"]
  },
  {
    "id": "web-006",
    "title": "实现消息节流优化",
    "description": "实现 WebSocket 消息节流，优化性能。\n\n**实现要点**:\n- 限制消息发送频率\n- 批量发送消息\n- 避免消息队列堆积",
    "test_command": "npm test -- --testNamePattern='消息节流'",
    "success_criteria": [
      "消息发送频率受限",
      "性能提升明显",
      "不影响用户体验"
    ],
    "dependencies": ["web-004"]
  }
]
```

## 示例 3: API 服务

### 初始需求
**用户**: "创建一个用户管理 API"

### 对话澄清过程

**Agent**:
```
我来帮您澄清这个需求。

**技术栈确认**：
1. 后端框架？(Express/FastAPI/其他)
2. 数据库？(PostgreSQL/MySQL/MongoDB/其他)
3. 认证方式？(JWT/OAuth/其他)

**功能范围确认**：
1. 需要哪些 API？(注册/登录/查询/更新/删除)
2. 是否需要用户角色？
3. 是否需要密码重置功能？

**性能与约束确认**：
1. 预期用户规模？
2. 是否需要 API 限流？
3. 是否需要 API 文档？
```

**用户**: "Express + MongoDB，JWT 认证，支持注册/登录/查询/更新，需要 API 文档"

**Agent**:
```
好的，需求已明确：
- 后端：Express + MongoDB
- 认证：JWT
- 功能：注册/登录/查询/更新
- 文档：需要

## 💡 优化建议

### 🔒 安全性
1. **密码加密** - 使用 bcrypt 加密密码
2. **输入验证** - 使用 Joi 或 express-validator
3. **API 限流** - 防止暴力破解

### 📝 文档
1. **Swagger/OpenAPI** - 自动生成 API 文档
2. **Postman Collection** - 提供测试集合

### 🔒 代码质量
1. **TypeScript** - 添加类型检查
2. **单元测试** - 添加测试用例
3. **错误处理** - 统一错误处理中间件

**是否将这些优化项添加到任务列表中？** (Y/n)
```

## 使用技巧

1. **逐步澄清**：不要一次性问太多问题，先问最关键的问题
2. **记录用户回答**：在对话过程中记录用户的回答，避免重复询问
3. **识别隐含需求**：根据用户的回答推断可能的隐含需求
4. **优化建议要具体**：每个优化项应该有明确的实现目标和测试标准
5. **任务粒度适中**：确保任务既不过大（难以测试）也不过小（过度拆分）
