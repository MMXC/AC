#!/bin/bash
# 从已分解的任务文档创建 backlog 任务
#
# Usage:
#   ./create-tasks-from-decomposed.sh BACKEND_TASKS_DECOMPOSED.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${WORKSPACE:-$(pwd)}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <decomposed-tasks.md>" >&2
    exit 1
fi

DECOMPOSED_FILE="$1"
if [[ ! -f "$DECOMPOSED_FILE" ]]; then
    echo "❌ File not found: $DECOMPOSED_FILE" >&2
    exit 1
fi

# Parse tasks using Python script
PARSER_SCRIPT="$SCRIPT_DIR/parse-decomposed-tasks.py"
if [[ ! -f "$PARSER_SCRIPT" ]]; then
    echo "❌ Parser script not found: $PARSER_SCRIPT" >&2
    exit 1
fi

echo -e "${BLUE}解析任务文档: $DECOMPOSED_FILE${NC}"
export PYTHONIOENCODING=utf-8
TASKS_JSON=$(python3 "$PARSER_SCRIPT" "$DECOMPOSED_FILE" --json 2>/dev/null)

if [[ -z "$TASKS_JSON" ]] || [[ "$TASKS_JSON" == "[]" ]]; then
    echo "❌ 解析失败或未找到任务" >&2
    exit 1
fi

TASK_COUNT=$(echo "$TASKS_JSON" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null)
echo -e "${GREEN}✅ 解析完成，找到 $TASK_COUNT 个任务${NC}"
echo ""

# Show tasks summary
echo -e "${YELLOW}任务列表：${NC}"
echo "$TASKS_JSON" | python3 -c "
import sys, json
tasks = json.load(sys.stdin)
for i, task in enumerate(tasks, 1):
    print(f'{i}. {task[\"id\"]}: {task[\"title\"]}')
" 2>/dev/null
echo ""

# Confirm
read -p "是否创建这些任务到 backlog? [Y/n] " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Nn]$ ]]; then
    echo "已取消。"
    exit 0
fi

echo ""
echo -e "${YELLOW}开始创建任务...${NC}"

# Check backlog CLI
USE_CLI=false
if command -v backlog &> /dev/null; then
    if backlog --version &>/dev/null || backlog --help &>/dev/null || backlog task list --plain &>/dev/null 2>&1; then
        USE_CLI=true
        echo "（使用 backlog.md CLI 创建任务）"
    else
        echo "（backlog.md CLI 存在但无法正常工作，使用文件模式）"
    fi
else
    echo "（backlog.md CLI 不可用，使用文件模式）"
fi
echo ""

# Create tasks
CREATED_COUNT=0
FAILED_COUNT=0
CREATED_IDS=()

