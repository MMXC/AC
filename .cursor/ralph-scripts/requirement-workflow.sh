#!/bin/bash
# Requirement Workflow: 需求分解 -> 任务创建 -> Ralph 执行
#
# 完整工作流：
# 1. 用户描述需求
# 2. 通过 skill 正交拆分需求
# 3. 拆分为带明确测试标准的单元子任务
# 4. 反馈用户确认
# 5. 确认后创建 backlog 任务（使用 backlog.md CLI）
# 6. 询问是否立即执行
#
# Usage:
#   ./requirement-workflow.sh "构建一个 TypeScript CLI todo 应用"
#   ./requirement-workflow.sh --file requirement.txt

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${WORKSPACE:-$(pwd)}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

show_help() {
    cat << 'EOF'
Requirement Workflow: 需求分解与任务创建

Usage:
  ./requirement-workflow.sh "<requirement description>"
  ./requirement-workflow.sh --file <file>
  ./requirement-workflow.sh --interactive

Options:
  --file <file>      Read requirement from file
  --interactive      Interactive mode (prompt for requirement)
  --no-confirm       Skip confirmation prompts
  --auto-execute     Automatically execute with Ralph after creation
  -h, --help         Show this help

Examples:
  ./requirement-workflow.sh "构建一个 TypeScript CLI todo 应用，支持 add/list/done 命令"
  ./requirement-workflow.sh --file my-requirement.txt
EOF
}

# Parse arguments
REQUIREMENT=""
FROM_FILE=false
INTERACTIVE=false
NO_CONFIRM=false
AUTO_EXECUTE=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --file)
            FROM_FILE=true
            REQUIREMENT_FILE="$2"
            shift 2
            ;;
        --interactive)
            INTERACTIVE=true
            shift
            ;;
        --no-confirm)
            NO_CONFIRM=true
            shift
            ;;
        --auto-execute)
            AUTO_EXECUTE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        -*)
            echo "Unknown option: $1" >&2
            show_help
            exit 1
            ;;
        *)
            REQUIREMENT="$1"
            shift
            ;;
    esac
done

# Get requirement
if [[ "$INTERACTIVE" == "true" ]]; then
    echo -e "${BLUE}请输入需求描述：${NC}"
    read -r REQUIREMENT
elif [[ "$FROM_FILE" == "true" ]]; then
    if [[ ! -f "$REQUIREMENT_FILE" ]]; then
        echo "❌ File not found: $REQUIREMENT_FILE" >&2
        exit 1
    fi
    REQUIREMENT=$(cat "$REQUIREMENT_FILE")
elif [[ -z "$REQUIREMENT" ]]; then
    echo "❌ No requirement provided" >&2
    show_help
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "📋 Requirement Workflow: 需求分解与任务创建"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo -e "${BLUE}需求描述：${NC}"
echo "$REQUIREMENT"
echo ""

# Step 1: Decompose requirement
echo -e "${YELLOW}步骤 1/4: 正交分解需求...${NC}"
DECOMPOSER_SCRIPT="$SCRIPT_DIR/../skills/requirement-decomposer/scripts/decompose_requirement.py"

if [[ ! -f "$DECOMPOSER_SCRIPT" ]]; then
    echo "❌ Decomposer script not found: $DECOMPOSER_SCRIPT" >&2
    exit 1
fi

# Run decomposer (ensure UTF-8 encoding)
export PYTHONIOENCODING=utf-8
TASKS_JSON=$(echo "$REQUIREMENT" | python3 "$DECOMPOSER_SCRIPT" --json 2>/dev/null)

if [[ -z "$TASKS_JSON" ]] || [[ "$TASKS_JSON" == "[]" ]]; then
    echo "❌ Failed to decompose requirement" >&2
    exit 1
fi

# Parse tasks
TASK_COUNT=$(echo "$TASKS_JSON" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null)
echo -e "${GREEN}✅ 分解完成，生成 $TASK_COUNT 个子任务${NC}"
echo ""

# Step 2: Show decomposition result
echo -e "${YELLOW}步骤 2/4: 展示分解结果...${NC}"
echo "$REQUIREMENT" | python3 "$DECOMPOSER_SCRIPT" 2>/dev/null | cat
echo ""

# Step 3: User confirmation
if [[ "$NO_CONFIRM" != "true" ]]; then
    echo -e "${YELLOW}步骤 3/4: 等待用户确认...${NC}"
    echo ""
    read -p "是否创建这些任务到 backlog? [Y/n] " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        echo "已取消。"
        exit 0
    fi
    
    # If user pressed Enter or Y, continue
    echo "继续创建任务..."
