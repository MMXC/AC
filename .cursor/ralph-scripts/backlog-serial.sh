#!/usr/bin/env bash
#
# backlog-serial.sh
#
# 串行处理 backlog 任务：逐个抢占、执行、完成，直到没有 To Do 任务为止。
# 遵循 ralph-git-workflow 规范：
# - 每个任务在独立分支 task/TASK-<id> 上工作
# - 完成后推送分支并提供 PR 创建命令
# - 提交信息使用 ralph: TASK-<id> 前缀
#
# Usage:
#   backlog-serial.sh [--workspace .] [--watch] [--no-pr]
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

WORKSPACE="$(pwd)"
POLL_INTERVAL="1"
STOP_WHEN_EMPTY=true
SKIP_PR=false
AUTO_CREATE_PR=false
AUTO_MERGE=false

usage() {
  cat <<'EOF'
Usage:
  backlog-serial.sh [options]

Options:
  -w, --workspace DIR       Workspace（默认当前目录）
  --poll SECONDS            轮询间隔（默认 1）
  --watch                   队列空了也不退出（持续等待新任务）
  --no-pr                   完成后不提示 PR 命令（默认会提示）
  --auto-pr                 完成后自动创建 PR（需要 gh CLI）
  --auto-merge              完成后自动合并到主分支并 push（不依赖 gh）
  -h, --help                帮助

流程：
  1. 从 backlog 抢占一个 To Do 任务（优先最小 ID，检查依赖）
  2. 创建/切换到分支 task/TASK-<id>
  3. 生成 RALPH_TASK.md 并运行 ralph-loop.sh
  4. 成功后标记为 Done，推送分支，提示/创建 PR
  5. 继续下一个任务

示例：
  backlog-serial.sh                    # 处理所有 To Do 任务
  backlog-serial.sh --watch            # 持续等待新任务
  backlog-serial.sh --no-pr            # 不提示 PR 命令
  backlog-serial.sh --auto-pr          # 自动创建 PR
  backlog-serial.sh --auto-merge       # 自动合并到主分支
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -w|--workspace)
      WORKSPACE="$2"
      shift 2
      ;;
    --poll)
      POLL_INTERVAL="$2"
      shift 2
      ;;
    --watch)
      STOP_WHEN_EMPTY=false
      shift
      ;;
    --no-pr)
      SKIP_PR=true
      shift
      ;;
    --auto-pr)
      AUTO_CREATE_PR=true
      shift
      ;;
    --auto-merge|--automerge)
      AUTO_MERGE=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "❌ 未知选项: $1" >&2
      usage
      exit 1
      ;;
  esac
done

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
  echo "❌ 未找到 backlog CLI" >&2
  exit 1
fi

CLAIM_SCRIPT="$SCRIPT_DIR/backlog-claim-task.sh"
FINISH_SCRIPT="$SCRIPT_DIR/backlog-finish-task.sh"
RUNNER_SCRIPT="$SCRIPT_DIR/ralph-run-task-branch.sh"

if [[ ! -x "$CLAIM_SCRIPT" ]]; then
  echo "❌ 找不到或不可执行：$CLAIM_SCRIPT" >&2
  exit 1
fi
if [[ ! -x "$FINISH_SCRIPT" ]]; then
  echo "❌ 找不到或不可执行：$FINISH_SCRIPT" >&2
  exit 1
fi
if [[ ! -x "$RUNNER_SCRIPT" ]]; then
  echo "❌ 找不到或不可执行：$RUNNER_SCRIPT" >&2
  exit 1
fi

# 检测主分支（main 或 master）
MAIN_BRANCH="main"
if ! git -C "$WORKSPACE" rev-parse --verify main >/dev/null 2>&1; then
  if git -C "$WORKSPACE" rev-parse --verify master >/dev/null 2>&1; then
    MAIN_BRANCH="master"
  else
    echo "⚠️  未找到 main/master 分支，将使用当前分支作为基准" >&2
    MAIN_BRANCH="$(git -C "$WORKSPACE" rev-parse --abbrev-ref HEAD)"
  fi
fi

ORIGINAL_BRANCH="$(git -C "$WORKSPACE" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "$MAIN_BRANCH")"

# 确保主分支是最新的
echo "[serial] 更新主分支: $MAIN_BRANCH"
git -C "$WORKSPACE" checkout "$MAIN_BRANCH" >/dev/null 2>&1 || true
git -C "$WORKSPACE" pull >/dev/null 2>&1 || true

# 恢复原分支（如果不同）
if [[ "$ORIGINAL_BRANCH" != "$MAIN_BRANCH" ]]; then
  git -C "$WORKSPACE" checkout "$ORIGINAL_BRANCH" >/dev/null 2>&1 || true
