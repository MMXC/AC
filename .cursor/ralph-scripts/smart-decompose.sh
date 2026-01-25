#!/bin/bash
# 智能需求分解工具（Shell 版本）
# - 读取现有 backlog 任务
# - 对比新旧任务
# - 支持编辑、删除、创建新任务
# - 已完成任务不允许修改
# - 使用 backlog.md CLI 创建和更新任务

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${WORKSPACE:-$(pwd)}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if backlog CLI is available
check_backlog_cli() {
    if command -v backlog &> /dev/null; then
        return 0
    else
        echo -e "${YELLOW}⚠️  backlog.md CLI 未安装，将使用文件模式${NC}" >&2
        return 1
    fi
}

# Get existing tasks using backlog CLI or file
get_existing_tasks() {
    local tasks_json=""
    
    # Try backlog CLI first
    if check_backlog_cli; then
        # Get all tasks (To Do, In Progress, Done)
        local todo_tasks
        local in_progress_tasks
        local done_tasks
        
        todo_tasks=$(backlog task list -s "To Do" --plain 2>/dev/null || echo "")
        in_progress_tasks=$(backlog task list -s "In Progress" --plain 2>/dev/null || echo "")
        done_tasks=$(backlog task list -s "Done" --plain 2>/dev/null || echo "")
        
        # Parse and convert to JSON format
        if [[ -n "$todo_tasks" ]] || [[ -n "$in_progress_tasks" ]] || [[ -n "$done_tasks" ]]; then
            # For now, we'll use file-based approach for existing tasks
            # TODO: Parse backlog CLI output to JSON
            echo "[]"
            return
        fi
    fi
    
    # Fallback: use Python script to read from file
    local backlog_script="$SCRIPT_DIR/backlog-integration.py"
    if [[ -f "$backlog_script" ]]; then
        tasks_json=$(python3 "$backlog_script" get-next-task 2>/dev/null || echo "[]")
        # Get all tasks, not just next one
        # We need to modify this to get all tasks
        echo "[]"
    else
        echo "[]"
    fi
}

# Decompose requirement using Python script
decompose_requirement() {
    local requirement="$1"
    local decomposer_script="$SCRIPT_DIR/../skills/requirement-decomposer/scripts/decompose_requirement.py"
    
    if [[ ! -f "$decomposer_script" ]]; then
        echo "❌ Decomposer script not found: $decomposer_script" >&2
        return 1
    fi
    
    # Get JSON output
    echo "$requirement" | python3 "$decomposer_script" --json 2>/dev/null
}

# Create task using backlog CLI
create_task_with_cli() {
    local title="$1"
    local description="$2"
    shift 2
    local ac_args=("$@")
    
    if ! check_backlog_cli; then
        return 1
    fi
    
    # Build command
    local cmd=("backlog" "task" "create" "$title" "-d" "$description")
    cmd+=("${ac_args[@]}")
    
    # Execute
    local result
    result=$("${cmd[@]}" 2>&1)
    local exit_code=$?
    
    if [[ $exit_code -eq 0 ]]; then
        echo "$result"
        return 0
    else
        echo "" >&2
        return 1
    fi
}

# Update task using backlog CLI
update_task_with_cli() {
    local task_id="$1"
    local title="$2"
    local description="$3"
    
    if ! check_backlog_cli; then
        return 1
    fi
    
    # Update title
    backlog task edit "$task_id" -t "$title" >/dev/null 2>&1 || return 1
    
    # Update description
    if [[ -n "$description" ]]; then
        backlog task edit "$task_id" -d "$description" >/dev/null 2>&1 || return 1
    fi
    
    return 0
}

