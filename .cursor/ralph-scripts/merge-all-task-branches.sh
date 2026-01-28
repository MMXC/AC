#!/usr/bin/env bash
#
# merge-all-task-branches.sh
#
# 合并所有 task/TASK-* 分支到 main
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${1:-$(pwd)}"
WORKSPACE="$(cd "$WORKSPACE" && pwd)"

cd "$WORKSPACE"

# 检测主分支
MAIN_BRANCH="main"
if ! git rev-parse --verify main >/dev/null 2>&1; then
  if git rev-parse --verify master >/dev/null 2>&1; then
    MAIN_BRANCH="master"
  else
    echo "❌ 未找到 main/master 分支" >&2
    exit 1
  fi
fi

echo "🚀 开始合并所有 task/TASK-* 分支到 $MAIN_BRANCH"
echo ""

# 1. 暂存当前更改
if [[ -n "$(git status --porcelain)" ]]; then
  echo "📦 暂存当前工作区更改..."
  git stash push -m "合并前暂存: $(date '+%Y-%m-%d %H:%M:%S')" || {
    echo "⚠️  stash 失败，请先手动提交或丢弃更改" >&2
    exit 1
  }
  STASHED=true
else
  STASHED=false
fi

# 2. 切换到主分支并更新
echo "🔄 切换到主分支: $MAIN_BRANCH"
git checkout "$MAIN_BRANCH"
git pull origin "$MAIN_BRANCH" >/dev/null 2>&1 || true

# 3. 获取所有 task/TASK-* 分支
TASK_BRANCHES=($(git branch | grep 'task/TASK-' | sed 's/^[ *]*//' | sort))

if [[ ${#TASK_BRANCHES[@]} -eq 0 ]]; then
  echo "✅ 没有找到 task/TASK-* 分支"
  [[ "$STASHED" == "true" ]] && git stash pop >/dev/null 2>&1 || true
  exit 0
fi

echo "📋 找到 ${#TASK_BRANCHES[@]} 个任务分支："
for branch in "${TASK_BRANCHES[@]}"; do
  echo "  - $branch"
done
echo ""

# 4. 逐个合并
SUCCESS_COUNT=0
FAIL_COUNT=0

for branch in "${TASK_BRANCHES[@]}"; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔀 合并 $branch..."
  
  # 检查是否已合并
  if git branch --merged "$MAIN_BRANCH" | grep -q "^  $branch$"; then
    echo "⏭️  $branch 已合并，跳过"
    continue
  fi
  
  set +e
  git merge --no-ff "$branch" -m "ralph: merge $branch" 2>&1
  merge_rc=$?
  set -e
  
  if [[ $merge_rc -eq 0 ]]; then
    echo "✅ $branch 合并成功"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    echo "⚠️  $branch 合并失败（可能有冲突或无效路径）" >&2
    FAIL_COUNT=$((FAIL_COUNT + 1))
    
    # 尝试 abort（如果有冲突）
    git merge --abort >/dev/null 2>&1 || true
  fi
  echo ""
done

# 5. 恢复 stash
if [[ "$STASHED" == "true" ]]; then
  echo "📦 恢复工作区更改..."
  git stash pop >/dev/null 2>&1 || {
    echo "⚠️  stash pop 失败，请手动执行: git stash pop" >&2
  }
fi

# 6. 总结
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 合并完成！"
echo "   成功: $SUCCESS_COUNT"
echo "   失败: $FAIL_COUNT"
echo ""
echo "💡 推送到远程（可选）："
echo "   git push origin $MAIN_BRANCH"
echo ""
