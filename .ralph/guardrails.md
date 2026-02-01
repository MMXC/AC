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

### Sign: Must Create Files
- **Trigger**: At the start of EVERY session
- **Instruction**: You MUST create at least one file in each session. Do NOT just read files and exit. Start with the first unchecked criterion and immediately create the required files. If the first criterion is "create package.json", then CREATE package.json file with actual content right away.
- **Added after**: Multiple sessions (20+) finishing without creating any files (2026-01-25)

### Sign: Generator Code vs Generated Code
- **Trigger**: When editing a code generator (e.g. generate-test.py) that both emits source strings and uses the same names (e.g. `os`) in its own logic
- **Instruction**: Ensure every module used in the generator's own code (e.g. `os.path.join`, `os.chmod`) is imported at the top of the generator file. Imports inside the generated string do not satisfy the running script.
- **Added after**: Iteration 2 - generate-test.py NameError (os not defined) at line 90 (2026-02-01)

