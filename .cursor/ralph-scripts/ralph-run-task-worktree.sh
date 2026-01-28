#!/usr/bin/env bash
#
#
# ralph-run-task-worktree.sh
#
# 在独立 git worktree 中运行 Ralph（用于并行执行多个任务，避免共享 RALPH_TASK.md / .ralph 状态文件冲突）。
#
# 主要流程：
# 1) 从 backlog/tasks/task-<id>*.md 读取任务内容（纯 shell 解析，不依赖 python/json）
# 2) 在 worktree 目录生成 RALPH_TASK.md
# 3) 运行 ralph-loop.sh -y
# 4) 成功则移除 worktree；失败则保留 worktree 便于排查
#
# Usage:
#   ralph-run-task-worktree.sh <task_id_number> [workspace]
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat <<'EOF'
Usage:
  ralph-run-task-worktree.sh <task_id_number> [workspace]

Notes:
  - Requires git worktree support
  - Reads task definition from: backlog/tasks/task-<id>*.md
  - Generates: <worktree>/RALPH_TASK.md (per worktree)
EOF
}

TASK_ID="${1:-}"
WORKSPACE="${2:-$(pwd)}"

if [[ -z "$TASK_ID" || "$TASK_ID" == "-h" || "$TASK_ID" == "--help" ]]; then
  usage
  exit 1
fi
if ! [[ "$TASK_ID" =~ ^[0-9]+$ ]]; then
  echo "❌ TASK_ID 必须是数字，例如 56" >&2
  exit 1
fi

WORKSPACE="$(cd "$WORKSPACE" && pwd)"

if ! command -v git >/dev/null 2>&1; then
  echo "❌ 未找到 git" >&2
  exit 1
fi

if ! git -C "$WORKSPACE" rev-parse --git-dir >/dev/null 2>&1; then
  echo "❌ workspace 不是 git 仓库：$WORKSPACE" >&2
  exit 1
fi

if ! command -v backlog >/dev/null 2>&1; then
  echo "❌ 未找到 backlog CLI（需要通过它读取任务）" >&2
  exit 1
fi

PARSER="$SCRIPT_DIR/backlog-plain-to-json.py"
if ! command -v python3 >/dev/null 2>&1 || [[ ! -f "$PARSER" ]]; then
  echo "❌ 缺少 python3 或解析脚本：$PARSER" >&2
  exit 1
fi

# worktree 目录（每次运行用 pid 区分，避免冲突）
WT_BASE="$WORKSPACE/.ralph/worktrees"
mkdir -p "$WT_BASE" 2>/dev/null || true
WT_DIR="$WT_BASE/TASK-${TASK_ID}-$$"

cleanup_worktree() {
  # worktree remove 会清理管理信息；目录也会被移除
  git -C "$WORKSPACE" worktree remove -f "$WT_DIR" >/dev/null 2>&1 || true
  rm -rf "$WT_DIR" 2>/dev/null || true
}

BRANCH_NAME="task/TASK-${TASK_ID}"

# 检查分支是否已存在（可能来自之前的失败运行）
if git -C "$WORKSPACE" rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  echo "[worktree] 分支 $BRANCH_NAME 已存在，将复用"
  git -C "$WORKSPACE" worktree add "$WT_DIR" "$BRANCH_NAME" >/dev/null 2>&1 || {
    # 如果 worktree 目录已存在但分支不同，先清理
    rm -rf "$WT_DIR" 2>/dev/null || true
    git -C "$WORKSPACE" worktree add "$WT_DIR" "$BRANCH_NAME" >/dev/null
  }
else
  # 创建新分支
  echo "[worktree] 创建分支 $BRANCH_NAME 并创建 worktree"
  git -C "$WORKSPACE" worktree add -b "$BRANCH_NAME" "$WT_DIR" HEAD >/dev/null
fi

echo "[worktree] 生成 RALPH_TASK.md（通过 backlog task $TASK_ID --plain）"
set +e
backlog task "$TASK_ID" --plain 2>/dev/null \
  | python3 "$PARSER" --id "$TASK_ID" --emit-ralph-task > "$WT_DIR/RALPH_TASK.md"
rc_gen=$?
set -e

if [[ $rc_gen -ne 0 ]] || [[ ! -s "$WT_DIR/RALPH_TASK.md" ]]; then
  echo "❌ 从 backlog task $TASK_ID 生成 RALPH_TASK.md 失败" >&2
  cleanup_worktree
  exit 1
fi

echo "[worktree] 运行 Ralph（worktree 内，分支: $BRANCH_NAME）"
set +e
"$SCRIPT_DIR/ralph-loop.sh" -y "$WT_DIR"
rc=$?
set -e

if [[ $rc -eq 0 ]]; then
  echo "[worktree] Ralph 成功完成：TASK-$TASK_ID"
  echo "[worktree] 任务分支: $BRANCH_NAME"
  echo "[worktree] 查看提交: git log $BRANCH_NAME"
  echo "[worktree] 合并到主分支: git checkout main && git merge $BRANCH_NAME"
  echo "[worktree] 删除 worktree（分支保留）"
  cleanup_worktree
  exit 0
fi

echo "[worktree] Ralph 执行失败（exit=$rc）：TASK-$TASK_ID" >&2
echo "[worktree] 任务分支: $BRANCH_NAME（已保留，可查看/调试）"
echo "[worktree] 查看提交: git log $BRANCH_NAME"
echo "[worktree] 删除 worktree（分支保留）"
cleanup_worktree
exit $rc

