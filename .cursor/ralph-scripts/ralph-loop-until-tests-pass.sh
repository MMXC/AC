#!/bin/bash
# Ralph Wiggum: Loop Until Tests Pass
#
# Runs ralph iterations in a loop, checking test command after each iteration.
# If tests fail, continues looping until tests pass or max iterations reached.
#
# Usage:
#   ./ralph-loop-until-tests-pass.sh                    # Run until tests pass
#   ./ralph-loop-until-tests-pass.sh -n 50              # Max 50 iterations
#   ./ralph-loop-until-tests-pass.sh -m composer-1      # Use specific model
#
# This script:
#   1. Runs one ralph iteration
#   2. Runs the test command from RALPH_TASK.md
#   3. If tests pass: stops and reports success
#   4. If tests fail: continues to next iteration
#   5. Repeats until tests pass or max iterations reached

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source common functions
source "$SCRIPT_DIR/ralph-common.sh"

# =============================================================================
# FLAG PARSING
# =============================================================================

show_help() {
  cat << 'EOF'
Ralph Wiggum: Loop Until Tests Pass

Runs ralph iterations in a loop, checking test command after each iteration.
If tests fail, continues looping until tests pass or max iterations reached.

Usage:
  ./ralph-loop-until-tests-pass.sh [options] [workspace]

Options:
  -n, --iterations N     Max iterations (default: 20)
  -m, --model MODEL      Model to use (default: auto)
  -y, --yes              Skip confirmation prompt
  -h, --help             Show this help

Examples:
  ./ralph-loop-until-tests-pass.sh                      # Run until tests pass
  ./ralph-loop-until-tests-pass.sh -n 50                # Max 50 iterations
  ./ralph-loop-until-tests-pass.sh -m composer-1        # Use specific model
EOF
}

# Parse command line arguments
WORKSPACE=""
MAX_ITERATIONS="${MAX_ITERATIONS:-20}"
SKIP_CONFIRM="${SKIP_CONFIRM:-false}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -n|--iterations)
      MAX_ITERATIONS="$2"
      shift 2
      ;;
    -m|--model)
      MODEL="$2"
      shift 2
      ;;
    -y|--yes)
      SKIP_CONFIRM=true
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    -*)
      echo "Unknown option: $1"
      echo "Use -h for help."
      exit 1
      ;;
    *)
      # Positional argument = workspace
      WORKSPACE="$1"
      shift
      ;;
  esac
done

# =============================================================================
# TEST COMMAND EXTRACTION
# =============================================================================

