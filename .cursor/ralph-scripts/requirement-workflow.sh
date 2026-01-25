#!/bin/bash
# Requirement Workflow: 需求分解 -> 任务创建 -> Ralph 执行
#
# 完整工作流：
# 1. 用户描述需求
# 2. 通过 skill 正交拆分需求
# 3. 拆分为带明确测试标准的单元子任务
# 4. 反馈用户确认
# 5. 确认后创建 backlog 任务
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

# Run decomposer
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
echo "$REQUIREMENT" | python3 "$DECOMPOSER_SCRIPT" 2>/dev/null
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
else
    echo -e "${YELLOW}步骤 3/4: 自动确认（--no-confirm）${NC}"
fi

# Step 4: Create tasks in backlog
echo ""
echo -e "${YELLOW}步骤 4/4: 创建 backlog 任务...${NC}"

# Save tasks to temp file
TEMP_JSON=$(mktemp)
echo "$TASKS_JSON" > "$TEMP_JSON"

# Create tasks
BACKLOG_SCRIPT="$SCRIPT_DIR/backlog-integration.py"
CREATED=$(python3 "$BACKLOG_SCRIPT" create-tasks "$TEMP_JSON" 2>/dev/null)

if [[ -n "$CREATED" ]]; then
    echo -e "${GREEN}✅ 任务创建成功！${NC}"
    echo "$CREATED"
else
    echo "❌ 任务创建失败" >&2
    rm -f "$TEMP_JSON"
    exit 1
fi

rm -f "$TEMP_JSON"

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
