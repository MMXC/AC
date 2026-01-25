# Ralph Guardrails (Signs)

> Lessons learned from past failures. READ THESE BEFORE ACTING.

## Core Signs

### Sign: Read Before Writing
- **Trigger**: Before modifying any file
- **Instruction**: Always read the existing file first
- **Added after**: Core principle

### Sign: Test After Changes
- **Trigger**: After any code change
- **Instruction**: Run tests to verify nothing broke
- **Added after**: Core principle

### Sign: Commit Checkpoints
- **Trigger**: Before risky changes
- **Instruction**: Commit current working state first
- **Added after**: Core principle

---

## Learned Signs

### Sign: No Interactive Commands
- **Trigger**: Before running any command that might require user input
- **Instruction**: NEVER run commands that require interactive input (git push, npm login, password prompts, etc.). These will block execution indefinitely. Only commit locally, never push.
- **Added after**: Session blocking on git push authentication (2026-01-25)