# Extract test command from RALPH_TASK.md
extract_test_command() {
  local task_file="$1"
  
  # Try to extract from frontmatter first
  local test_cmd
  test_cmd=$(grep -E '^test_command:' "$task_file" 2>/dev/null | sed -E 's/^test_command:[[:space:]]*["'\'']?([^"'\'']+)["'\'']?.*$/\1/' | head -1)
  
  # If not found, try to extract from description
  if [[ -z "$test_cmd" ]]; then
    test_cmd=$(grep -oE '\*\*Test Command\*\*:\s*`([^`]+)`' "$task_file" 2>/dev/null | sed -E 's/\*\*Test Command\*\*:\s*`([^`]+)`/\1/' | head -1)
  fi
  
  # If still not found, try to extract from any line containing "test" and "command"
  if [[ -z "$test_cmd" ]]; then
    test_cmd=$(grep -iE 'test.*command|command.*test' "$task_file" 2>/dev/null | grep -oE '`[^`]+`' | head -1 | sed 's/`//g')
  fi
  
  echo "$test_cmd"
}

# Run test command and return exit code
run_test_command() {
  local test_cmd="$1"
  local workspace="$2"
  
  if [[ -z "$test_cmd" ]]; then
    echo "⚠️  No test command found in RALPH_TASK.md" >&2
    return 1
  fi
  
  echo "🧪 Running test command: $test_cmd" >&2
  echo "" >&2
  
  cd "$workspace"
  
  # 确保 docker-compose 服务运行（如果项目使用 docker-compose）
  if [[ -f "docker-compose.yml" ]] || [[ -f "docker-compose.yaml" ]]; then
    echo "🔧 检查 docker-compose 服务状态..." >&2
    if ! docker-compose ps 2>/dev/null | grep -q "Up"; then
      echo "⚠️  docker-compose 服务未运行，正在启动..." >&2
      docker-compose up -d >&2 || echo "⚠️  启动 docker-compose 失败，继续测试..." >&2
      # 等待服务启动
      sleep 5
    fi
  fi
  
  # 创建测试结果日志文件
  local test_results_file="$workspace/.ralph/test-results.log"
  mkdir -p "$workspace/.ralph" 2>/dev/null || true
  
  # 记录测试开始时间
  {
    echo "═══════════════════════════════════════════════════════════════════"
    echo "Test Run: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "Command: $test_cmd"
    echo "═══════════════════════════════════════════════════════════════════"
  } >> "$test_results_file"
  
  # Check if this is a skill reference
  if [[ "$test_cmd" =~ ^skill:([a-zA-Z0-9_-]+)(.*)$ ]] || [[ "$test_cmd" =~ ^@([a-zA-Z0-9_-]+)(.*)$ ]]; then
    local skill_name="${BASH_REMATCH[1]}"
    local skill_args="${BASH_REMATCH[2]}"
    
    echo "🔧 Detected skill reference: $skill_name" >&2
    
    # Handle watch-together-webapp-testing skill
    if [[ "$skill_name" == "watch-together-webapp-testing" ]]; then
      local skill_dir="$workspace/.cursor/skills/watch-together-webapp-testing"
      local runner_script="$skill_dir/run-test.sh"
      
      if [[ -f "$runner_script" ]]; then
        echo "📋 Using skill runner: $runner_script" >&2
        # 运行测试并捕获输出
        if bash "$runner_script" $skill_args 2>&1 | tee -a "$test_results_file"; then
          local exit_code=0
        else
          local exit_code=${PIPESTATUS[0]}
        fi
        
        # 记录测试结果
        {
          echo ""
          echo "Test Result: $([ $exit_code -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
          echo "Exit Code: $exit_code"
          echo "═══════════════════════════════════════════════════════════════════"
          echo ""
        } >> "$test_results_file"
        
        return $exit_code
      else
        # Fallback: try to find test script directly
        local task_id=$(echo "$skill_args" | awk '{print $1}')
        if [[ -n "$task_id" ]]; then
          local task_num="${task_id#TASK-}"
          local test_script="$skill_dir/tests/test-${task_id}.py"
          
          if [[ -f "$test_script" ]]; then
            echo "📋 Running test script: $test_script" >&2
            # 运行测试并捕获输出
            if python3 "$test_script" 2>&1 | tee -a "$test_results_file"; then
              local exit_code=0
            else
              local exit_code=${PIPESTATUS[0]}
            fi
            
            # 记录测试结果
            {
              echo ""
              echo "Test Result: $([ $exit_code -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
              echo "Exit Code: $exit_code"
              echo "═══════════════════════════════════════════════════════════════════"
              echo ""
            } >> "$test_results_file"
            
            return $exit_code
          fi
        fi
        
        echo "❌ Skill runner not found: $runner_script" >&2
        echo "   Available skills:" >&2
        ls -1 "$workspace/.cursor/skills/" 2>/dev/null | sed 's/^/     - /' >&2 || echo "     (none)" >&2
        return 1
      fi
    else
      echo "❌ Unknown skill: $skill_name" >&2
      return 1
    fi
  fi
  
  # Regular command execution
  # 运行测试并捕获输出
  if eval "$test_cmd" 2>&1 | tee -a "$test_results_file"; then
    local exit_code=0
  else
    local exit_code=${PIPESTATUS[0]}
  fi
  
  # 记录测试结果
  {
    echo ""
    echo "Test Result: $([ $exit_code -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
    echo "Exit Code: $exit_code"
    echo "═══════════════════════════════════════════════════════════════════"
    echo ""
  } >> "$test_results_file"
  
  return $exit_code
}

# =============================================================================
# MAIN
# =============================================================================

main() {
  # Resolve workspace
  if [[ -z "$WORKSPACE" ]]; then
    WORKSPACE="$(pwd)"
  elif [[ "$WORKSPACE" == "." ]]; then
    WORKSPACE="$(pwd)"
  else
    WORKSPACE="$(cd "$WORKSPACE" && pwd)"
  fi
  
  local task_file="$WORKSPACE/RALPH_TASK.md"
  
  # Show banner
  echo "═══════════════════════════════════════════════════════════════════"
  echo "🐛 Ralph Wiggum: Loop Until Tests Pass"
  echo "═══════════════════════════════════════════════════════════════════"
  echo ""
  echo "  This will run ralph iterations in a loop."
  echo "  After each iteration, it will run the test command."
  echo "  It will continue until tests pass or max iterations reached."
  echo ""
  echo "═══════════════════════════════════════════════════════════════════"
  echo ""
  
  # Check prerequisites
  if ! check_prerequisites "$WORKSPACE" "$SCRIPT_DIR"; then
    exit 1
  fi
  
  # Initialize .ralph directory
  init_ralph_dir "$WORKSPACE"
  
  echo "Workspace: $WORKSPACE"
  echo "Model:     $MODEL"
  echo "Max iter:  $MAX_ITERATIONS"
  echo ""
  
  # Extract test command
  local test_cmd
  test_cmd=$(extract_test_command "$task_file")
  
  if [[ -z "$test_cmd" ]]; then
    echo "❌ No test command found in RALPH_TASK.md"
    echo ""
    echo "Please add a test_command to the frontmatter:"
    echo "  ---"
    echo "  test_command: \"npm test\""
    echo "  ---"
    exit 1
  fi
  
  echo "Test command: $test_cmd"
  echo ""
  
  # Confirm before starting (unless -y flag)
  if [[ "$SKIP_CONFIRM" != "true" ]]; then
    echo "This will run ralph iterations until tests pass."
    echo "After each iteration, it will run: $test_cmd"
    echo ""
    read -p "Start loop? [y/N] " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Aborted."
      exit 0
    fi
  fi
  
  # Run loop
  local iteration=1
  local session_id=""
  
  while [[ $iteration -le $MAX_ITERATIONS ]]; do
    echo ""
    echo "═══════════════════════════════════════════════════════════════════"
    echo "🔄 Iteration $iteration / $MAX_ITERATIONS"
    echo "═══════════════════════════════════════════════════════════════════"
    echo ""
    
    # Run one iteration
    local signal
    signal=$(run_iteration "$WORKSPACE" "$iteration" "$session_id" "$SCRIPT_DIR")
    
    # Check task completion (by criteria)
    local task_status
    task_status=$(check_task_complete "$WORKSPACE" "$SCRIPT_DIR")
    
    echo ""
    echo "📋 Checking test command..."
    echo ""
    
    # Run test command
    if run_test_command "$test_cmd" "$WORKSPACE"; then
      echo ""
      echo "═══════════════════════════════════════════════════════════════════"
      echo "✅ Tests Passed!"
      echo "═══════════════════════════════════════════════════════════════════"
      echo ""
      echo "Tests passed after $iteration iteration(s)."
      echo ""
      
      # Update backlog status if needed
      if [[ "$task_status" != "COMPLETE" ]]; then
        echo "⚠️  Note: Some criteria may still be unchecked, but tests pass."
        echo "   You may want to mark remaining criteria as complete."
      fi
      
      # Finalize completed task (update status, save doc, delete RALPH_TASK.md)
      if [[ "$task_status" == "COMPLETE" ]]; then
        finalize_completed_task "$WORKSPACE" "$SCRIPT_DIR" || true
      else
        # Tests pass but criteria not all checked - just update status
        update_backlog_status "$WORKSPACE" "Done" "$SCRIPT_DIR" || true
      fi
      
      exit 0
    else
      echo ""
      echo "❌ Tests Failed"
      echo ""
      echo "📋 Test results saved to: .ralph/test-results.log"
      echo "   The next iteration will read this file to understand what failed."
      echo ""
      
      # Check if we should continue
      if [[ $iteration -ge $MAX_ITERATIONS ]]; then
        echo "⚠️  Max iterations ($MAX_ITERATIONS) reached."
        echo "   Tests still failing. Review the code and try again."
        echo ""
        echo "You can:"
        echo "  1. Fix issues manually and run tests again"
        echo "  2. Run this script again with more iterations: -n $((MAX_ITERATIONS + 10))"
        echo "  3. Review .ralph/errors.log, .ralph/test-results.log and .ralph/progress.md"
        exit 1
      fi
      
      # Handle signals
      case "$signal" in
        "ROTATE")
          echo "🔄 Context rotation was triggered. Starting fresh iteration..."
          iteration=$((iteration + 1))
          session_id=""
          ;;
        "GUTTER")
          echo "🚨 Gutter detected. Check .ralph/errors.log"
          echo "   The agent may be stuck. Consider fixing issues manually."
          exit 1
          ;;
        "COMPLETE")
          echo "⚠️  Agent signaled complete but tests still failing."
          echo "   Continuing to next iteration..."
          iteration=$((iteration + 1))
          ;;
        *)
          echo "📝 Agent finished. Continuing to next iteration..."
          echo "   Next iteration will read .ralph/test-results.log to fix test failures."
          iteration=$((iteration + 1))
          ;;
      esac
      
      # Brief pause before next iteration
      sleep 2
    fi
  done
  
  echo "⚠️  Max iterations reached. Tests still failing."
  exit 1
}

main "$@"
