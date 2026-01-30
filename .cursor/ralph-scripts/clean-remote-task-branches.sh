#!/usr/bin/env bash
#
# clean-remote-task-branches.sh
#
# 清理远程仓库上的 task/TASK-* 任务分支（已合并或不再需要时使用）。
#
# Usage:
#   clean-remote-task-branches.sh [workspace]           # 列出并确认后删除
#   clean-remote-task-branches.sh --dry-run [workspace] # 仅列出，不删除
#   clean-remote-task-branches.sh -y [workspace]        # 不确认，直接删除
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE=""
DRY_RUN=false
SKIP_CONFIRM=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run|-n)
      DRY_RUN=true
      shift
      ;;
    -y|--yes)
      SKIP_CONFIRM=true
      shift
      ;;
    -h|--help)
      echo "Usage: clean-remote-task-branches.sh [--dry-run|-n] [-y|--yes] [workspace]"
      echo ""
      echo "   --dry-run, -n   仅列出远程 task/TASK-* 分支，不删除"
      echo "   -y, --yes       不确认，直接删除"
      echo "   workspace       仓库路径，默认当前目录"
      exit 0
      ;;
    *)
      WORKSPACE="$1"
      shift
      break
      ;;
  esac
done
[[ -z "$WORKSPACE" ]] && WORKSPACE="$(pwd)"

WORKSPACE="$(cd "$WORKSPACE" && pwd)"
cd "$WORKSPACE"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "❌ 不是 git 仓库: $WORKSPACE" >&2
  exit 1
fi

echo "🔄 获取远程分支列表..."
git fetch origin --prune 2>/dev/null || true

# 远程 task/TASK-* 分支（去掉 origin/ 前缀）
REMOTE_TASK_BRANCHES=($(git branch -r | grep 'origin/task/TASK-' | sed 's/^[[:space:]]*origin\///' | sed 's/[[:space:]]*$//' | sort -u))

if [[ ${#REMOTE_TASK_BRANCHES[@]} -eq 0 ]]; then
  echo "✅ 远程没有 task/TASK-* 分支"
  exit 0
fi

echo ""
echo "📋 远程任务分支（${#REMOTE_TASK_BRANCHES[@]} 个）："
for b in "${REMOTE_TASK_BRANCHES[@]}"; do
  echo "   - $b"
done
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
  echo "🔍 --dry-run：未执行删除。去掉 --dry-run 可实际删除。"
  exit 0
fi

if [[ "$SKIP_CONFIRM" != "true" ]]; then
  read -p "确认删除以上远程分支？[y/N] " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消"
    exit 0
  fi
fi

echo "🗑️  删除远程分支..."
for b in "${REMOTE_TASK_BRANCHES[@]}"; do
  if git push origin --delete "$b" 2>/dev/null; then
    echo "   ✅ 已删除: $b"
  else
    echo "   ⚠️  删除失败: $b" >&2
  fi
done
echo "✅ 清理完成"
