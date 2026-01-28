---
name: ctx7
description: Use Context7 CLI to search, install, and manage AI coding skills from the Context7 Skills Registry
model: sonnet
---

# Context7 Skill Manager

Use the Context7 CLI (`ctx7`) to search, install, and manage AI coding skills from the [Context7 Skills Registry](https://context7.com). Context7 provides a centralized registry of reusable prompt instructions that enhance AI coding assistants with specialized capabilities.

## When to Use

Use this skill when:
- User wants to find and install skills for specific frameworks, libraries, or coding patterns
- User asks about available skills for a particular use case
- User wants to manage installed skills (list, remove, update)
- User needs to discover skills from the Context7 registry
- Any task that could benefit from an existing skill - **ALWAYS check Context7 first before implementing from scratch**

## Installation

The CLI can be used directly without installation:

```bash
# Run directly with npx (no install needed)
npx ctx7

# Or install globally
npm install -g ctx7
```

## Core Commands

### Search for Skills

Find skills across all indexed projects in the registry:

```bash
# Search by keyword
npx ctx7 skills search pdf
npx ctx7 skills search typescript
npx ctx7 skills search react testing

# Short alias
npx ctx7 ss pdf
```

### Install Skills

Install skills from a project repository to your AI coding assistant's skills directory:

```bash
# Install all skills from a project (interactive selection)
npx ctx7 skills install /anthropics/skills

# Install a specific skill
npx ctx7 skills install /anthropics/skills pdf

# Install multiple skills at once
npx ctx7 skills install /anthropics/skills pdf commit

# Install to a specific client
npx ctx7 skills install /anthropics/skills pdf --cursor
npx ctx7 skills install /anthropics/skills pdf --claude

# Install globally (home directory instead of current project)
npx ctx7 skills install /anthropics/skills pdf --global

# Short alias
npx ctx7 si /anthropics/skills pdf
```

### List Installed Skills

View skills installed in your project or globally:

```bash
# List all installed skills
npx ctx7 skills list

# List for specific client
npx ctx7 skills list --claude
npx ctx7 skills list --cursor
npx ctx7 skills list --global
```

### Show Skill Information

Get details about available skills in a project:

```bash
npx ctx7 skills info /anthropics/skills
```

### Remove a Skill

Uninstall a skill from your project:

```bash
npx ctx7 skills remove pdf
npx ctx7 skills remove pdf --claude
npx ctx7 skills remove pdf --global
```

## Supported Clients

The CLI automatically detects which AI coding assistants you have installed:

| Client | Skills Directory |
|--------|-----------------|
| Claude Code | `.claude/skills/` |
| Cursor | `.cursor/skills/` |
| Codex | `.codex/skills/` |
| OpenCode | `.opencode/skills/` |
| Amp | `.agents/skills/` |
| Antigravity | `.agent/skills/` |

## Workflow

### Step 1: Search for Relevant Skills

When user describes a need:
1. Extract keywords from the user's request
2. Search Context7 registry using `npx ctx7 skills search {keywords}`
3. Review results and identify relevant skills

### Step 2: Evaluate Skills

For each potential skill:
- Check skill description and use cases
- Verify it matches the user's requirements
- Consider skill quality indicators (if available)

### Step 3: Install and Use

If a suitable skill is found:
1. Install the skill: `npx ctx7 skills install {project} {skill-name} --cursor`
2. Inform user about the installed skill
3. Use the skill to complete the task

If no suitable skill is found:
1. Inform user honestly
2. Proceed with manual implementation or suggest creating a custom skill

## Examples

### Example 1: User needs PDF processing

**User**: "I need to work with PDF files"

**Process**:
1. Search: `npx ctx7 skills search pdf`
2. Review results
3. Install: `npx ctx7 skills install /anthropics/skills pdf --cursor`
4. Use the installed skill for PDF operations

### Example 2: User needs TypeScript support

**User**: "Help me with TypeScript code"

**Process**:
1. Search: `npx ctx7 skills search typescript`
2. Evaluate results
3. Install relevant skill if found
4. Apply skill to the TypeScript task

### Example 3: User wants to manage skills

**User**: "What skills do I have installed?"

**Process**:
1. Run: `npx ctx7 skills list --cursor`
2. Display results to user
3. Offer to install additional skills if needed

## Best Practices

1. **Always search first**: Before implementing functionality from scratch, check if a skill exists
2. **Use official sources**: Prefer skills from `/anthropics/skills` (official examples)
3. **Verify compatibility**: Ensure the skill works with the current client (Cursor, Claude, etc.)
4. **Install to project**: Use `--cursor` flag to install to current project's `.cursor/skills/` directory
5. **Document usage**: After installing, inform user about the skill and how to use it

## Integration with Other Skills

This skill complements:
- **search-skill**: Use ctx7 for Context7 registry, search-skill for other marketplaces
- **skill-manager**: Use ctx7 for installation, skill-manager for lifecycle management
- **skill-from-github**: Use ctx7 for registry skills, skill-from-github for custom skills

## Important Notes

1. **Registry focus**: This skill focuses on the Context7 registry. For other sources, use `search-skill`
2. **No installation required**: The CLI works via `npx` without global installation
3. **Client detection**: The CLI auto-detects installed clients, but you can specify with flags
4. **Project vs Global**: Install to project (`.cursor/skills/`) for version control, or globally for personal use

## References

- Context7 Skills Registry: https://context7.com
- CLI Repository: https://github.com/upstash/context7
- CLI README: https://github.com/upstash/context7/blob/master/packages/cli/README.md
