# Requirement Clarifier 参考文档

## 任务 JSON 格式详细说明

### 完整示例

```json
[
  {
    "id": "task-001",
    "title": "实现 add 命令",
    "description": "实现 TypeScript CLI 的 add 命令，支持添加待办事项到 JSON 文件。\n\n**实现要点**:\n- 解析命令行参数\n- 读取现有 JSON 文件\n- 添加新待办事项\n- 保存到文件",
    "test_command": "npx ts-node todo.ts add \"测试任务\" && cat todos.json | grep -q \"测试任务\"",
    "success_criteria": [
      "add 命令可以正常执行",
      "待办事项成功添加到 JSON 文件",
      "JSON 格式正确",
      "重复添加不会产生重复项"
    ],
    "test_cases": {
      "test_data": [
        {
          "input": "npx ts-node todo.ts add \"买牛奶\"",
          "expected_output": "已添加: 买牛奶"
        },
        {
          "input": "npx ts-node todo.ts add \"写文档\"",
          "expected_output": "已添加: 写文档"
        }
      ],
      "test_scenarios": [
        "添加单个待办事项",
        "添加多个待办事项",
        "添加空字符串（应该报错）",
        "添加已存在的待办事项（应该提示）"
      ],
      "assertions": [
        "todos.json 文件存在",
        "JSON 格式有效",
        "新添加的待办事项在列表中"
      ]
    },
    "dependencies": []
  }
]
```

## 澄清问题模板

### 技术栈相关

```markdown
**技术栈确认**：
1. 编程语言：TypeScript / JavaScript / Python / Rust / Go / 其他？
2. 运行环境：Node.js / 浏览器 / 桌面应用 / 移动应用？
3. 框架/库：React / Vue / Express / FastAPI / 其他？
4. 构建工具：Webpack / Vite / Rollup / 其他？
```

### 功能范围相关

```markdown
**功能范围确认**：
1. 核心功能有哪些？（必须实现）
2. 可选功能有哪些？（可以后续添加）
3. 有哪些边界情况需要处理？
4. 是否需要支持多种输入/输出格式？
```

### 性能与约束相关

```markdown
**性能与约束确认**：
1. 预期的用户规模？（个人使用 / 小团队 / 大规模）
2. 数据量级？（KB / MB / GB）
3. 响应时间要求？（实时 / <1s / <5s）
4. 并发要求？（单用户 / 多用户 / 高并发）
5. 兼容性要求？（浏览器版本 / Node.js 版本）
```

### 用户体验相关

```markdown
**用户体验确认**：
1. 目标用户是谁？（开发者 / 普通用户 / 企业用户）
2. 使用场景？（日常工具 / 专业工具 / 演示项目）
3. 是否需要支持移动端？
4. 错误提示需要多详细？
5. 是否需要多语言支持？
```

### 数据存储相关

```markdown
**数据存储确认**：
1. 数据是否需要持久化？
2. 存储方式：文件 / 数据库 / 云存储？
3. 数据格式：JSON / YAML / CSV / 数据库表？
4. 是否需要数据迁移/导入导出功能？
```

## 优化方向识别模板

### 性能优化

- **缓存机制**：减少重复计算或请求
- **懒加载**：按需加载资源
- **代码分割**：减少初始加载时间
- **数据库优化**：索引、查询优化
- **CDN/静态资源**：加速资源加载

### 用户体验优化

- **加载状态**：显示加载进度或状态
- **错误提示**：友好的错误信息
- **响应式设计**：适配不同屏幕尺寸
- **无障碍支持**：ARIA 标签、键盘导航
- **动画过渡**：提升交互体验

### 代码质量优化

- **类型检查**：TypeScript / 类型注解
- **单元测试**：测试覆盖率
- **代码规范**：ESLint / Prettier
- **文档**：README / API 文档 / 注释
- **错误处理**：完善的异常处理

### 安全性优化

- **输入验证**：防止恶意输入
- **身份认证**：用户认证机制
- **数据加密**：敏感数据加密
- **XSS/CSRF 防护**：Web 安全防护
- **权限控制**：访问权限管理

### 可维护性优化

- **模块化设计**：代码组织
- **配置管理**：环境变量、配置文件
- **日志记录**：调试和监控
- **错误处理**：统一错误处理机制
- **代码复用**：提取公共逻辑

