#!/usr/bin/env bash
#
# ralph-run-task-branch.sh
#
# 在独立 Git 分支中运行 Ralph（串行模式，不使用 worktree）。
# 每个 backlog 任务对应一个分支（task/TASK-<id>），Ralph 在该分支上工作并提交。
#
# 主要流程：
# 1) 从 backlog task <id> --plain 读取任务内容，生成 RALPH_TASK.md
# 2) 创建/切换到任务分支 task/TASK-<id>
# 3) 在主工作区运行 ralph-loop.sh -y
# 4) 完成后分支保留，可手动合并或创建 PR
#
# Usage:
#   ralph-run-task-branch.sh <task_id_number> [workspace]
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat <<'EOF'
Usage:
  ralph-run-task-branch.sh <task_id_number> [workspace]

Notes:
  - Creates/uses branch: task/TASK-<id>
  - Runs Ralph in main workspace (no worktree overhead)
  - Branch is preserved after completion for review/merge
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

BRANCH_NAME="task/TASK-${TASK_ID}"
ORIGINAL_BRANCH=""

# 保存当前分支
ORIGINAL_BRANCH="$(git -C "$WORKSPACE" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "HEAD")"

# 确保工作区干净（避免切换分支时冲突）
if [[ -n "$(git -C "$WORKSPACE" status --porcelain)" ]]; then
  echo "⚠️  工作区有未提交更改，将先提交..." >&2
  git -C "$WORKSPACE" add -A
  git -C "$WORKSPACE" commit -m "ralph: checkpoint before TASK-$TASK_ID" || {
    echo "❌ 无法提交当前更改，请先手动处理" >&2
    exit 1
  }
fi

# 创建或切换到任务分支
if git -C "$WORKSPACE" rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  echo "[branch] 切换到已存在的分支: $BRANCH_NAME"
  git -C "$WORKSPACE" checkout "$BRANCH_NAME" >/dev/null
else
  echo "[branch] 创建新分支: $BRANCH_NAME"
  # 尝试从 main/master 创建，否则从当前分支创建
  if git -C "$WORKSPACE" rev-parse --verify main >/dev/null 2>&1; then
    git -C "$WORKSPACE" checkout -b "$BRANCH_NAME" main >/dev/null
  elif git -C "$WORKSPACE" rev-parse --verify master >/dev/null 2>&1; then
    git -C "$WORKSPACE" checkout -b "$BRANCH_NAME" master >/dev/null
  else
    git -C "$WORKSPACE" checkout -b "$BRANCH_NAME" >/dev/null
  fi
fi

# 生成 RALPH_TASK.md
echo "[branch] 生成 RALPH_TASK.md（通过 backlog task $TASK_ID --plain）"
set +e
backlog task "$TASK_ID" --plain 2>/dev/null \
  | python3 "$PARSER" --id "$TASK_ID" --emit-ralph-task > "$WORKSPACE/RALPH_TASK.md"
rc_gen=$?
set -e

if [[ $rc_gen -ne 0 ]] || [[ ! -s "$WORKSPACE/RALPH_TASK.md" ]]; then
  echo "❌ 从 backlog task $TASK_ID 生成 RALPH_TASK.md 失败" >&2
  # 恢复原分支
  git -C "$WORKSPACE" checkout "$ORIGINAL_BRANCH" >/dev/null 2>&1 || true
  exit 1
fi

# 提交 RALPH_TASK.md（作为任务开始的标记）
git -C "$WORKSPACE" add RALPH_TASK.md
git -C "$WORKSPACE" commit -m "ralph: TASK-$TASK_ID 初始化 RALPH_TASK.md" >/dev/null 2>&1 || true

echo "[branch] 运行 Ralph（分支: $BRANCH_NAME）"
set +e
"$SCRIPT_DIR/ralph-loop.sh" -y "$WORKSPACE"
rc=$?
set -e

if [[ $rc -eq 0 ]]; then
  echo "[branch] Ralph 成功完成：TASK-$TASK_ID"
  echo "[branch] 任务分支: $BRANCH_NAME"
  echo "[branch] 查看提交: git log $BRANCH_NAME"
  echo "[branch] 合并到主分支: git checkout main && git merge $BRANCH_NAME"
  echo "[branch] 创建 PR: gh pr create --head $BRANCH_NAME --base main"
  
  # 切换回原分支（如果用户想继续处理其他任务）
  if [[ -n "$ORIGINAL_BRANCH" ]] && [[ "$ORIGINAL_BRANCH" != "$BRANCH_NAME" ]]; then
    git -C "$WORKSPACE" checkout "$ORIGINAL_BRANCH" >/dev/null 2>&1 || true
  fi
  
  exit 0
fi

echo "[branch] Ralph 执行失败（exit=$rc）：TASK-$TASK_ID" >&2
echo "[branch] 任务分支: $BRANCH_NAME（已保留，可查看/调试）"
echo "[branch] 查看提交: git log $BRANCH_NAME"
echo "[branch] 继续调试: git checkout $BRANCH_NAME"

# 失败时也切换回原分支
if [[ -n "$ORIGINAL_BRANCH" ]] && [[ "$ORIGINAL_BRANCH" != "$BRANCH_NAME" ]]; then
  git -C "$WORKSPACE" checkout "$ORIGINAL_BRANCH" >/dev/null 2>&1 || true
fi

exit $rc
