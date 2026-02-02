#!/bin/bash
#
# backlog-finish-task.sh
#
# 完成一个任务：
# - backlog 状态改为 Done
# - 清理 .ralph/claims/task-<id>.claim 占用文件
#
# 约定：应在 main 上执行（合并任务分支到 main 后），再由调用方在 main 上提交变更。
#
# Usage:
#   backlog-finish-task.sh <task_id_number> [workspace]
#
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  backlog-finish-task.sh <task_id_number> [workspace]
EOF
}

TASK_ID="${1:-}"
WORKSPACE="${2:-$(pwd)}"

if [[ -z "$TASK_ID" || "$TASK_ID" == "-h" || "$TASK_ID" == "--help" ]]; then
  usage
  exit 1
fi

if ! [[ "$TASK_ID" =~ ^[0-9]+$ ]]; then
  echo "❌ TASK_ID 必须是数字，例如 60" >&2
  exit 1
fi

WORKSPACE="$(cd "$WORKSPACE" && pwd)"

if ! command -v backlog >/dev/null 2>&1; then
  echo "❌ 未找到 backlog CLI（PATH 中没有 backlog）" >&2
  exit 1
fi

if ! backlog task edit "$TASK_ID" -s "Done" >/dev/null 2>&1; then
  echo "❌ backlog 状态更新失败：TASK-$TASK_ID -> Done" >&2
  exit 2
fi

CLAIM_FILE="$WORKSPACE/.ralph/claims/task-${TASK_ID}.claim"
rm -f "$CLAIM_FILE" 2>/dev/null || true

echo "✅ TASK-$TASK_ID 已标记为 Done（并清理 claim 文件）"