fi

process_task() {
  local task_id="$1"
  local branch_name="task/TASK-${task_id}"
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 处理任务: TASK-$task_id"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # 确保从主分支创建任务分支
  echo "[serial] 切换到主分支: $MAIN_BRANCH"
  git -C "$WORKSPACE" checkout "$MAIN_BRANCH" >/dev/null
  git -C "$WORKSPACE" pull >/dev/null 2>&1 || true
  
  # 检查工作区是否干净
  if [[ -n "$(git -C "$WORKSPACE" status --porcelain)" ]]; then
    echo "⚠️  主分支有未提交更改，先提交..." >&2
    git -C "$WORKSPACE" add -A
    git -C "$WORKSPACE" commit -m "ralph: checkpoint before TASK-$task_id" || {
      echo "❌ 无法提交当前更改，请先手动处理" >&2
      return 1
    }
  fi
  
  # 创建或切换到任务分支
  if git -C "$WORKSPACE" rev-parse --verify "$branch_name" >/dev/null 2>&1; then
    echo "[serial] 切换到已存在的分支: $branch_name"
    git -C "$WORKSPACE" checkout "$branch_name" >/dev/null
  else
    echo "[serial] 创建新分支: $branch_name（从 $MAIN_BRANCH）"
    git -C "$WORKSPACE" checkout -b "$branch_name" "$MAIN_BRANCH" >/dev/null
  fi
  
  # 运行 Ralph
  echo "[serial] 执行 Ralph..."
  set +e
  "$RUNNER_SCRIPT" "$task_id" "$WORKSPACE"
  rc=$?
  set -e
  
  if [[ $rc -ne 0 ]]; then
    echo "❌ Ralph 执行失败（exit=$rc）：TASK-$task_id" >&2
    echo "[serial] 任务状态已重置为 To Do，可重新处理"
    # runner 脚本已经处理了失败情况（重置状态、删除 claim）
    return 1
  fi
  
  # 成功：标记为 Done
  echo "[serial] 标记任务为 Done"
  "$FINISH_SCRIPT" "$task_id" "$WORKSPACE" >/dev/null || {
    echo "⚠️  标记 Done 失败，但任务已成功完成" >&2
  }
  
  # 推送分支
  echo "[serial] 推送分支: $branch_name"
  set +e
  git -C "$WORKSPACE" push -u origin "$branch_name" >/dev/null 2>&1
  push_rc=$?
  set -e
  
  if [[ $push_rc -eq 0 ]]; then
    echo "✅ 分支已推送: $branch_name"
  else
    echo "⚠️  推送失败（可能未配置远程或权限问题）" >&2
  fi
  
  # 获取任务标题（用于 PR）
  local task_title=""
  if command -v backlog >/dev/null 2>&1; then
    task_title="$(backlog task "$task_id" --plain 2>/dev/null | head -n 1 | sed 's/^# *//' || echo "")"
  fi
  if [[ -z "$task_title" ]]; then
    task_title="TASK-$task_id"
  fi
  
  # PR 处理
  if [[ "$SKIP_PR" != "true" ]]; then
    if [[ "$AUTO_CREATE_PR" == "true" ]]; then
      # 自动创建 PR
      if ! command -v gh >/dev/null 2>&1; then
        echo "⚠️  未找到 gh CLI，无法自动创建 PR" >&2
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📝 PR 创建命令（手动执行）："
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "gh pr create \\"
        echo "  --head \"$branch_name\" \\"
        echo "  --base \"$MAIN_BRANCH\" \\"
        echo "  --title \"TASK-$task_id: $task_title\" \\"
        echo "  --body \"来自 backlog 的任务：TASK-$task_id\\n\\n请参考 RALPH_TASK.md / backlog 说明。\""
        echo ""
      else
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📝 自动创建 PR..."
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        set +e
        gh pr create \
          --head "$branch_name" \
          --base "$MAIN_BRANCH" \
          --title "TASK-$task_id: $task_title" \
          --body "来自 backlog 的任务：TASK-$task_id

请参考 RALPH_TASK.md / backlog 说明。" 2>&1
        pr_rc=$?
        set -e
        
        if [[ $pr_rc -eq 0 ]]; then
          echo "✅ PR 创建成功"
        else
          echo "⚠️  PR 创建失败（exit=$pr_rc），请手动创建" >&2
          echo ""
          echo "手动创建命令："
          echo "gh pr create \\"
          echo "  --head \"$branch_name\" \\"
          echo "  --base \"$MAIN_BRANCH\" \\"
          echo "  --title \"TASK-$task_id: $task_title\" \\"
          echo "  --body \"来自 backlog 的任务：TASK-$task_id\\n\\n请参考 RALPH_TASK.md / backlog 说明。\""
        fi
        echo ""
      fi
    else
      # 仅提示 PR 命令
      echo ""
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo "📝 PR 创建命令（可选）："
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo ""
      echo "gh pr create \\"
      echo "  --head \"$branch_name\" \\"
      echo "  --base \"$MAIN_BRANCH\" \\"
      echo "  --title \"TASK-$task_id: $task_title\" \\"
      echo "  --body \"来自 backlog 的任务：TASK-$task_id\\n\\n请参考 RALPH_TASK.md / backlog 说明。\""
      echo ""
    fi
  fi

  # 自动合并到主分支（不依赖 gh）
  if [[ "$AUTO_MERGE" == "true" ]]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔀 自动合并到主分支: $MAIN_BRANCH"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # 确保在主分支上合并
    git -C "$WORKSPACE" checkout "$MAIN_BRANCH" >/dev/null
    git -C "$WORKSPACE" pull >/dev/null 2>&1 || true

    set +e
    git -C "$WORKSPACE" merge --no-ff "$branch_name" -m "ralph: merge TASK-$task_id" 2>&1
    merge_rc=$?
    set -e

    if [[ $merge_rc -ne 0 ]]; then
      echo "⚠️  自动合并失败（可能有冲突）。已尝试回滚合并状态，请手动处理：" >&2
      set +e
      git -C "$WORKSPACE" merge --abort >/dev/null 2>&1
      set -e
      echo "  1) git checkout $MAIN_BRANCH" >&2
      echo "  2) git merge $branch_name" >&2
      echo "  3) 解决冲突后 git add -A && git commit" >&2
      echo "  4) git push origin $MAIN_BRANCH" >&2
    else
      echo "✅ 已合并到 $MAIN_BRANCH"

      set +e
      git -C "$WORKSPACE" push origin "$MAIN_BRANCH" 2>&1
      push_main_rc=$?
      set -e

      if [[ $push_main_rc -ne 0 ]]; then
        echo "⚠️  push 主分支失败（可能未配置远程或权限问题），请手动执行：" >&2
        echo "  git push origin $MAIN_BRANCH" >&2
      else
        echo "✅ 主分支已 push: $MAIN_BRANCH"
      fi
    fi
  fi
  
  # 切换回主分支（准备下一个任务）
  echo "[serial] 切换回主分支: $MAIN_BRANCH"
  git -C "$WORKSPACE" checkout "$MAIN_BRANCH" >/dev/null
  
  echo "✅ 任务完成: TASK-$task_id"
  return 0
}

