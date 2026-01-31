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

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 未找到 python3"
    exit 1
fi

# 使用虚拟环境（避免 PEP 668 限制）；失败时回退到 --break-system-packages
VENV_DIR="$SCRIPT_DIR/.venv"
PYTHON=""
if [[ ! -d "$VENV_DIR" ]] || [[ ! -x "$VENV_DIR/bin/python" && ! -x "$VENV_DIR/Scripts/python.exe" ]]; then
    echo "📦 创建虚拟环境..."
    rm -rf "$VENV_DIR" 2>/dev/null || true
    if ! python3 -m venv "$VENV_DIR" 2>/dev/null; then
        echo "   venv 不可用（建议: sudo apt install python3.12-venv），回退到系统 Python..."
        rm -rf "$VENV_DIR" 2>/dev/null || true
    fi
fi
if [[ -x "$VENV_DIR/bin/python" ]]; then
    PYTHON="$VENV_DIR/bin/python"
elif [[ -x "$VENV_DIR/Scripts/python.exe" ]]; then
    PYTHON="$VENV_DIR/Scripts/python.exe"
fi
if [[ -z "$PYTHON" ]]; then
    PYTHON="python3"
fi

# 确保 Playwright 已安装
if ! "$PYTHON" -c "from playwright.sync_api import sync_playwright" 2>/dev/null; then
    echo "📦 安装 Playwright..."
    if "$PYTHON" -m pip install --quiet playwright 2>/dev/null; then
        :
    else
        "$PYTHON" -m pip install --quiet playwright --break-system-packages
    fi
    "$PYTHON" -m playwright install chromium
fi

# 确保 Chromium 系统依赖已安装（如 libasound2，WSL/无界面环境常见缺失）
if ! "$PYTHON" -c "
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    b.close()
" 2>/dev/null; then
    echo "⚠️  Chromium 无法启动（缺少系统依赖，如 libasound2）"
    echo "   请执行以下命令之一（使用 venv 中的 Python 运行 playwright）："
    echo "   sudo $PYTHON -m playwright install-deps chromium"
    echo "   或: sudo apt install libasound2t64 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libnss3"
    exit 1
fi

# 运行测试脚本
echo "运行测试脚本: $TEST_SCRIPT"
echo ""

cd "$PROJECT_ROOT"
"$PYTHON" "$TEST_SCRIPT"

exit_code=$?

if [[ $exit_code -eq 0 ]]; then
    echo ""
    echo "✅ 测试通过"
else
    echo ""
    echo "❌ 测试失败 (exit code: $exit_code)"
fi

exit $exit_code
