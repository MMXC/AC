#!/usr/bin/env bash
#
# backlog-queue.sh
#
# 并行 worker 队列：持续从 backlog 拉取未完成任务（默认并发 2），
# 任务完成后继续拉取后续 To Do 任务，直到耗尽为止。
#
# 设计要点：
# - 通过 backlog-claim-task.sh 在“抢占”阶段做并发互斥
# - 默认优先抢最小 TASK 编号（适合用小编号表达依赖顺序）
# - 每个任务会执行你传入的 --run 命令（字符串），并通过环境变量传参：
#     TASK_ID, WORKSPACE, CLAIM_FILE
# - --run 命令退出码为 0 视为成功：自动调用 backlog-finish-task.sh 标 Done
# - 失败默认“冻结”：claim 文件写 final_status=failed，防止自动重试
#   （进程崩溃则仍会被视为 stale，可被重新抢占）
#
# Usage:
#   backlog-queue.sh [--run 'your command'] [--concurrency 4] [--workspace .]
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

WORKSPACE="$(pwd)"
CONCURRENCY=2
RUN_CMD=""
POLL_INTERVAL="0.5"
STOP_WHEN_EMPTY=true

usage() {
  cat <<'EOF'
Usage:
  backlog-queue.sh [--run '<command>'] [options]

Options:
  -w, --workspace DIR       Workspace（默认当前目录）
  -c, --concurrency N       并发数（默认 2）
  --poll SECONDS            轮询间隔（默认 0.5）
  --watch                   队列空了也不退出（持续等待新任务）
  -h, --help                帮助

Execution:
  --run 命令会在子进程执行（bash -lc），并提供环境变量：
    TASK_ID, WORKSPACE, CLAIM_FILE

Examples:
  backlog-queue.sh --run 'echo "do TASK-$TASK_ID"; sleep 1' -c 2
  backlog-queue.sh -c 2     # 默认执行 Ralph worktree 变体

Tips (依赖关系):
  - 如果任务存在严格依赖且只能串行，请用：-c 1
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -w|--workspace)
      WORKSPACE="$2"
      shift 2
      ;;
    -c|--concurrency)
      CONCURRENCY="$2"
      shift 2
      ;;
    --run)
      RUN_CMD="$2"
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
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if ! [[ "$CONCURRENCY" =~ ^[0-9]+$ ]] || [[ "$CONCURRENCY" -lt 1 ]]; then
  echo "❌ --concurrency 必须是 >=1 的整数" >&2
  exit 1
fi

WORKSPACE="$(cd "$WORKSPACE" && pwd)"

CLAIMS_DIR="$WORKSPACE/.ralph/claims"
mkdir -p "$CLAIMS_DIR" 2>/dev/null || true

CLAIM_SCRIPT="$SCRIPT_DIR/backlog-claim-task.sh"
FINISH_SCRIPT="$SCRIPT_DIR/backlog-finish-task.sh"
DEFAULT_RUNNER="$SCRIPT_DIR/ralph-run-task-branch.sh"

# 如果未指定 --run，使用默认 runner（在 start_worker 里动态构建命令）
USE_DEFAULT_RUNNER=false
if [[ -z "$RUN_CMD" ]]; then
  USE_DEFAULT_RUNNER=true
fi

if [[ ! -x "$CLAIM_SCRIPT" ]]; then
  echo "❌ 找不到或不可执行：$CLAIM_SCRIPT" >&2
  exit 1
fi
if [[ ! -x "$FINISH_SCRIPT" ]]; then
  echo "❌ 找不到或不可执行：$FINISH_SCRIPT" >&2
  exit 1
fi
if [[ "$USE_DEFAULT_RUNNER" == "true" ]] && [[ ! -x "$DEFAULT_RUNNER" ]]; then
  echo "❌ 默认 runner 不可执行：$DEFAULT_RUNNER" >&2
  exit 1
fi

