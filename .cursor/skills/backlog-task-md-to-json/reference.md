# Reference: Backlog Task Markdown Format (project conventions)

## Expected file location

`backlog/tasks/task-<id> - <title>.md`

## Frontmatter keys (typical)

```yaml
---
id: TASK-56
title: ...
status: To Do
assignee: []
created_date: '2026-01-28'
updated_date: '2026-01-28'
labels: []
dependencies: []
---
```

## Sections (typical)

- `## Description`
  - `<!-- SECTION:DESCRIPTION:BEGIN -->` ... `<!-- SECTION:DESCRIPTION:END -->`
  - Contains optional `**Test Command**: \`...\``
- `## Acceptance Criteria`
  - `<!-- AC:BEGIN -->` ... `<!-- AC:END -->`
  - Checkbox lines: `- [ ] ...` / `- [x] ...`
- `## Implementation Notes`

## Recommended JSON schema (stable)

```json
{
  "id": "TASK-56",
  "title": "string",
  "status": "To Do | In Progress | Done",
  "created_date": "string",
  "updated_date": "string",
  "labels": ["string"],
  "dependencies": ["TASK-55"],
  "description": "string",
  "test_command": "string",
  "acceptance_criteria": ["string"],
  "source_path": "string"
}
```

