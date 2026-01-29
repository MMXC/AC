#!/usr/bin/env bash
#
# remove-file-from-all-branches-safe.sh
#
# 在所有分支上删除指定文件并提交（使用 git 低级命令，避免 checkout 失败）
#
# Usage:
#   remove-file-from-all-branches-safe.sh <file_path> [--push]
#
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  remove-file-from-all-branches-safe.sh <file_path> [--push]

Arguments:
  file_path    要删除的文件路径（相对于仓库根目录）
  --push        删除后推送到远程（默认不推送）

Examples:
  remove-file-from-all-branches-safe.sh "backlog/docs/task-28-ralph-task.md"
  remove-file-from-all-branches-safe.sh "backlog/docs/task-28-ralph-task.md" --push
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
  
  # 检查文件是否在该分支的树中
  set +e
  git ls-tree -r "$branch" --name-only | grep -Fx "$FILE_PATH" >/dev/null 2>&1
  file_in_tree=$?
  set -e
  
  if [[ $file_in_tree -ne 0 ]]; then
    echo "⏭️  文件不在该分支，跳过"
    SKIP_COUNT=$((SKIP_COUNT + 1))
    continue
  fi
  
  # 使用 git read-tree 和 git write-tree 来删除文件（不 checkout）
  # 创建临时索引
  TEMP_INDEX=$(mktemp)
  export GIT_INDEX_FILE="$TEMP_INDEX"
  
  set +e
  # 读取分支的树到临时索引
  git read-tree "$branch" >/dev/null 2>&1
  read_tree_rc=$?
  set -e
  
  if [[ $read_tree_rc -ne 0 ]]; then
    echo "⚠️  无法读取分支树，跳过" >&2
    rm -f "$TEMP_INDEX"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    continue
  fi
  
  # 从索引中删除文件
  set +e
  git rm --cached "$FILE_PATH" >/dev/null 2>&1
  rm_rc=$?
  set -e
  
  if [[ $rm_rc -ne 0 ]]; then
    echo "⚠️  无法从索引删除文件，跳过" >&2
    rm -f "$TEMP_INDEX"
    unset GIT_INDEX_FILE
    FAIL_COUNT=$((FAIL_COUNT + 1))
    continue
  fi
  
  # 检查是否有更改
  set +e
  git diff --cached --quiet
  has_changes=$?
  set -e
  
  if [[ $has_changes -eq 0 ]]; then
    echo "⏭️  无更改，跳过"
    rm -f "$TEMP_INDEX"
    unset GIT_INDEX_FILE
    SKIP_COUNT=$((SKIP_COUNT + 1))
    continue
  fi
  
  # 写入新树
  NEW_TREE=$(git write-tree)
  
  # 创建提交（不 checkout）
  COMMIT_MSG="chore: remove invalid path $FILE_PATH"
  NEW_COMMIT=$(git commit-tree -p "$branch" -m "$COMMIT_MSG" "$NEW_TREE")
  
  # 更新分支引用
  git update-ref "refs/heads/$branch" "$NEW_COMMIT"
  
  echo "✅ 已删除并提交（commit: ${NEW_COMMIT:0:8}）"
  SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  
  # 清理临时索引
  rm -f "$TEMP_INDEX"
  unset GIT_INDEX_FILE
  
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
done

# 恢复原分支（如果可能）
echo ""
echo "🔄 尝试恢复原分支: $CURRENT_BRANCH"
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