is_pid_alive() {
  local pid="$1"
  [[ -z "$pid" ]] && return 1
  [[ "$pid" =~ ^[0-9]+$ ]] || return 1
  kill -0 "$pid" 2>/dev/null
}

mark_claim_failed() {
  local claim_file="$1"
  local exit_code="$2"
  {
    # 覆盖 final_status / exit_code，并保留原信息（简单起见直接追加）
    echo "final_status=failed"
    echo "exit_code=$exit_code"
    echo "finished_at=$(date '+%Y-%m-%d %H:%M:%S')"
  } >> "$claim_file" 2>/dev/null || true
}

start_worker() {
  local tid="$1"
  local claim_file="$CLAIMS_DIR/task-${tid}.claim"

  (
    export TASK_ID="$tid"
    export WORKSPACE="$WORKSPACE"
    export CLAIM_FILE="$claim_file"

    echo "▶️  START TASK-$TASK_ID"

    set +e
    # 如果使用默认 runner，在这里动态构建命令（此时 TASK_ID 和 WORKSPACE 已定义）
    if [[ "$USE_DEFAULT_RUNNER" == "true" ]]; then
      bash -lc "\"$DEFAULT_RUNNER\" \"\$TASK_ID\" \"\$WORKSPACE\""
    else
      bash -lc "$RUN_CMD"
    fi
    rc=$?
    set -e

    if [[ $rc -eq 0 ]]; then
      "$FINISH_SCRIPT" "$TASK_ID" "$WORKSPACE" >/dev/null
      echo "✅ DONE  TASK-$TASK_ID"
      exit 0
    else
      echo "❌ FAIL  TASK-$TASK_ID (exit=$rc)" >&2
      # 失败策略：重置 backlog 状态为 To Do，并删除 claim 文件，让队列可以重新抢占
      if command -v backlog >/dev/null 2>&1; then
        backlog task edit "$TASK_ID" -s "To Do" >/dev/null 2>&1 || true
      fi
      rm -f "$claim_file" 2>/dev/null || true
      exit $rc
    fi
  ) &

  echo $!
}

PIDS=()
PID_TASKS=()

reap_finished() {
  local new_pids=()
  local new_tasks=()
  local i=0
  for pid in "${PIDS[@]:-}"; do
    # 安全访问数组元素（避免 unbound variable）
    local tid="${PID_TASKS[$i]:-}"
    if is_pid_alive "$pid"; then
      new_pids+=("$pid")
      new_tasks+=("$tid")
    else
      # 收割退出码（避免僵尸）
      wait "$pid" 2>/dev/null || true
    fi
    i=$((i + 1))
  done
  PIDS=("${new_pids[@]:-}")
  PID_TASKS=("${new_tasks[@]:-}")
}

empty_polls=0

while true; do
  reap_finished

  running_count="${#PIDS[@]}"

  # 尝试补足并发
  while [[ "$running_count" -lt "$CONCURRENCY" ]]; do
    set +e
    tid="$("$CLAIM_SCRIPT" "$WORKSPACE")"
    claim_rc=$?
    set -e

    if [[ $claim_rc -eq 0 ]]; then
      pid="$(start_worker "$tid")"
      PIDS+=("$pid")
      PID_TASKS+=("$tid")
      running_count="${#PIDS[@]}"
      empty_polls=0
      continue
    fi

    if [[ $claim_rc -eq 2 ]]; then
      empty_polls=$((empty_polls + 1))
      break
    fi

    echo "❌ 抢任务失败（exit=$claim_rc）" >&2
    exit $claim_rc
  done

  # 队列为空且没有在跑的任务：退出（或 watch 模式继续等）
  if [[ "${#PIDS[@]}" -eq 0 ]]; then
    if [[ $empty_polls -ge 1 ]]; then
      if [[ "$STOP_WHEN_EMPTY" == "true" ]]; then
        echo "🏁 队列已空：没有 To Do 任务，退出。"
        exit 0
      fi
    fi
  fi

  sleep "$POLL_INTERVAL"
done
