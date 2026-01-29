#!/usr/bin/env bash
#
# remove-file-from-all-branches.sh
#
# 在所有分支上删除指定文件并提交
#
# Usage:
#   remove-file-from-all-branches.sh <file_path> [--push]
#
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  remove-file-from-all-branches.sh <file_path> [--push]

Arguments:
  file_path    要删除的文件路径（相对于仓库根目录）
  --push        删除后推送到远程（默认不推送）

Examples:
  remove-file-from-all-branches.sh "backlog/docs/task-task-28?-ralph-task.md"
  remove-file-from-all-branches.sh "backlog/docs/task-task-28?-ralph-task.md" --push
EOF
}

FILE_PATH="${1:-}"
PUSH_TO_REMOTE=false

if [[ -z "$FILE_PATH" || "$FILE_PATH" == "-h" || "$FILE_PATH" == "--help" ]]; then
  usage
  exit 1
fi

if [[ "${2:-}" == "--push" ]]; then
  PUSH_TO_REMOTE=true
fi

WORKSPACE="$(pwd)"
cd "$WORKSPACE"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "❌ 不是 git 仓库：$WORKSPACE" >&2
  exit 1
fi

# 保存当前分支
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "HEAD")"

echo "🗑️  从所有分支删除文件: $FILE_PATH"
echo ""

# 获取所有本地分支
ALL_BRANCHES=($(git branch | sed 's/^[ *]*//' | sort))

if [[ ${#ALL_BRANCHES[@]} -eq 0 ]]; then
  echo "❌ 没有找到分支" >&2
  exit 1
fi

echo "📋 找到 ${#ALL_BRANCHES[@]} 个分支："
for branch in "${ALL_BRANCHES[@]}"; do
  echo "  - $branch"
done
echo ""

SUCCESS_COUNT=0
SKIP_COUNT=0
FAIL_COUNT=0

# 遍历每个分支
for branch in "${ALL_BRANCHES[@]}"; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔀 处理分支: $branch"
  
  # 切换到分支
  set +e
  git checkout "$branch" >/dev/null 2>&1
  checkout_rc=$?
  set -e
  
  if [[ $checkout_rc -ne 0 ]]; then
    echo "⚠️  无法切换到 $branch（可能有未提交更改或无效路径），跳过" >&2
    FAIL_COUNT=$((FAIL_COUNT + 1))
    continue
  fi
  
  # 检查文件是否存在（在索引或工作区）
  set +e
  git ls-files --error-unmatch "$FILE_PATH" >/dev/null 2>&1
  file_exists=$?
  set -e
  
  if [[ $file_exists -ne 0 ]]; then
    # 文件不在索引中，检查工作区
    if [[ ! -f "$FILE_PATH" ]]; then
      echo "⏭️  文件不存在，跳过"
      SKIP_COUNT=$((SKIP_COUNT + 1))
      continue
    fi
  fi
  
  # 删除文件（使用 git rm 以便跟踪）
  set +e
  git rm --cached "$FILE_PATH" >/dev/null 2>&1 || rm -f "$FILE_PATH" 2>/dev/null || true
  set -e
  
  # 检查是否有更改需要提交
  if [[ -z "$(git status --porcelain)" ]]; then
    echo "⏭️  无更改，跳过"
    SKIP_COUNT=$((SKIP_COUNT + 1))
    continue
  fi
  
  # 提交删除
  set +e
  git commit -m "chore: remove invalid path $FILE_PATH" >/dev/null 2>&1
  commit_rc=$?
  set -e
  
  if [[ $commit_rc -eq 0 ]]; then
    echo "✅ 已删除并提交"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    
    # 推送到远程（如果启用）
    if [[ "$PUSH_TO_REMOTE" == "true" ]]; then
      set +e
      git push origin "$branch" >/dev/null 2>&1
      push_rc=$?
      set -e
      
      if [[ $push_rc -eq 0 ]]; then
        echo "📤 已推送到远程"
      else
        echo "⚠️  推送失败（可能未配置远程或权限问题）" >&2
      fi
    fi
  else
    echo "⚠️  提交失败" >&2
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
done

# 恢复原分支
echo ""
echo "🔄 恢复原分支: $CURRENT_BRANCH"
set +e
git checkout "$CURRENT_BRANCH" >/dev/null 2>&1 || true
set -e

# 总结
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 处理完成！"
echo "   成功删除并提交: $SUCCESS_COUNT"
echo "   跳过（文件不存在）: $SKIP_COUNT"
echo "   失败: $FAIL_COUNT"
echo ""