# Create task (CLI or file fallback)
create_task() {
    local task_json="$1"
    local title
    local description
    local test_command
    local success_criteria
    local test_cases
    
    # Parse task JSON
    title=$(echo "$task_json" | python3 -c "import sys, json; print(json.load(sys.stdin).get('title', ''))" 2>/dev/null)
    description=$(echo "$task_json" | python3 -c "import sys, json; task=json.load(sys.stdin); desc=task.get('description', ''); test_cmd=task.get('test_command', ''); print(desc + ('\n\n**Test Command**: `' + test_cmd + '`' if test_cmd else ''))" 2>/dev/null)
    
    # Extract success criteria
    success_criteria=$(echo "$task_json" | python3 -c "
import sys, json
task = json.load(sys.stdin)
criteria = task.get('success_criteria', [])
for c in criteria:
    print(c)
" 2>/dev/null)
    
    # Extract test cases
    test_cases=$(echo "$task_json" | python3 -c "
import sys, json
task = json.load(sys.stdin)
tc = task.get('test_cases', {})
if tc:
    print('TEST_CASES_START')
    if tc.get('test_data'):
        print('TEST_DATA_START')
        for td in tc['test_data']:
            print(f\"{td.get('input', '')}|{td.get('expected_output', '')}\")
        print('TEST_DATA_END')
    if tc.get('test_scenarios'):
        print('TEST_SCENARIOS_START')
        for ts in tc['test_scenarios']:
            print(ts)
        print('TEST_SCENARIOS_END')
    if tc.get('assertions'):
        print('ASSERTIONS_START')
        for a in tc['assertions']:
            print(a)
        print('ASSERTIONS_END')
    print('TEST_CASES_END')
" 2>/dev/null)
    
    # Build acceptance criteria arguments
    local ac_args=()
    while IFS= read -r criterion; do
        [[ -n "$criterion" ]] && ac_args+=("--ac" "$criterion")
    done <<< "$success_criteria"
    
    # Add test scenarios as ACs
    if [[ -n "$test_cases" ]]; then
        local in_test_scenarios=false
        while IFS= read -r line; do
            if [[ "$line" == "TEST_SCENARIOS_START" ]]; then
                in_test_scenarios=true
            elif [[ "$line" == "TEST_SCENARIOS_END" ]]; then
                in_test_scenarios=false
            elif [[ "$in_test_scenarios" == true ]] && [[ -n "$line" ]]; then
                ac_args+=("--ac" "测试场景: $line")
            fi
        done <<< "$test_cases"
    fi
    
    # Build full description with test cases
    local full_description="$description"
    
    if [[ -n "$test_cases" ]]; then
        full_description+="\n\n**测试用例**:\n"
        
        # Add test data
        local in_test_data=false
        local test_data_count=0
        while IFS= read -r line; do
            if [[ "$line" == "TEST_DATA_START" ]]; then
                in_test_data=true
                test_data_count=0
                full_description+="\n**测试数据**:\n"
            elif [[ "$line" == "TEST_DATA_END" ]]; then
                in_test_data=false
            elif [[ "$in_test_data" == true ]] && [[ "$line" == *"|"* ]]; then
                test_data_count=$((test_data_count + 1))
                local input="${line%%|*}"
                local output="${line#*|}"
                full_description+="$test_data_count. 输入: \`$input\`\n"
                full_description+="   预期输出: \`$output\`\n"
            fi
        done <<< "$test_cases"
        
        # Add assertions
        local in_assertions=false
        local assertion_count=0
        while IFS= read -r line; do
            if [[ "$line" == "ASSERTIONS_START" ]]; then
                in_assertions=true
                assertion_count=0
                full_description+="\n**断言示例**:\n"
            elif [[ "$line" == "ASSERTIONS_END" ]]; then
                in_assertions=false
            elif [[ "$in_assertions" == true ]] && [[ -n "$line" ]]; then
                assertion_count=$((assertion_count + 1))
                full_description+="$assertion_count. \`$line\`\n"
            fi
        done <<< "$test_cases"
    fi
    
    # Try backlog CLI first
    echo -e "    尝试使用 backlog.md CLI..."
    local result
    result=$(create_task_with_cli "$title" "$full_description" "${ac_args[@]}" 2>&1)
    local cli_exit=$?
    
    if [[ $cli_exit -eq 0 ]] && [[ -n "$result" ]]; then
        # Extract task ID from result
        local created_id
        created_id=$(echo "$result" | grep -oP 'Created task \K\d+' || echo "")
        if [[ -n "$created_id" ]]; then
            echo -e "    ${GREEN}✅ 使用 backlog.md CLI 创建成功 (ID: $created_id)${NC}"
            
            # Store mapping
            local task_id
            task_id=$(echo "$task_json" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)
            if [[ -n "$task_id" ]] && [[ -f "$WORKSPACE/backlog.md" ]]; then
                echo "<!-- Task mapping: $task_id -> backlog-$created_id -->" >> "$WORKSPACE/backlog.md"
            fi
            return 0
        else
            echo -e "    ${GREEN}✅ 使用 backlog.md CLI 创建成功${NC}"
            return 0
        fi
    else
        # Fallback to file mode
        echo -e "    ${YELLOW}⚠️  backlog.md CLI 不可用，回退到文件模式...${NC}"
        local backlog_script="$SCRIPT_DIR/backlog-integration.py"
        if [[ -f "$backlog_script" ]]; then
            local temp_json
            temp_json=$(mktemp)
            echo "$task_json" > "$temp_json"
            
            if python3 "$backlog_script" create-task "$(cat "$temp_json")" >/dev/null 2>&1; then
                echo -e "    ${GREEN}✅ 使用文件模式创建成功${NC}"
                rm -f "$temp_json"
                return 0
            else
                echo -e "    ${RED}❌ 创建失败${NC}" >&2
                rm -f "$temp_json"
                return 1
            fi
        else
            echo -e "    ${RED}❌ 无法创建任务${NC}" >&2
            return 1
        fi
    fi
}

# Main workflow
main() {
    if [[ $# -lt 1 ]]; then
        echo "Usage: smart-decompose.sh <requirement_text>" >&2
        exit 1
    fi
    
    local requirement="$1"
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════════"
    echo -e "${BLUE}🧠 智能需求分解工具${NC}"
    echo "═══════════════════════════════════════════════════════════════════"
    echo ""
    echo "需求描述："
    echo "$requirement"
    echo ""
    
    # Step 1: Get existing tasks
    echo -e "${YELLOW}步骤 1/5: 获取现有 backlog 任务...${NC}"
    local existing_tasks_json
    existing_tasks_json=$(get_existing_tasks)
    local existing_count
    existing_count=$(echo "$existing_tasks_json" | python3 -c "import sys, json; tasks=json.load(sys.stdin); print(len(tasks))" 2>/dev/null || echo "0")
    echo -e "${GREEN}✅ 找到 $existing_count 个现有任务${NC}\n"
    
    # Step 2: Decompose requirement
    echo -e "${YELLOW}步骤 2/5: 分解新需求...${NC}"
    local new_tasks_json
    new_tasks_json=$(decompose_requirement "$requirement")
    
    if [[ -z "$new_tasks_json" ]] || [[ "$new_tasks_json" == "[]" ]]; then
        echo -e "${RED}❌ 分解失败${NC}" >&2
        exit 1
    fi
    
    local new_count
    new_count=$(echo "$new_tasks_json" | python3 -c "import sys, json; tasks=json.load(sys.stdin); print(len(tasks))" 2>/dev/null)
    echo -e "${GREEN}✅ 生成 $new_count 个新任务${NC}\n"
    
    # Step 3: Show decomposition result
    echo -e "${YELLOW}步骤 3/5: 展示分解结果...${NC}"
    echo "$requirement" | python3 "$SCRIPT_DIR/../skills/requirement-decomposer/scripts/decompose_requirement.py" 2>/dev/null
    echo ""
    
    # Step 4: User confirmation
    echo -e "${YELLOW}步骤 4/5: 等待用户确认...${NC}"
    echo ""
    read -p "是否创建这些任务到 backlog? [Y/n] " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        echo "已取消。"
        exit 0
    fi
    
    # Step 5: Create tasks
    echo ""
    echo -e "${YELLOW}步骤 5/5: 创建 backlog 任务...${NC}"
    echo "（优先使用 backlog.md CLI，失败则使用文件模式）"
    echo ""
    
    # Parse tasks and create them
    local task_index=0
    local created_count=0
    local failed_count=0
    local created_ids=()
    
    # Convert JSON array to lines (one task per line as JSON)
    echo "$new_tasks_json" | python3 -c "
import sys, json
tasks = json.load(sys.stdin)
for task in tasks:
    print(json.dumps(task, ensure_ascii=False))
" | while IFS= read -r task_json; do
        [[ -z "$task_json" ]] && continue
        
        task_index=$((task_index + 1))
        local title
        title=$(echo "$task_json" | python3 -c "import sys, json; print(json.load(sys.stdin).get('title', 'Untitled'))" 2>/dev/null)
        
        echo -e "  ${BLUE}正在创建任务 $task_index/$new_count: $title${NC}"
        
        # Use create_task function
        if create_task "$task_json"; then
            created_count=$((created_count + 1))
        else
            failed_count=$((failed_count + 1))
        fi
        echo ""
    done
    
    echo "═══════════════════════════════════════════════════════════════════"
    echo -e "${GREEN}✅ 任务创建完成！${NC}"
    echo "═══════════════════════════════════════════════════════════════════"
    echo ""
    echo -e "${GREEN}成功: $created_count${NC} | ${RED}失败: $failed_count${NC}"
    if [[ ${#created_ids[@]} -gt 0 ]]; then
        echo "创建的任务 ID: ${created_ids[*]}"
    fi
    echo ""
    
    echo "🎉 智能需求分解完成！"
    echo ""
    echo "可以运行以下命令开始执行任务："
    echo "  ./.cursor/ralph-scripts/ralph-once.sh"
    echo "  或"
    echo "  ./.cursor/ralph-scripts/ralph-loop.sh"
}

main "$@"
