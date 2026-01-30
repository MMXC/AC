#!/bin/bash
#
# backlog-claim-task.sh
#
# 从 backlog 中“抢占”一个 To Do 任务：
# - 用 mkdir 锁保证并发安全（适配 Windows git-bash/WSL，不依赖 flock）
# - 默认按最小 TASK 编号优先（适合用编号表达依赖顺序的场景）
# - 抢到后把任务状态改为 In Progress
# - 在 .ralph/claims/ 写入占用文件，避免重复抢占
#
# 输出：抢到的任务数字 ID（例如：60）
#
# 退出码：
# 0 = 成功（stdout 输出 TASK_ID 数字）
# 2 = 当前没有可抢占的 To Do 任务
# 1/其他 = 失败
#
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  backlog-claim-task.sh [workspace]

Environment:
  RALPH_WORKER_ID   Optional worker identity string written into claim file

Notes:
  - Uses backlog CLI:
      backlog task list -s "To Do" --plain
      backlog task edit <id> -s "In Progress"
EOF
}

WORKSPACE="${1:-$(pwd)}"
if [[ "${WORKSPACE}" == "-h" || "${WORKSPACE}" == "--help" ]]; then
  usage
  exit 0
fi

WORKSPACE="$(cd "$WORKSPACE" && pwd)"

RALPH_DIR="$WORKSPACE/.ralph"
CLAIMS_DIR="$RALPH_DIR/claims"
LOCK_DIR="$RALPH_DIR/.claim-lock"
LOCK_PID_FILE="$LOCK_DIR/pid"

mkdir -p "$CLAIMS_DIR"

is_pid_alive() {
  local pid="$1"
  [[ -z "$pid" ]] && return 1
  [[ "$pid" =~ ^[0-9]+$ ]] || return 1
  kill -0 "$pid" 2>/dev/null
}

claim_file_status() {
  # echo "running" | "failed" | "stale" | "missing"
  local file="$1"
  if [[ ! -f "$file" ]]; then
    echo "missing"
    return 0
  fi
  local final_status=""
  final_status="$(sed -n 's/^final_status=//p' "$file" 2>/dev/null | head -n 1 || true)"
  if [[ "$final_status" == "failed" ]]; then
    echo "failed"
    return 0
  fi
  local pid=""
  pid="$(sed -n 's/^pid=//p' "$file" 2>/dev/null | head -n 1 || true)"
  if is_pid_alive "$pid"; then
    echo "running"
  else
    echo "stale"
  fi
}

acquire_lock() {
  local tries=200  # ~10s (sleep 0.05)
  local i=0
  while ! mkdir "$LOCK_DIR" 2>/dev/null; do
    # stale lock detection
    if [[ -f "$LOCK_PID_FILE" ]]; then
      local lock_pid=""
      lock_pid="$(cat "$LOCK_PID_FILE" 2>/dev/null || true)"
      if ! is_pid_alive "$lock_pid"; then
        rm -rf "$LOCK_DIR" 2>/dev/null || true
        continue
      fi
    fi
    i=$((i + 1))
    if [[ $i -ge $tries ]]; then
      echo "❌ 获取抢占锁超时：$LOCK_DIR" >&2
      return 1
    fi
    sleep 0.05
  done
  echo "$$" > "$LOCK_PID_FILE" 2>/dev/null || true
  return 0
}

release_lock() {
  rm -rf "$LOCK_DIR" 2>/dev/null || true
}

trap 'release_lock' EXIT

