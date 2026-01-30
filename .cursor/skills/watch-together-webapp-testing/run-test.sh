#!/usr/bin/env bash
#
# watch-together-webapp-testing 技能测试运行器
#
# 用法:
#   run-test.sh TASK-32
#   run-test.sh TASK-32 [RALPH_TASK.md路径]
#
# 功能:
#   1. 检查 docker-compose 服务是否运行
#   2. 如果测试脚本不存在，自动生成
#   3. 运行对应的测试脚本
#   4. 返回测试结果
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

TASK_ID="${1:-}"
RALPH_TASK_FILE="${2:-}"

if [[ -z "$TASK_ID" ]]; then
    echo "用法: $0 <TASK-ID> [RALPH_TASK.md路径]"
    echo "示例: $0 TASK-32"
    echo "      $0 TASK-32 /path/to/RALPH_TASK.md"
    exit 1
fi

# 提取任务数字 ID
TASK_NUM="${TASK_ID#TASK-}"

# 检查 docker-compose 服务是否运行
echo "检查 docker-compose 服务状态..."
if ! docker-compose ps 2>/dev/null | grep -q "Up"; then
    echo "⚠️  警告: docker-compose 服务可能未运行"
    echo "   请运行: docker-compose up -d"
    echo ""
    read -p "是否继续测试? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 检查测试脚本是否存在，如果不存在则自动生成
TEST_SCRIPT="$SCRIPT_DIR/tests/test-${TASK_ID}.py"

if [[ ! -f "$TEST_SCRIPT" ]]; then
    echo "📝 测试脚本不存在，正在自动生成..."
    
    # 生成测试脚本
    if [[ -n "$RALPH_TASK_FILE" ]] && [[ -f "$RALPH_TASK_FILE" ]]; then
        python3 "$SCRIPT_DIR/generate-test.py" "$TASK_ID" "$RALPH_TASK_FILE"
    else
        python3 "$SCRIPT_DIR/generate-test.py" "$TASK_ID"
    fi
    
    if [[ ! -f "$TEST_SCRIPT" ]]; then
        echo "❌ 无法生成测试脚本"
        exit 1
    fi
    
    echo "✅ 测试脚本已生成: $TEST_SCRIPT"
fi

# 检查 Python 和 Playwright
if ! command -v python3 &> /dev/null; then
    echo "❌ 未找到 python3"
    exit 1
fi

# 运行测试脚本
echo "运行测试脚本: $TEST_SCRIPT"
echo ""

cd "$PROJECT_ROOT"
python3 "$TEST_SCRIPT"

exit_code=$?

if [[ $exit_code -eq 0 ]]; then
    echo ""
    echo "✅ 测试通过"
else
    echo ""
    echo "❌ 测试失败 (exit code: $exit_code)"
fi

exit $exit_code
