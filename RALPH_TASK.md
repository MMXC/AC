---
backlog_id: backlog-138
task: 使用 ui-ux-pro-max 生成并持久化设计系统
test_command: "手动：检查 design-system/MASTER.md 存在且含 Pattern/Style/Colors/Typography/Effects/Anti-patterns"
---

# Task: 使用 ui-ux-pro-max 生成并持久化设计系统

## Description

使用 ui-ux-pro-max 技能为 watch-together 生成完整设计系统（产品类型：实时协作/一起看；风格：现代、可访问、可深色）。执行 `--design-system --persist` 并写入 `design-system/MASTER.md`；如需页面级差异可生成 `design-system/pages/<page>.md`。在 newneed 或设计文档中引用设计系统路径。

**Test Command**: `手动：检查 design-system/MASTER.md 存在且含 Pattern/Style/Colors/Typography/Effects/Anti-patterns`

**Test Command**: `手动：检查 design-system/MASTER.md 存在且含 Pattern/Style/Colors/Typography/Effects/Anti-patterns`

## Success Criteria

- [x] #1 design-system/MASTER.md 已生成且内容完整
- [x] #2 设计系统在 newneed 或项目文档中有引用说明
- [x] #3 与当前 watch-together 产品类型与风格一致

## Implementation Steps

1. **1.1 生成设计系统** — done when: 运行 ui-ux-pro-max `--design-system --persist` 生成 design-system 目录与 MASTER.md
2. **1.2 统一 MASTER 路径** — done when: `design-system/MASTER.md` 存在且含 Pattern/Style/Colors/Typography/Effects/Anti-patterns
3. **2.1 引用设计系统** — done when: newneed 或 watch-together 设计文档中写明 design-system/MASTER.md 路径
4. **2.2 风格一致性** — done when: 设计系统产品类型为实时协作/一起看，风格含现代、可访问、可深色