dependencies_satisfied() {
  # 依赖规则：
  # - 如果 backlog/tasks 里对应 md 文件没有 dependencies 字段，则认为无依赖（直接允许）
  # - 如果有 dependencies: 且包含 TASK-<num>，则所有依赖任务的 Status 必须是 Done
  local tid="$1"
  local task_file
  # 任务文件命名约定：backlog/tasks/task-<id> - 标题.md（可能包含空格/中文）
  task_file="$(ls "$WORKSPACE/backlog/tasks/task-${tid} "* 2>/dev/null | head -n 1 || true)"
  if [[ -z "$task_file" ]]; then
    # 找不到文件时保守认为无依赖（由 backlog CLI 本身保障更严格规则）
    return 0
  fi

  # 只解析 YAML frontmatter 中的 dependencies 段
  local deps_block
  deps_block="$(
    awk '
      /^---[[:space:]]*$/ { fm++; next }
      fm == 1 && /^dependencies[[:space:]]*:/ { in_dep=1 }
      fm == 1 && in_dep {
        if (NR > 1 && $0 ~ /^[a-zA-Z0-9_]+:[[:space:]]*/) { exit }
        print
      }
      fm >= 2 { exit }
    ' "$task_file" 2>/dev/null || true
  )"

  if [[ -z "$deps_block" ]]; then
    # 未声明依赖
    return 0
  fi

  # 从 dependencies 内容里提取所有 TASK-<num>
  local dep_ids
  dep_ids="$(printf '%s\n' "$deps_block" | grep -oE 'TASK-[0-9]+' | sort -u || true)"
  if [[ -z "$dep_ids" ]]; then
    return 0
  fi

  local dep
  for dep in $dep_ids; do
    local dep_num="${dep#TASK-}"
    [[ -z "$dep_num" ]] && continue
    # 查询依赖任务状态
    local status_line
    status_line="$(backlog task "$dep_num" --plain 2>/dev/null | grep -i '^Status:' | head -n 1 || true)"
    if [[ -z "$status_line" ]]; then
      # 解析不到状态时，保守起见视为依赖未完成
      return 1
    fi
    local status
    # 常见格式：Status: ○ To Do / Status: ○ Done；去掉 Status: 和可选符号 ○ 后归一化，避免 "○Done" 无法匹配 Done
    status="$(printf '%s\n' "$status_line" | sed -E 's/^Status:[[:space:]]*○?[[:space:]]*//I' | tr -d '[:space:]')"
    case "$status" in
      Done|done|DONE)
        ;;
      *)
        # 只要有一个依赖不是 Done，就不允许抢占
        return 1
        ;;
    esac
  done

  return 0
}

if ! command -v backlog >/dev/null 2>&1; then
  echo "❌ 未找到 backlog CLI（PATH 中没有 backlog）" >&2
  exit 1
fi

acquire_lock

# 获取 To Do 列表，并提取 TASK-<num> 或 task-<num>（config 中 task_prefix 可能为 "task"），按数字排序
task_ids="$(
  backlog task list -s "To Do" --plain 2>/dev/null \
    | grep -oEi 'task-[0-9]+' \
    | sed 's/task-//i' \
    | sort -n -u \
    || true
)"

if [[ -z "$task_ids" ]]; then
  # 无任务可抢占
  [[ -n "${BACKLOG_CLAIM_DEBUG:-}" ]] && echo "[claim-debug] task_ids 为空（list 输出可能无 task-N 或格式不同）" >&2
  exit 2
fi

[[ -n "${BACKLOG_CLAIM_DEBUG:-}" ]] && echo "[claim-debug] 解析到 To Do 任务 ID: $(echo "$task_ids" | tr '\n' ' ')" >&2

selected_id=""

while IFS= read -r tid; do
  [[ -z "$tid" ]] && continue
  [[ "$tid" =~ ^[0-9]+$ ]] || continue

  claim_file="$CLAIMS_DIR/task-${tid}.claim"
  status="$(claim_file_status "$claim_file")"
  case "$status" in
    "missing")
      # 可尝试抢占
      ;;
    "stale")
      # 进程死了、且不是 failed，允许回收并重新抢占
      rm -f "$claim_file" 2>/dev/null || true
      ;;
    "running"|"failed")
      # 被占用或失败冻结，跳过
      [[ -n "${BACKLOG_CLAIM_DEBUG:-}" ]] && echo "[claim-debug] 跳过 task-$tid: claim 状态=$status" >&2
      continue
      ;;
  esac

  # 如果任务声明了 dependencies，则要求所有依赖任务已完成（Done）
  if ! dependencies_satisfied "$tid"; then
    [[ -n "${BACKLOG_CLAIM_DEBUG:-}" ]] && echo "[claim-debug] 跳过 task-$tid: 依赖未满足" >&2
    continue
  fi

  # 标记 backlog 状态为 In Progress（在锁内执行，避免并发抢同一个）
  if ! backlog task edit "$tid" -s "In Progress" >/dev/null 2>&1; then
    # 如果 backlog 更新失败，不占用这个任务，继续找下一个
    [[ -n "${BACKLOG_CLAIM_DEBUG:-}" ]] && echo "[claim-debug] 跳过 task-$tid: backlog edit 失败" >&2
    continue
  fi

  {
    echo "task_id=$tid"
    echo "pid=$$"
    echo "worker_id=${RALPH_WORKER_ID:-}"
    echo "started_at=$(date '+%Y-%m-%d %H:%M:%S')"
    echo "final_status="
  } > "$claim_file"

  selected_id="$tid"
  break
done <<< "$task_ids"

if [[ -z "$selected_id" ]]; then
  [[ -n "${BACKLOG_CLAIM_DEBUG:-}" ]] && echo "[claim-debug] 有 To Do 任务但全部被跳过（可能：claim 占用/失败、依赖未 Done、backlog edit 失败）" >&2
  exit 2
fi

echo "$selected_id"
