# 全局规则：优先使用 Context7 Skills

## 核心原则

**在任何对话开始时，优先使用 Context7 (ctx7) skill 查找适合的优质 skill 并安装使用。**

## 工作流程

### 1. 任务开始时的检查流程

当用户提出需求或任务时，按以下顺序执行：

```
用户需求
    ↓
1. 使用 ctx7 skill 搜索相关 skills
    ├─ 找到合适的 skill？
    │   ├─ YES → 安装并使用该 skill
    │   └─ NO → 继续下一步
    ↓
2. 使用 search-skill 搜索其他市场
    ├─ 找到合适的 skill？
    │   ├─ YES → 安装并使用该 skill
    │   └─ NO → 继续下一步
    ↓
3. 手动实现或创建自定义 skill
```

### 2. 使用 ctx7 的步骤

**步骤 1：搜索技能**
```bash
# 提取用户需求的关键词
# 使用 ctx7 搜索
npx ctx7 skills search {keywords}
```

**步骤 2：评估结果**
- 检查技能描述是否匹配需求
- 验证技能质量（来源、维护状态等）
- 确认技能兼容性（Cursor/Claude 等）

**步骤 3：安装技能**
```bash
# 安装到当前项目
npx ctx7 skills install {project} {skill-name} --cursor

# 或安装到全局
npx ctx7 skills install {project} {skill-name} --global
```

**步骤 4：使用技能**
- 阅读已安装技能的 SKILL.md
- 按照技能指南执行任务
- 告知用户已使用的技能

### 3. 何时使用 ctx7

**必须使用 ctx7 的场景：**
- 用户描述的功能需求（如 "处理 PDF"、"TypeScript 支持"）
- 需要特定框架或库的支持
- 需要遵循特定编码模式或最佳实践
- 任何可能已有现成解决方案的任务

**可以跳过 ctx7 的场景：**
- 项目特定的业务逻辑
- 用户明确要求手动实现
- 已经确认没有现成技能的特殊需求

### 4. 与其他技能的关系

**ctx7 vs search-skill：**
- **ctx7**：专门用于 Context7 Skills Registry（https://context7.com）
- **search-skill**：用于其他市场（GitHub、skills.sh 等）
- **优先级**：先使用 ctx7，再使用 search-skill

**ctx7 vs skill-manager：**
- **ctx7**：用于发现和安装新技能
- **skill-manager**：用于管理已安装技能的更新和生命周期

### 5. 实施要求

1. **自动触发**：每次对话开始时，如果任务可能受益于现有技能，自动搜索
2. **透明沟通**：告知用户找到了什么技能，为什么选择它
3. **快速失败**：如果搜索无结果，快速转向手动实现，不要浪费时间
4. **记录使用**：在完成任务后，记录使用了哪些技能

### 6. 示例场景

**场景 1：用户需要处理 PDF**
```
1. 搜索: npx ctx7 skills search pdf
2. 找到: pdf skill from /anthropics/skills
3. 安装: npx ctx7 skills install /anthropics/skills pdf --cursor
4. 使用: 按照 pdf skill 的指南处理 PDF 任务
```

**场景 2：用户需要 TypeScript 支持**
```
1. 搜索: npx ctx7 skills search typescript
2. 评估结果
3. 安装最相关的技能
4. 应用技能完成任务
```

**场景 3：用户需要自定义功能**
```
1. 搜索: npx ctx7 skills search {相关关键词}
2. 无结果 → 使用 search-skill 搜索其他市场
3. 仍无结果 → 手动实现或创建自定义 skill
```

## 注意事项

1. **不要过度搜索**：如果明显是项目特定需求，直接实现
2. **质量优先**：优先选择官方来源（如 /anthropics/skills）的技能
3. **及时更新**：定期检查已安装技能的更新
4. **文档记录**：使用技能后，在项目文档中记录

## 相关资源

- Context7 Skills Registry: https://context7.com
- ctx7 CLI: https://github.com/upstash/context7
- ctx7 Skill: `.cursor/skills/ctx7/SKILL.md`
- search-skill: `.cursor/skills/search-skill/SKILL.md`