set +e
while IFS= read -r task_json; do
    [[ -z "$task_json" ]] && continue
    
    # Extract task fields
    title=$(echo "$task_json" | python3 -c "import sys, json; task=json.load(sys.stdin); print(task.get('title', ''))" 2>/dev/null)
    description=$(echo "$task_json" | python3 -c '
import sys, json
task = json.load(sys.stdin)
desc = task.get("description", "")
test_cmd = task.get("test_command", "")
if test_cmd:
    full_desc = desc + "\n\n**Test Command**: `" + test_cmd + "`"
else:
    full_desc = desc
print(full_desc)
' 2>/dev/null)
    
    # Extract success criteria
    success_criteria=$(echo "$task_json" | python3 -c '
import sys, json
task = json.load(sys.stdin)
criteria = task.get("success_criteria", [])
for c in criteria:
    print(c)
' 2>/dev/null)
    
    # Extract test cases and add to description
    test_cases=$(echo "$task_json" | python3 -c '
import sys, json
task = json.load(sys.stdin)
tc = task.get("test_cases", {})
if tc:
    output = []
    if tc.get("test_data"):
        output.append("**测试数据**:")
        for i, td in enumerate(tc["test_data"], 1):
            output.append(f"{i}. 输入: `{td.get(\"input\", \"\")}`")
            output.append(f"   预期输出: `{td.get(\"expected_output\", \"\")}`")
    if tc.get("test_scenarios"):
        output.append("**测试场景**:")
        for i, ts in enumerate(tc["test_scenarios"], 1):
            output.append(f"{i}. {ts}")
    if tc.get("assertions"):
        output.append("**断言示例**:")
        for i, a in enumerate(tc["assertions"], 1):
            output.append(f"{i}. `{a}`")
    print("\n".join(output))
' 2>/dev/null)
    
    # Build full description with test cases
    if [[ -n "$test_cases" ]]; then
        full_description=$(printf "%s\n\n**测试用例**:\n\n%s" "$description" "$test_cases")
    else
        full_description="$description"
    fi
    
    # Build acceptance criteria arguments
    ac_args=()
    while IFS= read -r criterion; do
        [[ -n "$criterion" ]] && ac_args+=("--ac" "$criterion")
    done <<< "$success_criteria"
    
    # Add test scenarios as ACs
    if [[ -n "$test_cases" ]]; then
        while IFS= read -r line; do
            if [[ "$line" =~ ^[0-9]+\.\ 场景 ]]; then
                scenario="${line#*. }"
                ac_args+=("--ac" "测试场景: $scenario")
            fi
        done <<< "$test_cases"
    fi
    
    echo "  正在创建: $title"
    
    # Try backlog CLI first
    if [[ "$USE_CLI" == "true" ]]; then
        result=$(backlog task create "$title" -d "$full_description" "${ac_args[@]}" 2>&1) || true
        cli_exit=$?
        
        if [[ $cli_exit -eq 0 ]]; then
            # Extract task ID
            task_id=$(echo "$result" | sed -n 's/.*Created task \([0-9]\+\).*/\1/p' 2>/dev/null || echo "")
            
            if [[ -n "$task_id" ]]; then
                echo -e "    ${GREEN}✅ 使用 backlog.md CLI 创建成功 (ID: $task_id)${NC}"
                CREATED_IDS+=("$task_id")
                CREATED_COUNT=$((CREATED_COUNT + 1))
            else
                echo -e "    ${GREEN}✅ 使用 backlog.md CLI 创建成功${NC}"
                CREATED_COUNT=$((CREATED_COUNT + 1))
            fi
        else
            echo -e "    ${YELLOW}⚠️  CLI 创建失败: $result${NC}" >&2
            echo -e "    ${YELLOW}尝试文件模式...${NC}"
            USE_CLI=false
        fi
    fi
    
    # Fallback to file mode
    if [[ "$USE_CLI" != "true" ]]; then
        # Use Python script to create task
        backlog_script="$SCRIPT_DIR/backlog-integration.py"
        if [[ -f "$backlog_script" ]]; then
            if python3 "$backlog_script" create-task "$task_json" &>/dev/null; then
                echo -e "    ${GREEN}✅ 使用文件模式创建成功${NC}"
                CREATED_COUNT=$((CREATED_COUNT + 1))
            else
                echo -e "    ${RED}❌ 创建失败${NC}" >&2
                FAILED_COUNT=$((FAILED_COUNT + 1))
            fi
        else
            echo -e "    ${RED}❌ backlog-integration.py 未找到${NC}" >&2
            FAILED_COUNT=$((FAILED_COUNT + 1))
        fi
    fi
    
done < <(echo "$TASKS_JSON" | python3 -c "import sys, json; [print(json.dumps(task)) for task in json.load(sys.stdin)]" 2>/dev/null)
set -e

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ 任务创建完成${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "创建成功: $CREATED_COUNT"
echo "创建失败: $FAILED_COUNT"
echo ""

if [[ ${#CREATED_IDS[@]} -gt 0 ]]; then
    echo "创建的任务 ID:"
    for id in "${CREATED_IDS[@]}"; do
        echo "  - TASK-$id"
    done
    echo ""
fi

echo "下一步："
echo "  1. 查看任务: backlog task list --plain"
echo "  2. 开始执行: ./.cursor/ralph-scripts/ralph-once.sh"
echo ""