else
    echo -e "${YELLOW}步骤 3/4: 自动确认（--no-confirm）${NC}"
fi

# Step 4: Create tasks in backlog using backlog.md CLI
echo ""
echo -e "${YELLOW}步骤 4/4: 创建 backlog 任务...${NC}"

# Check if backlog CLI is available and working
USE_CLI=false
if command -v backlog &> /dev/null; then
    # Test if backlog CLI actually works
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

# Parse tasks JSON and create each task
# Use process substitution to avoid subshell issues
# Temporarily disable exit on error for the loop
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
    # Use printf to properly handle newlines
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
            # Try to extract task ID (use sed as fallback if grep -P not available)
            task_id=""
            if command -v grep &> /dev/null && grep --version 2>/dev/null | grep -q "GNU"; then
                task_id=$(echo "$result" | grep -oP 'Created task \K\d+' 2>/dev/null || echo "")
            else
                task_id=$(echo "$result" | sed -n 's/.*Created task \([0-9]\+\).*/\1/p' 2>/dev/null || echo "")
            fi
            
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
        temp_json=$(mktemp)
        echo "$task_json" > "$temp_json"
        
        backlog_script="$SCRIPT_DIR/backlog-integration.py"
        if [[ -f "$backlog_script" ]]; then
            if python3 "$backlog_script" create-task "$(cat "$temp_json")" >/dev/null 2>&1; then
                echo -e "    ${GREEN}✅ 使用文件模式创建成功${NC}"
                CREATED_COUNT=$((CREATED_COUNT + 1))
            else
                echo -e "    ${RED}❌ 创建失败${NC}" >&2
                FAILED_COUNT=$((FAILED_COUNT + 1))
            fi
        else
            echo -e "    ${RED}❌ 无法创建任务${NC}" >&2
            FAILED_COUNT=$((FAILED_COUNT + 1))
        fi
        rm -f "$temp_json"
    fi
    echo ""
done < <(echo "$TASKS_JSON" | python3 -c "
import sys, json
tasks = json.load(sys.stdin)
for task in tasks:
    print(json.dumps(task, ensure_ascii=False))
")
# Re-enable exit on error
set -e

# Summary
if [[ $CREATED_COUNT -gt 0 ]]; then
    echo -e "${GREEN}✅ 成功创建 $CREATED_COUNT 个任务${NC}"
    if [[ ${#CREATED_IDS[@]} -gt 0 ]]; then
        echo "任务 ID: ${CREATED_IDS[*]}"
    fi
else
    echo -e "${RED}❌ 任务创建失败${NC}" >&2
    exit 1
fi

if [[ $FAILED_COUNT -gt 0 ]]; then
    echo -e "${YELLOW}⚠️  $FAILED_COUNT 个任务创建失败${NC}" >&2
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo -e "${GREEN}🎉 工作流完成！${NC}"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Step 5: Ask about Ralph execution
if [[ "$AUTO_EXECUTE" == "true" ]]; then
    echo -e "${BLUE}自动启动 Ralph 执行第一个任务...${NC}"
    source "$SCRIPT_DIR/ralph-common.sh"
    if load_task_from_backlog "$WORKSPACE" "$SCRIPT_DIR"; then
        echo ""
        echo "运行 Ralph:"
        echo "  ./.cursor/ralph-scripts/ralph-once.sh"
        echo "  或"
        echo "  ./.cursor/ralph-scripts/ralph-loop.sh"
    fi
elif [[ "$NO_CONFIRM" != "true" ]]; then
    echo -e "${BLUE}是否立即使用 Ralph 执行第一个任务？${NC}"
    read -p "[y/N] " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "启动 Ralph..."
        source "$SCRIPT_DIR/ralph-common.sh"
        if load_task_from_backlog "$WORKSPACE" "$SCRIPT_DIR"; then
            echo ""
            echo "运行以下命令开始执行："
            echo "  ./.cursor/ralph-scripts/ralph-once.sh"
            echo "  或"
            echo "  ./.cursor/ralph-scripts/ralph-loop.sh"
        fi
    else
        echo ""
        echo "稍后可以运行以下命令执行任务："
        echo "  ./.cursor/ralph-scripts/ralph-once.sh"
        echo "  或"
        echo "  ./.cursor/ralph-scripts/ralph-loop.sh"
    fi
fi

echo ""
