#!/usr/bin/env bash
#
# backlog-serial.sh
#
# 串行处理 backlog 任务：逐个抢占、执行、完成，直到没有 To Do 任务为止。
# 遵循 ralph-git-workflow 规范：
# - backlog 状态变更（In Progress / Done / To Do）仅在 main 上执行并提交
# - 每个任务在独立分支 task/TASK-<id> 上工作
# - 完成后推送分支、可选合并到 main，在 main 上标记 Done 并提交
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
  1. 在 main 上抢占任务（backlog → In Progress），若有变更则提交到 main
  2. 创建/切换到分支 task/TASK-<id>，生成 RALPH_TASK.md 并运行 Ralph
  3. 成功：推送任务分支；若 --auto-merge 则合并 main→任务分支→main，在 main 上标记 Done 并提交
  4. 失败：在 main 上标记 To Do 并提交（由 runner 执行）
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

# 约定：backlog 变更只在 main 上执行并提交。进入主循环前确保在 main。
echo "[serial] 更新主分支: $MAIN_BRANCH"
git -C "$WORKSPACE" checkout "$MAIN_BRANCH" >/dev/null 2>&1 || true
git -C "$WORKSPACE" pull >/dev/null 2>&1 || true

process_task() {
  local task_id="$1"
  local branch_name="task/TASK-${task_id}"
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 处理任务: TASK-$task_id"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # 约定：抢占已在 main 上执行，若有 backlog 变更则在此提交到 main
  if [[ -n "$(git -C "$WORKSPACE" status --porcelain)" ]]; then
    echo "[serial] 在 main 上提交 backlog 抢占变更: TASK-$task_id In Progress"
    git -C "$WORKSPACE" add -A
    git -C "$WORKSPACE" commit -m "ralph: claim TASK-$task_id In Progress" || {
      echo "❌ 无法提交抢占变更，请先手动处理" >&2
      return 1
    }
  fi
  
  # 创建或切换到任务分支（从当前 main）
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
    echo "[serial] 任务状态已在 main 上重置为 To Do 并提交"
    # runner 已切回 main、执行 backlog To Do 并提交
    return 1
  fi
  
  # 成功：Done 仅在合并到 main 后在 main 上执行（见下方 --auto-merge 块）
  
  # 推送任务分支
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

  # 自动合并到主分支（不依赖 gh）：先合 main→任务分支，再合任务分支→main，在 main 上标记 Done 并提交
  if [[ "$AUTO_MERGE" == "true" ]]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔀 自动合并到主分支: $MAIN_BRANCH"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # 暂存 .ralph 运行时日志，避免阻止 checkout
    git -C "$WORKSPACE" stash push -u -m "ralph serial logs" -- .ralph/activity.log .ralph/signal_debug.log 2>/dev/null || true

    # 1) 在任务分支上合并 main，减少后续冲突
    echo "[serial] 在任务分支上合并 $MAIN_BRANCH..."
    set +e
    git -C "$WORKSPACE" merge "$MAIN_BRANCH" -m "ralph: merge $MAIN_BRANCH into TASK-$task_id" 2>&1
    merge_main_rc=$?
    set -e
    if [[ $merge_main_rc -ne 0 ]]; then
      git -C "$WORKSPACE" stash pop 2>/dev/null || true
      echo "⚠️  合并 $MAIN_BRANCH 到任务分支失败（可能有冲突），请手动处理：" >&2
      echo "  git checkout $branch_name && git merge $MAIN_BRANCH" >&2
      git -C "$WORKSPACE" checkout "$MAIN_BRANCH" >/dev/null 2>&1 || true
      return 1
    fi

    # 2) 切回 main，拉取后合并任务分支
    git -C "$WORKSPACE" checkout "$MAIN_BRANCH" >/dev/null
    git -C "$WORKSPACE" pull >/dev/null 2>&1 || true

    set +e
    git -C "$WORKSPACE" merge --no-ff "$branch_name" -m "ralph: merge TASK-$task_id" 2>&1
    merge_rc=$?
    set -e

    if [[ $merge_rc -ne 0 ]]; then
      git -C "$WORKSPACE" stash pop 2>/dev/null || true
      echo "⚠️  合并任务分支到 $MAIN_BRANCH 失败（可能有冲突）。已尝试回滚，请手动处理：" >&2
      set +e
      git -C "$WORKSPACE" merge --abort >/dev/null 2>&1
      set -e
      echo "  1) git checkout $MAIN_BRANCH" >&2
      echo "  2) git merge $branch_name" >&2
      echo "  3) 解决冲突后 git add -A && git commit" >&2
      echo "  4) git push origin $MAIN_BRANCH" >&2
      return 1
    fi

    # 3) 约定：在 main 上标记 Done 并提交
    echo "[serial] 在 main 上标记任务为 Done"
    "$FINISH_SCRIPT" "$task_id" "$WORKSPACE" >/dev/null || true
    if [[ -n "$(git -C "$WORKSPACE" status --porcelain)" ]]; then
      git -C "$WORKSPACE" add -A
      git -C "$WORKSPACE" commit -m "ralph: TASK-$task_id Done" >/dev/null 2>&1 || true
    fi

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
    git -C "$WORKSPACE" stash pop 2>/dev/null || true
  else
    echo "[serial] 未使用 --auto-merge；合并到 $MAIN_BRANCH 后请在 main 上执行："
    echo "  backlog task edit $task_id -s Done   # 若有变更再 git add -A && git commit -m 'ralph: TASK-$task_id Done'"
  fi

  # 切换回主分支（准备下一个任务）
  echo "[serial] 切换回主分支: $MAIN_BRANCH"
  git -C "$WORKSPACE" stash push -u -m "ralph serial logs" -- .ralph/activity.log .ralph/signal_debug.log 2>/dev/null || true
  git -C "$WORKSPACE" checkout "$MAIN_BRANCH" >/dev/null
  git -C "$WORKSPACE" stash pop 2>/dev/null || true

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
  # 约定：抢占只在 main 上执行。先确保在 main 再 claim。
  echo "[serial] 确保在 main: $MAIN_BRANCH"
  git -C "$WORKSPACE" checkout "$MAIN_BRANCH" >/dev/null 2>&1 || true
  git -C "$WORKSPACE" pull >/dev/null 2>&1 || true

  # 尝试抢占一个任务（backlog → In Progress，可能修改 backlog 文件）
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
