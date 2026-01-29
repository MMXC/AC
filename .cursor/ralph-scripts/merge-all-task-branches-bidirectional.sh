#!/usr/bin/env bash
#
# merge-all-task-branches-bidirectional.sh
#
# 双向合并策略：
# 1. 先把 main 合并到各个 task/TASK-* 分支（解决冲突）
# 2. 再把各个 task/TASK-* 分支合并回 main
#
# 这样 main 保持干净，冲突在各自分支上解决
#
set -euo pipefail

WORKSPACE="$(pwd)"
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

echo "🚀 双向合并：main <-> task/TASK-* 分支"
echo ""

# 保存当前分支
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "HEAD")"

# 1. 暂存当前更改（含未跟踪文件）
if [[ -n "$(git status --porcelain)" ]]; then
  echo "📦 暂存当前工作区更改（含未跟踪文件）..."
  git stash push --include-untracked -m "双向合并前暂存: $(date '+%Y-%m-%d %H:%M:%S')" || {
    echo "⚠️  stash 失败，请先手动提交或丢弃更改" >&2
    exit 1
  }
  STASHED=true
else
  STASHED=false
fi

# 2. 更新主分支
echo "🔄 更新主分支: $MAIN_BRANCH"
git checkout "$MAIN_BRANCH" >/dev/null 2>&1 || {
  echo "⚠️  无法切换到 $MAIN_BRANCH，可能需要先解决冲突" >&2
  [[ "$STASHED" == "true" ]] && git stash pop >/dev/null 2>&1 || true
  exit 1
}
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

# ==========================================
# 阶段 1: 合并 main -> task/TASK-* 分支
# ==========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📥 阶段 1: 合并 main -> task/TASK-* 分支"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PHASE1_SUCCESS=0
PHASE1_SKIP=0
PHASE1_FAIL=0

for branch in "${TASK_BRANCHES[@]}"; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📥 合并 main -> $branch"
  
  # 切换到任务分支
  set +e
  git checkout "$branch" >/dev/null 2>&1
  checkout_rc=$?
  set -e
  
  if [[ $checkout_rc -ne 0 ]]; then
    echo "⚠️  无法切换到 $branch，跳过" >&2
    PHASE1_FAIL=$((PHASE1_FAIL + 1))
    continue
  fi
  
  # 检查是否已包含 main 的最新提交
  set +e
  git merge-base --is-ancestor "$MAIN_BRANCH" "$branch" 2>/dev/null
  already_merged=$?
  set -e
  
  if [[ $already_merged -eq 0 ]]; then
    # 检查是否有新的提交
    set +e
    git log "$branch..$MAIN_BRANCH" --oneline | head -1 >/dev/null 2>&1
    has_new_commits=$?
    set -e
    
    if [[ $has_new_commits -ne 0 ]]; then
      echo "⏭️  $branch 已包含 main 的所有提交，跳过"
      PHASE1_SKIP=$((PHASE1_SKIP + 1))
      continue
    fi
  fi
  
  # 合并 main 到任务分支
  set +e
  git merge --no-ff "$MAIN_BRANCH" -m "chore: merge $MAIN_BRANCH into $branch" 2>&1
  merge_rc=$?
  set -e
  
  if [[ $merge_rc -eq 0 ]]; then
    echo "✅ main -> $branch 合并成功"
    PHASE1_SUCCESS=$((PHASE1_SUCCESS + 1))
  else
    echo "⚠️  main -> $branch 合并失败（有冲突），需要手动解决" >&2
    echo "   当前在 $branch 分支，解决冲突后运行：" >&2
    echo "   git add <解决的文件>" >&2
    echo "   git commit" >&2
    echo "   然后重新运行此脚本" >&2
    PHASE1_FAIL=$((PHASE1_FAIL + 1))
    
    # 尝试 abort（如果还在冲突状态）
    git merge --abort >/dev/null 2>&1 || true
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📥 阶段 1 完成："
echo "   成功: $PHASE1_SUCCESS"
echo "   跳过: $PHASE1_SKIP"
echo "   失败: $PHASE1_FAIL"
echo ""

# ==========================================
# 阶段 2: 合并 task/TASK-* -> main
# ==========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📤 阶段 2: 合并 task/TASK-* -> main"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 切换到 main
git checkout "$MAIN_BRANCH" >/dev/null

PHASE2_SUCCESS=0
PHASE2_SKIP=0
PHASE2_FAIL=0

for branch in "${TASK_BRANCHES[@]}"; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📤 合并 $branch -> main"
  
  # 检查是否已合并
  set +e
  git branch --merged "$MAIN_BRANCH" | grep -q "^  $branch$"
  already_merged=$?
  set -e
  
  if [[ $already_merged -eq 0 ]]; then
    echo "⏭️  $branch 已合并到 main，跳过"
    PHASE2_SKIP=$((PHASE2_SKIP + 1))
    continue
  fi
  
  # 合并任务分支到 main
  set +e
  git merge --no-ff "$branch" -m "ralph: merge $branch" 2>&1
  merge_rc=$?
  set -e
  
  if [[ $merge_rc -eq 0 ]]; then
    echo "✅ $branch -> main 合并成功"
    PHASE2_SUCCESS=$((PHASE2_SUCCESS + 1))
  else
    echo "⚠️  $branch -> main 合并失败（可能有冲突）" >&2
    
    # 尝试 abort
    git merge --abort >/dev/null 2>&1 || true
    PHASE2_FAIL=$((PHASE2_FAIL + 1))
  fi
done

# 恢复 stash
if [[ "$STASHED" == "true" ]]; then
  echo ""
  echo "📦 恢复工作区更改..."
  git stash pop >/dev/null 2>&1 || {
    echo "⚠️  stash pop 失败，请手动执行: git stash pop" >&2
  }
fi

# 恢复原分支
if [[ "$CURRENT_BRANCH" != "$MAIN_BRANCH" ]]; then
  echo ""
  echo "🔄 恢复原分支: $CURRENT_BRANCH"
  set +e
  git checkout "$CURRENT_BRANCH" >/dev/null 2>&1 || true
  set -e
fi

# 总结
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 双向合并完成！"
echo ""
echo "阶段 1 (main -> task/TASK-*):"
echo "   成功: $PHASE1_SUCCESS"
echo "   跳过: $PHASE1_SKIP"
echo "   失败: $PHASE1_FAIL"
echo ""
echo "阶段 2 (task/TASK-* -> main):"
echo "   成功: $PHASE2_SUCCESS"
echo "   跳过: $PHASE2_SKIP"
echo "   失败: $PHASE2_FAIL"
echo ""
echo "💡 推送到远程（可选）："
echo "   git push origin $MAIN_BRANCH"
echo "   for b in task/TASK-*; do git push origin \$b; done"
echo ""
