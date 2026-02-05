# Obsidian Skills 使用说明

来源：[kepano/obsidian-skills](https://github.com/kepano/obsidian-skills)  
已安装到本仓库 `.cursor/skills/` 下的三个子技能，供 Cursor Agent 在编辑 Obsidian 相关内容时自动触发。

---

## 已安装技能

| 技能目录 | 用途 |
|----------|------|
| **obsidian-markdown** | 编写/编辑 Obsidian 风味 Markdown：wikilinks、callouts、frontmatter、嵌入、标签等 |
| **obsidian-bases** | 编写/编辑 Obsidian Bases（`.base`）：视图、筛选、公式、汇总等 |
| **json-canvas** | 编写/编辑 JSON Canvas（`.canvas`）：节点、连线、分组、画布结构 |

---

## 何时会被触发

- **obsidian-markdown**：处理 Obsidian 的 `.md` 笔记、wikilinks、callouts、frontmatter、标签、嵌入等时。
- **obsidian-bases**：处理 `.base` 文件、Bases、表格/卡片视图、筛选、公式时。
- **json-canvas**：处理 `.canvas` 文件、画布、思维导图、流程图、Canvas 节点/边时。

---

## 使用方式

在对话中直接描述需求即可，Agent 会根据内容自动选用对应技能：

- *「帮我写一篇 Obsidian 笔记，用 callout 和 wikilink」* → 使用 obsidian-markdown。
- *「给这个 vault 做一个任务看板 .base，按状态分组」* → 使用 obsidian-bases。
- *「生成一个项目结构的 .canvas 思维导图」* → 使用 json-canvas。

无需输入技能名或命令，只要提到 Obsidian、.md/.base/.canvas、画布、Bases、callout 等关键词即可。

---

## 更新技能

若需从上游仓库更新：

```bash
cd /c/project/AC
git clone --depth 1 https://github.com/kepano/obsidian-skills.git .cursor/skills/_obsidian-skills-repo
cp -r .cursor/skills/_obsidian-skills-repo/skills/json-canvas .cursor/skills/
cp -r .cursor/skills/_obsidian-skills-repo/skills/obsidian-bases .cursor/skills/
cp -r .cursor/skills/_obsidian-skills-repo/skills/obsidian-markdown .cursor/skills/
rm -rf .cursor/skills/_obsidian-skills-repo
```