# 主循环
echo "🚀 开始串行处理 backlog 任务"
echo "主分支: $MAIN_BRANCH"
echo "工作区: $WORKSPACE"
if [[ "$STOP_WHEN_EMPTY" == "false" ]]; then
  echo "模式: 持续等待（--watch）"
else
  echo "模式: 处理完所有 To Do 任务后退出"
fi
echo ""

TASK_COUNT=0

while true; do
  # 尝试抢占一个任务
  set +e
  TASK_ID="$("$CLAIM_SCRIPT" "$WORKSPACE" 2>&1)"
  claim_rc=$?
  set -e
  
  if [[ $claim_rc -ne 0 ]]; then
    if [[ "$STOP_WHEN_EMPTY" == "false" ]]; then
      echo "[serial] 暂无可用任务，等待 ${POLL_INTERVAL}s 后重试..."
      sleep "$POLL_INTERVAL"
      continue
    else
      echo ""
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo "✅ 所有任务处理完成！"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo "共处理任务数: $TASK_COUNT"
      exit 0
    fi
  fi
  
  # 提取任务 ID（backlog-claim-task.sh 输出格式：TASK-56 或类似）
  if [[ "$TASK_ID" =~ TASK-([0-9]+) ]]; then
    TASK_ID="${BASH_REMATCH[1]}"
  elif [[ "$TASK_ID" =~ ^[0-9]+$ ]]; then
    # 直接是数字
    :
  else
    echo "⚠️  无法解析任务 ID: $TASK_ID" >&2
    sleep "$POLL_INTERVAL"
    continue
  fi
  
  # 处理任务
  if process_task "$TASK_ID"; then
    TASK_COUNT=$((TASK_COUNT + 1))
  else
    echo "⚠️  任务 TASK-$TASK_ID 处理失败，继续下一个任务" >&2
  fi
  
  # 短暂休息，避免过于频繁
  sleep 0.5
done