### 可扩展性优化

- **插件系统**：支持插件扩展
- **API 设计**：RESTful / GraphQL
- **架构模式**：MVC / MVVM / 微服务
- **配置化**：通过配置而非代码扩展

## 任务生成模板

### CLI 工具任务模板

```json
{
  "id": "cli-{index:03d}",
  "title": "实现 {command} 命令",
  "description": "实现 {command} 命令的完整功能。\n\n**实现要点**:\n- 解析命令行参数\n- 实现核心逻辑\n- 输出结果\n- 错误处理",
  "test_command": "{test_command}",
  "success_criteria": [
    "{command} 命令可以正常执行",
    "参数解析正确",
    "输出格式正确",
    "错误处理完善"
  ],
  "test_cases": {
    "test_data": [
      {
        "input": "{example_input}",
        "expected_output": "{example_output}"
      }
    ],
    "test_scenarios": [
      "正常使用场景",
      "边界情况",
      "错误情况"
    ]
  },
  "dependencies": []
}
```

### Web 应用任务模板

```json
{
  "id": "web-{index:03d}",
  "title": "实现 {feature} 功能",
  "description": "实现 {feature} 的完整功能。\n\n**实现要点**:\n- 前端界面\n- 后端 API\n- 数据存储\n- 错误处理",
  "test_command": "npm test -- --testNamePattern='{feature}'",
  "success_criteria": [
    "功能按预期工作",
    "界面显示正确",
    "API 返回正确数据",
    "错误处理完善"
  ],
  "test_cases": {
    "test_scenarios": [
      "正常使用流程",
      "边界情况",
      "错误情况"
    ]
  },
  "dependencies": []
}
```

### API 任务模板

```json
{
  "id": "api-{index:03d}",
  "title": "实现 {endpoint} API",
  "description": "实现 {endpoint} API 端点。\n\n**实现要点**:\n- 路由定义\n- 请求验证\n- 业务逻辑\n- 响应格式化",
  "test_command": "curl -X {method} http://localhost:3000{endpoint} | jq .",
  "success_criteria": [
    "API 端点可以访问",
    "返回正确的状态码",
    "返回数据格式正确",
    "错误处理完善"
  ],
  "test_cases": {
    "test_data": [
      {
        "input": "{example_request}",
        "expected_output": "{example_response}"
      }
    ]
  },
  "dependencies": []
}
```

## 对话流程示例

### 示例 1: CLI 工具

**用户**: "创建一个待办事项 CLI 工具"

**Agent**: 
```
我来帮您澄清这个需求。

**技术栈确认**：
1. 使用什么语言？(TypeScript/JavaScript/Python/其他)
2. 是否需要 TypeScript 类型检查？

**功能范围确认**：
1. 需要哪些命令？(add/list/done/delete/其他)
2. 是否需要优先级、分类、截止日期等功能？
3. 是否需要搜索功能？

**数据存储确认**：
1. 数据如何存储？(JSON 文件/数据库/其他)
2. 文件位置？(当前目录/用户目录/其他)
```

**用户**: "TypeScript，add/list/done，JSON 文件存储"

**Agent**:
```
好的，需求已明确：
- 技术栈：TypeScript CLI
- 功能：add/list/done 命令
- 存储：JSON 文件（todos.json）

## 💡 优化建议

### 🎨 用户体验
1. **帮助信息** - 添加 --help 参数
2. **错误提示** - 友好的错误信息

### 🔒 代码质量
1. **TypeScript 类型检查** - 确保类型安全
2. **单元测试** - 添加测试用例

**是否将这些优化项添加到任务列表中？** (Y/n)
```

### 示例 2: Web 应用

**用户**: "创建一个在线协作白板"

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

## 任务生成检查清单

在生成最终任务列表前，检查：

- [ ] 所有任务都有明确的测试命令
- [ ] 测试命令可以直接执行验证
- [ ] 成功标准都是可验证的
- [ ] 任务之间相互独立（正交性）
- [ ] 每个任务都有清晰的描述
- [ ] 任务粒度适中（不过大也不过小）
- [ ] 优化项已根据用户选择添加
- [ ] JSON 格式正确且完整
