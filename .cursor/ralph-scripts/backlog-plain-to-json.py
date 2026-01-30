#!/usr/bin/env python3
"""
backlog-plain-to-json.py

从 `backlog task <id> --plain` 的输出中解析任务信息：
- id / title / status
- description
- acceptance criteria
- test_command

支持两种输出模式：
- 默认：输出 JSON 到 stdout
- --emit-ralph-task：输出 RALPH_TASK.md 内容到 stdout
"""

import argparse
import json
import re
import sys
from typing import List, Dict


def parse_plain(text: str) -> Dict:
  lines = text.splitlines()

  task_id = ""
  title = ""
  status = ""
  description_lines: List[str] = []
  ac_lines: List[str] = []
  test_command = ""

  # 1) Task 行
  for line in lines:
    m = re.match(r"^Task\s+(TASK-\d+)\s*-\s*(.+)$", line.strip())
    if m:
      task_id = m.group(1)
      title = m.group(2).strip()
      break

  # 2) Status 行
  for line in lines:
    if line.strip().startswith("Status:"):
      # Status: ○ To Do
      s = line.split(":", 1)[1].strip()
      # 去掉前面的符号（例如 ○）
      s = re.sub(r"^[^\w]+", "", s)
      status = s
      break

  # 3) Description 区块
  in_desc = False
  skip_sep = False
  for line in lines:
    if line.strip().startswith("Description:"):
      in_desc = True
      skip_sep = True
      continue
    if in_desc and skip_sep and re.match(r"^-{3,}$", line.strip()):
      skip_sep = False
      continue
    if in_desc and line.strip().startswith("Acceptance Criteria:"):
      break
    if in_desc and not skip_sep:
      description_lines.append(line.rstrip("\n"))

  description = "\n".join(description_lines).strip()

  # 4) Acceptance Criteria 区块
  in_ac = False
  skip_sep = False
  for line in lines:
    if line.strip().startswith("Acceptance Criteria:"):
      in_ac = True
      skip_sep = True
      continue
    if in_ac and skip_sep and re.match(r"^-{3,}$", line.strip()):
      skip_sep = False
      continue
    if in_ac and any(
      line.strip().startswith(h)
      for h in ("Definition of Done:", "Implementation Notes:", "Notes:", "Plan:")
    ):
      break
    if in_ac and not skip_sep:
      if re.match(r"^\s*-\s*\[[ xX]\]\s*", line):
        ac_lines.append(line.rstrip("\n"))

  # 5) Test Command from description
  m = re.search(r"\*\*Test Command\*\*:\s*`([^`]+)`", description)
  if m:
    test_command = m.group(1).strip()

  return {
    "id": task_id,
    "title": title,
    "status": status,
    "description": description,
    "acceptance_criteria_raw": ac_lines,
    "test_command": test_command,
  }


def emit_ralph_task(parsed: Dict, task_numeric: str) -> str:
  title = parsed.get("title") or f"TASK-{task_numeric}"
  desc = parsed.get("description", "")
  test_cmd = parsed.get("test_command", "")
  ac_raw: List[str] = parsed.get("acceptance_criteria_raw") or []

  # 统一成 "- [ ] xxx"（保持原始文本，去掉 [x]/[ ] 前缀）
  ac_normalized: List[str] = []
  for line in ac_raw:
    m = re.match(r"^\s*-\s*\[[ xX]\]\s*(.*)$", line)
    if m:
      ac_normalized.append(m.group(1).rstrip())

  lines: List[str] = []
  lines.append("---")
  lines.append(f"backlog_id: backlog-{task_numeric}")
  lines.append(f"task: {title}")
  lines.append(f'test_command: "{test_cmd}"')
  lines.append("---")
  lines.append("")
  lines.append(f"# Task: {title}")
  lines.append("")
  lines.append("## Description")
  lines.append("")
  if desc:
    lines.append(desc)
    lines.append("")
  lines.append("## Success Criteria")
  lines.append("")
  if ac_normalized:
    for item in ac_normalized:
      lines.append(f"- [ ] {item}")
  else:
    lines.append("- [ ] <fill in acceptance criteria>")

  return "\n".join(lines).rstrip() + "\n"


def main() -> None:
  parser = argparse.ArgumentParser(description="Parse `backlog task <id> --plain` output.")
  parser.add_argument(
    "--id",
    dest="task_id",
    required=False,
    help="任务数字 ID，例如 56（用于生成 backlog_id）",
  )
  parser.add_argument(
    "--emit-ralph-task",
    action="store_true",
    help="输出 RALPH_TASK.md 内容，而不是 JSON",
  )
  args = parser.parse_args()

  text = sys.stdin.read()
  if not text.strip():
    print("", end="")
    return

  parsed = parse_plain(text)

  if args.emit_ralph_task:
    numeric = ""
    if parsed.get("id"):
      m = re.match(r"^TASK-(\d+)$", parsed["id"])
      if m:
        numeric = m.group(1)
    if not numeric and args.task_id and args.task_id.isdigit():
      numeric = args.task_id
    if not numeric:
      # fallback：不给 backlog_id，仍然生成可用的 RALPH_TASK.md
      numeric = "0"
    out = emit_ralph_task(parsed, numeric)
    sys.stdout.write(out)
  else:
    print(json.dumps(parsed, ensure_ascii=False))


if __name__ == "__main__":
  main()

