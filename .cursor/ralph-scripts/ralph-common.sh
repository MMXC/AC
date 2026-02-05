#!/bin/bash
# Ralph Wiggum: Common utilities and loop logic
#
# Shared functions for ralph-loop.sh and ralph-setup.sh
# All state lives in .ralph/ within the project.

# =============================================================================
# CONFIGURATION (can be overridden before sourcing)
# =============================================================================

# Token thresholds
WARN_THRESHOLD="${WARN_THRESHOLD:-70000}"
ROTATE_THRESHOLD="${ROTATE_THRESHOLD:-80000}"

# Iteration limits
MAX_ITERATIONS="${MAX_ITERATIONS:-20}"

# Model selection
# Default to 'auto' if opus-4.5-thinking is not available
# Available models: auto, composer-1, grok
DEFAULT_MODEL="auto"
MODEL="${RALPH_MODEL:-$DEFAULT_MODEL}"

# Feature flags (set by caller)
USE_BRANCH="${USE_BRANCH:-}"
OPEN_PR="${OPEN_PR:-false}"
SKIP_CONFIRM="${SKIP_CONFIRM:-false}"

# =============================================================================
# BASIC HELPERS
# =============================================================================

# Cross-platform sed -i
sedi() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

# Get the .ralph directory for a workspace
get_ralph_dir() {
  local workspace="${1:-.}"
  echo "$workspace/.ralph"
}

# Get current iteration from .ralph/.iteration
get_iteration() {
  local workspace="${1:-.}"
  local state_file="$workspace/.ralph/.iteration"
  
  if [[ -f "$state_file" ]]; then
    cat "$state_file"
  else
    echo "0"
  fi
}

# Set iteration number
set_iteration() {
  local workspace="${1:-.}"
  local iteration="$2"
  local ralph_dir="$workspace/.ralph"
  
  mkdir -p "$ralph_dir"
  echo "$iteration" > "$ralph_dir/.iteration"
}

# Increment iteration and return new value
increment_iteration() {
  local workspace="${1:-.}"
  local current=$(get_iteration "$workspace")
  local next=$((current + 1))
  set_iteration "$workspace" "$next"
  echo "$next"
}

# Get context health emoji based on token count
get_health_emoji() {
  local tokens="$1"
  local pct=$((tokens * 100 / ROTATE_THRESHOLD))
  
  if [[ $pct -lt 60 ]]; then
    echo "🟢"
  elif [[ $pct -lt 80 ]]; then
    echo "🟡"
  else
    echo "🔴"
  fi
}

# =============================================================================
# LOGGING
# =============================================================================

# Log a message to activity.log
log_activity() {
  local workspace="${1:-.}"
  local message="$2"
  local ralph_dir="$workspace/.ralph"
  local timestamp=$(date '+%H:%M:%S')
  
  mkdir -p "$ralph_dir"
  echo "[$timestamp] $message" >> "$ralph_dir/activity.log"
}

# Log an error to errors.log
log_error() {
  local workspace="${1:-.}"
  local message="$2"
  local ralph_dir="$workspace/.ralph"
  local timestamp=$(date '+%H:%M:%S')
  
  mkdir -p "$ralph_dir"
  echo "[$timestamp] $message" >> "$ralph_dir/errors.log"
}

# Log to progress.md (called by the loop, not the agent)
log_progress() {
  local workspace="$1"
  local message="$2"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  local progress_file="$workspace/.ralph/progress.md"
  
  echo "" >> "$progress_file"
  echo "### $timestamp" >> "$progress_file"
  echo "$message" >> "$progress_file"
}

# =============================================================================
# INITIALIZATION
# =============================================================================

# Initialize .ralph directory with default files
init_ralph_dir() {
  local workspace="$1"
  local ralph_dir="$workspace/.ralph"
  
  mkdir -p "$ralph_dir"
  
  # Initialize progress.md if it doesn't exist
  if [[ ! -f "$ralph_dir/progress.md" ]]; then
    cat > "$ralph_dir/progress.md" << 'EOF'
# Progress Log

> Updated by the agent after significant work.

---

## Session History

EOF
  fi
  
  # Initialize guardrails.md if it doesn't exist
  if [[ ! -f "$ralph_dir/guardrails.md" ]]; then
    cat > "$ralph_dir/guardrails.md" << 'EOF'
# Ralph Guardrails (Signs)

> Lessons learned from past failures. READ THESE BEFORE ACTING.

## Core Signs

### Sign: Read Before Writing
- **Trigger**: Before modifying any file
- **Instruction**: Always read the existing file first
- **Added after**: Core principle

### Sign: Test After Changes
- **Trigger**: After any code change
- **Instruction**: Run tests to verify nothing broke
- **Added after**: Core principle

### Sign: Commit Checkpoints
- **Trigger**: Before risky changes
- **Instruction**: Commit current working state first
- **Added after**: Core principle

---

## Learned Signs

EOF
  fi
  
  # Initialize errors.log if it doesn't exist
  if [[ ! -f "$ralph_dir/errors.log" ]]; then
    cat > "$ralph_dir/errors.log" << 'EOF'
# Error Log

> Failures detected by stream-parser. Use to update guardrails.

EOF
  fi
  
  # Initialize activity.log if it doesn't exist
  if [[ ! -f "$ralph_dir/activity.log" ]]; then
    cat > "$ralph_dir/activity.log" << 'EOF'
# Activity Log

> Real-time tool call logging from stream-parser.

EOF
  fi
}

# =============================================================================
# TASK MANAGEMENT
# =============================================================================

# Load task from backlog and generate RALPH_TASK.md
load_task_from_backlog() {
  local workspace="$1"
  local script_dir="${2:-$(dirname "${BASH_SOURCE[0]}")}"
  local task_file="$workspace/RALPH_TASK.md"
  
  # Check if backlog CLI is available and working
  local backlog_available=false
  if command -v backlog &> /dev/null; then
    # Test if backlog CLI actually works (not just exists)
    if backlog --version &>/dev/null || backlog --help &>/dev/null || backlog task list --plain &>/dev/null 2>&1; then
      backlog_available=true
    fi
  fi
  
  if [[ "$backlog_available" != "true" ]]; then
    echo "⚠️  backlog.md CLI not available or not working, trying Python fallback..." >&2
    # Fallback to Python script
    local backlog_script="$script_dir/backlog-integration.py"
    if [[ -f "$backlog_script" ]]; then
      local task_json
      task_json=$(python3 "$backlog_script" get-next-task 2>/dev/null)
      if [[ -n "$task_json" ]] && [[ "$task_json" != "{}" ]]; then
        local backlog_id
        backlog_id=$(echo "$task_json" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)
        if [[ -n "$backlog_id" ]]; then
          local ralph_task_content
          ralph_task_content=$(python3 "$backlog_script" generate-task 2>/dev/null)
          if [[ -n "$ralph_task_content" ]]; then
            echo "$ralph_task_content" > "$task_file"
            python3 "$backlog_script" update-status "$backlog_id" "In Progress" >/dev/null 2>&1 || true
            echo "✅ Loaded task from backlog: $backlog_id" >&2
            return 0
          fi
        fi
      fi
    fi
    echo "ℹ️  No uncompleted tasks found in backlog" >&2
    return 1
  fi
  
  # Use backlog CLI to search for uncompleted tasks
  echo "📋 Loading next task from backlog..." >&2
  
  # Try to get "In Progress" task first, then "To Do"
  local task_id=""
  local task_status=""
  local task_output=""
  
  # Method 1: Try status filter
  # Format: "To Do:\n  TASK-1 - Title\n  TASK-2 - Title"
  for status in "In Progress" "To Do"; do
    local task_list
    task_list=$(backlog task list -s "$status" --plain 2>&1 || echo "")
    
    if [[ -n "$task_list" ]] && [[ "$task_list" != *"error"* ]] && [[ "$task_list" != *"not found"* ]] && [[ "$task_list" != *"This: not found"* ]] && [[ "$task_list" != *"No tasks found"* ]]; then
      # Extract first task ID from list
      # Format: "  TASK-1 - Title" or "TASK-1 - Title"
      # Try to extract TASK-1 or just 1
      local first_task_line
      first_task_line=$(echo "$task_list" | grep -E '^\s*TASK-[0-9]+' | head -1)
      
      if [[ -n "$first_task_line" ]]; then
        # Extract task ID: TASK-1 -> 1
        task_id=$(echo "$first_task_line" | sed -E 's/.*TASK-([0-9]+).*/\1/' 2>/dev/null)
        
        if [[ -n "$task_id" ]] && [[ "$task_id" =~ ^[0-9]+$ ]]; then
          task_output=$(backlog task "$task_id" --plain 2>&1 || echo "")
          if [[ -n "$task_output" ]] && [[ "$task_output" != *"error"* ]] && [[ "$task_output" != *"not found"* ]] && [[ "$task_output" != *"This: not found"* ]]; then
            # Verify status matches (format: "Status: ○ To Do")
            local output_status
            output_status=$(echo "$task_output" | grep -i "^Status:" | sed -E 's/^Status:\s*○?\s*//' | head -1 | tr -d '[:space:]')
            # Normalize status
            if [[ "$output_status" == "ToDo" ]] || [[ "$output_status" == "To Do" ]]; then
              output_status="To Do"
            elif [[ "$output_status" == "InProgress" ]] || [[ "$output_status" == "In Progress" ]]; then
              output_status="In Progress"
            fi
            
            if [[ "$output_status" == "$status" ]]; then
              task_status="$status"
              break
            fi
          fi
          task_id=""
          task_output=""
        fi
      fi
    fi
  done
  
  # Method 2: If status filter didn't work, list all tasks and filter manually
  if [[ -z "$task_id" ]] || [[ -z "$task_output" ]]; then
    local all_list
    all_list=$(backlog task list --plain 2>&1 || echo "")
    
    if [[ -n "$all_list" ]] && [[ "$all_list" != *"error"* ]] && [[ "$all_list" != *"not found"* ]] && [[ "$all_list" != *"This: not found"* ]]; then
      # Process each line to find uncompleted tasks
      # Format: "  TASK-1 - Title" or "To Do:\n  TASK-1 - Title"
      while IFS= read -r line; do
        [[ -z "$line" ]] && continue
        # Skip section headers like "To Do:" or "In Progress:"
        if [[ "$line" =~ ^(To Do|In Progress|Done): ]]; then
          continue
        fi
        
        # Extract task ID from line (format: "  TASK-1 - Title")
        local candidate_id
        if [[ "$line" =~ TASK-([0-9]+) ]]; then
          candidate_id="${BASH_REMATCH[1]}"
        else
          # Try other patterns
          candidate_id=$(echo "$line" | sed -E 's/.*TASK-([0-9]+).*/\1/' 2>/dev/null)
        fi
        
        if [[ -n "$candidate_id" ]] && [[ "$candidate_id" =~ ^[0-9]+$ ]]; then
          # Get task details to check status
          local candidate_output
          candidate_output=$(backlog task "$candidate_id" --plain 2>&1 || echo "")
          
          if [[ -n "$candidate_output" ]] && [[ "$candidate_output" != *"error"* ]] && [[ "$candidate_output" != *"not found"* ]] && [[ "$candidate_output" != *"This: not found"* ]]; then
            # Parse status (format: "Status: ○ To Do")
            local candidate_status
            candidate_status=$(echo "$candidate_output" | grep -i "^Status:" | sed -E 's/^Status:\s*○?\s*//' | head -1 | tr -d '[:space:]')
            # Normalize status
            if [[ "$candidate_status" == "ToDo" ]] || [[ "$candidate_status" == "To Do" ]]; then
              candidate_status="To Do"
            elif [[ "$candidate_status" == "InProgress" ]] || [[ "$candidate_status" == "In Progress" ]]; then
              candidate_status="In Progress"
            fi
            
            if [[ "$candidate_status" == "To Do" ]] || [[ "$candidate_status" == "In Progress" ]]; then
              task_id="$candidate_id"
              task_status="$candidate_status"
              task_output="$candidate_output"
              break
            fi
          fi
        fi
      done <<< "$all_list"
    fi
  fi
  
  if [[ -z "$task_id" ]] || [[ -z "$task_output" ]]; then
    echo "ℹ️  No uncompleted tasks found in backlog" >&2
    return 1
  fi
  
  # Parse task output and generate RALPH_TASK.md
  echo "📝 Generating RALPH_TASK.md from backlog task: $task_id" >&2
  
  # Extract task information
  local title=""
  local description=""
  local success_criteria=()
  local test_command=""
  
  # Parse title (format: "Task TASK-1 - 创建首页 - 房间创建功能")
  title=$(echo "$task_output" | grep -E '^Task TASK-' | sed -E 's/^Task TASK-[0-9]+\s*-\s*//' | head -1 | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  if [[ -z "$title" ]]; then
    # Fallback: try "Title:" line
    title=$(echo "$task_output" | grep -i "^Title:" | sed 's/^Title:\s*//' | head -1 | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  fi
  if [[ -z "$title" ]]; then
    title="Task $task_id"
  fi
  
  # Parse description (format: "Description:\n--------------------------------------------------\ncontent\n\n**Test Command**: ...")
  description=$(echo "$task_output" | awk '
    /^Description:/ { 
      in_desc=1
      skip_separator=1
      next 
    }
    skip_separator && /^-+$/ { 
      skip_separator=0
      next 
    }
    /^Acceptance Criteria:/ || /^Definition of Done:/ || /^Plan:/ || /^Notes:/ { 
      if (in_desc) exit 
    }
    in_desc && !skip_separator { 
      print 
    }
  ')
  
  # If awk didn't work, try sed fallback
  if [[ -z "$description" ]]; then
    description=$(echo "$task_output" | sed -n '/^Description:/,/^Acceptance Criteria:/p' | sed '1d;$d' | sed '/^--------------------------------------------------$/d' | sed '/^Acceptance Criteria:/d')
  fi
  
  # Parse acceptance criteria (format: "Acceptance Criteria:\n--------------------------------------------------\n- [ ] #1 ...")
  while IFS= read -r line; do
    # Skip separator lines
    [[ "$line" =~ ^-+$ ]] && continue
    [[ -z "$line" ]] && continue
    
    # Extract criterion text (remove checkboxes, numbering, and # markers)
    # Format: "- [ ] #1 首页可以正常访问"
    local criterion
    criterion=$(echo "$line" | sed -E 's/^[-*]\s+\[([ x])\]\s*//' | sed -E 's/^#\s*[0-9]+\s*//' | sed -E 's/^[-*]\s*//')
    
    if [[ -n "$criterion" ]] && [[ "$criterion" != "Acceptance Criteria" ]] && [[ "$criterion" != "ACs" ]] && [[ "$criterion" != "AC" ]]; then
      success_criteria+=("$criterion")
    fi
  done < <(echo "$task_output" | awk '
    /^Acceptance Criteria:/ { 
      in_ac=1
      skip_separator=1
      next 
    }
    skip_separator && /^-+$/ { 
      skip_separator=0
      next 
    }
    /^Definition of Done:/ || /^Plan:/ || /^Notes:/ || /^Description:/ { 
      if (in_ac) exit 
    }
    in_ac && !skip_separator && NF > 0 { 
      print 
    }
  ')
  
  # If awk didn't work, try manual parsing
  if [[ ${#success_criteria[@]} -eq 0 ]]; then
    local in_ac=false
    local skip_separator=false
    while IFS= read -r line; do
      if [[ "$line" =~ ^Acceptance\s+Criteria: ]]; then
        in_ac=true
        skip_separator=true
        continue
      fi
      if [[ "$skip_separator" == "true" ]] && [[ "$line" =~ ^-+$ ]]; then
        skip_separator=false
        continue
      fi
      if [[ "$in_ac" == "true" ]] && [[ "$skip_separator" != "true" ]]; then
        # Stop at next section
        if [[ "$line" =~ ^Definition\s+of\s+Done: ]] || [[ "$line" =~ ^Plan: ]] || [[ "$line" =~ ^Notes: ]]; then
          break
        fi
        # Skip separator lines
        [[ "$line" =~ ^-+$ ]] && continue
        [[ -z "$line" ]] && continue
        
        # Extract criterion text (format: "- [ ] #1 首页可以正常访问")
        local criterion
        criterion=$(echo "$line" | sed -E 's/^[-*]\s+\[([ x])\]\s*//' | sed -E 's/^#\s*[0-9]+\s*//' | sed -E 's/^[-*]\s*//')
        if [[ -n "$criterion" ]]; then
          success_criteria+=("$criterion")
        fi
      fi
    done <<< "$task_output"
  fi
  
  # Extract test command from description
  test_command=$(echo "$description" | grep -oE '\*\*Test Command\*\*:\s*`([^`]+)`' | sed -E 's/\*\*Test Command\*\*:\s*`([^`]+)`/\1/')
  
  # Generate RALPH_TASK.md
  cat > "$task_file" << EOF
---
backlog_id: backlog-$task_id
task: $title
test_command: "$test_command"
---

# Task: $title

## Description

$description

## Success Criteria

EOF
  
  # Add success criteria
  for criterion in "${success_criteria[@]}"; do
    echo "- [ ] $criterion" >> "$task_file"
  done
  
  # If no criteria found, add a default one
  if [[ ${#success_criteria[@]} -eq 0 ]]; then
    echo "- [ ] Complete the task: $title" >> "$task_file"
  fi
  
  # Update backlog status to "In Progress" if it's "To Do"
  if [[ "$task_status" == "To Do" ]]; then
    backlog task edit "$task_id" -s "In Progress" >/dev/null 2>&1 || true
  fi
  
  echo "✅ Loaded task from backlog: backlog-$task_id" >&2
  return 0
}

# Update backlog task status
update_backlog_status() {
  local workspace="$1"
  local new_status="$2"  # "In Progress", "Done", etc.
  local script_dir="${3:-$(dirname "${BASH_SOURCE[0]}")}"
  
  local task_file="$workspace/RALPH_TASK.md"
  if [[ ! -f "$task_file" ]]; then
    return 1
  fi
  
  # Extract backlog_id from RALPH_TASK.md frontmatter
  local backlog_id
  backlog_id=$(grep -E '^backlog_id:' "$task_file" 2>/dev/null | sed -E 's/^backlog_id:[[:space:]]*["'\'']?([^"'\'']+)["'\'']?.*$/\1/' | head -1)
  
  if [[ -z "$backlog_id" ]]; then
    # Try to extract from content
    backlog_id=$(grep -E 'backlog_id[[:space:]]*[:=][[:space:]]*["'\'']?([^"'\'']+)["'\'']?' "$task_file" 2>/dev/null | sed -E 's/.*backlog_id[[:space:]]*[:=][[:space:]]*["'\'']?([^"'\'']+)["'\'']?.*/\1/' | head -1)
  fi
  
  if [[ -z "$backlog_id" ]]; then
    return 1  # No backlog_id found
  fi
  
  # Extract numeric task ID from backlog-<id> format
  local task_id
  task_id=$(echo "$backlog_id" | sed -E 's/^backlog-([0-9]+)$/\1/')
  if [[ -z "$task_id" ]]; then
    task_id="$backlog_id"
  fi
  
  # Try backlog CLI first (check if it actually works)
  if command -v backlog &> /dev/null; then
    # Try to update status with verbose output for debugging
    local result
    result=$(backlog task edit "$task_id" -s "$new_status" 2>&1)
    local exit_code=$?
    
    if [[ $exit_code -eq 0 ]]; then
      echo "✅ Updated backlog task $task_id status to '$new_status'" >&2
      return 0
    else
      echo "⚠️  backlog CLI failed to update status: $result" >&2
      # If CLI failed, fall through to Python fallback
    fi
  fi
  
  # Fallback to Python script
  local backlog_script="$script_dir/backlog-integration.py"
  if [[ -f "$backlog_script" ]]; then
    local result
    result=$(python3 "$backlog_script" update-status "$backlog_id" "$new_status" 2>&1)
    local exit_code=$?
    if [[ $exit_code -eq 0 ]]; then
      echo "✅ Updated backlog task $backlog_id status to '$new_status' (via Python fallback)" >&2
      return 0
    else
      echo "⚠️  Python fallback failed: $result" >&2
    fi
  fi
  
  return 1
}

# Check if task is complete
check_task_complete() {
  local workspace="$1"
  local task_file="$workspace/RALPH_TASK.md"
  local script_dir="${2:-$(dirname "${BASH_SOURCE[0]}")}"
  
  if [[ ! -f "$task_file" ]]; then
    echo "NO_TASK_FILE"
    return
  fi
  
  # Only count actual checkbox list items, not [ ] in prose/examples
  # Matches: "- [ ]", "* [ ]", "1. [ ]", etc.
  local unchecked
  unchecked=$(grep -cE '^[[:space:]]*([-*]|[0-9]+\.)[[:space:]]+\[ \]' "$task_file" 2>/dev/null) || unchecked=0
  
  if [[ "$unchecked" -eq 0 ]]; then
    # Task is complete - update backlog status and archive task
    finalize_completed_task "$workspace" "$script_dir" || true
    echo "COMPLETE"
  else
    echo "INCOMPLETE:$unchecked"
  fi
}

# Finalize completed task: update status, save RALPH_TASK.md as doc, delete file
finalize_completed_task() {
  local workspace="$1"
  local script_dir="${2:-$(dirname "${BASH_SOURCE[0]}")}"
  local task_file="$workspace/RALPH_TASK.md"
  
  if [[ ! -f "$task_file" ]]; then
    return 1
  fi
  
  # Extract backlog_id and task_id
  local backlog_id
  backlog_id=$(grep -E '^backlog_id:' "$task_file" 2>/dev/null | sed -E 's/^backlog_id:[[:space:]]*["'\'']?([^"'\'']+)["'\'']?.*$/\1/' | head -1)
  
  if [[ -z "$backlog_id" ]]; then
    backlog_id=$(grep -E 'backlog_id[[:space:]]*[:=][[:space:]]*["'\'']?([^"'\'']+)["'\'']?' "$task_file" 2>/dev/null | sed -E 's/.*backlog_id[[:space:]]*[:=][[:space:]]*["'\'']?([^"'\'']+)["'\'']?.*/\1/' | head -1)
  fi
  
  if [[ -z "$backlog_id" ]]; then
    echo "⚠️  No backlog_id found in RALPH_TASK.md, skipping finalization" >&2
    return 1
  fi
  
  local task_id
  task_id=$(echo "$backlog_id" | sed -E 's/^backlog-([0-9]+)$/\1/')
  if [[ -z "$task_id" ]]; then
    task_id="$backlog_id"
  fi
  
  echo "📋 Finalizing completed task $task_id..." >&2
  
  # Step 1: Update backlog status to "Done"
  echo "  1. Updating backlog status to 'Done'..." >&2
  update_backlog_status "$workspace" "Done" "$script_dir" || echo "   ⚠️  Failed to update status" >&2
  
  # Step 2: Save RALPH_TASK.md content to backlog task notes/doc
  echo "  2. Saving RALPH_TASK.md content to backlog task..." >&2
  if command -v backlog &> /dev/null; then
    # Read RALPH_TASK.md content
    local task_content
    task_content=$(cat "$task_file")
    
    # 检查是否有测试结果截图目录，若有则生成「测试通过」条目
    local test_artifacts_dir="$workspace/backlog/test-results/task-$task_id"
    local test_passed_section=""
    if [[ -d "$test_artifacts_dir" ]]; then
      local png_files
      png_files=$(find "$test_artifacts_dir" -maxdepth 1 -name "*.png" -type f 2>/dev/null | sort)
      if [[ -n "$png_files" ]]; then
        test_passed_section=""
        test_passed_section+=$'\n'
        test_passed_section+="## 测试通过 (Test Passed)"
        test_passed_section+=$'\n'
        test_passed_section+=$'\n'
        test_passed_section+="- **测试时间**: $(date '+%Y-%m-%d %H:%M:%S')"
        test_passed_section+=$'\n'
        test_passed_section+="- **测试结果截图** (保存在 \`backlog/test-results/task-$task_id/\`):"
        test_passed_section+=$'\n'
        while IFS= read -r png_path; do
          [[ -z "$png_path" ]] && continue
          local fname
          fname=$(basename "$png_path")
          # 使用相对路径，便于在文档/仓库中引用
          test_passed_section+="  - [${fname}](backlog/test-results/task-$task_id/${fname})"
          test_passed_section+=$'\n'
        done <<< "$png_files"
        test_passed_section+=$'\n'
        echo "  ✅ 已关联测试结果截图 ($(echo "$png_files" | wc -l) 张) 到归档内容" >&2
      fi
    fi
    
    # Create notes content with timestamp, test passed section (if any), and task content
    # Use a temporary file to avoid shell quoting issues with special characters
    local notes_file
    notes_file=$(mktemp)
    {
      echo "$(date '+%Y-%m-%d %H:%M:%S') - 任务完成，RALPH_TASK.md 已归档"
      echo ""
      echo "---"
      echo ""
      if [[ -n "$test_passed_section" ]]; then
        echo "$test_passed_section"
        echo "---"
        echo ""
      fi
      echo "## RALPH_TASK.md 归档内容"
      echo ""
      echo "\`\`\`"
      echo "$task_content"
      echo "\`\`\`"
    } > "$notes_file"
    
    # Try to append to notes using backlog CLI
    # Read from file to avoid shell quoting issues
    if backlog task edit "$task_id" --append-notes "$(cat "$notes_file")" &>/dev/null 2>&1; then
      echo "  ✅ Saved RALPH_TASK.md content to backlog task notes" >&2
      rm -f "$notes_file"
    else
      # Try with --notes instead (overwrite)
      if backlog task edit "$task_id" --notes "$(cat "$notes_file")" &>/dev/null 2>&1; then
        echo "  ✅ Saved RALPH_TASK.md content to backlog task notes" >&2
        rm -f "$notes_file"
      else
        echo "  ⚠️  Failed to save RALPH_TASK.md to backlog notes (CLI may not support --notes/--append-notes)" >&2
        # Try alternative: save full notes (含测试通过条目) to backlog/docs
        local backlog_doc_file="$workspace/backlog/docs/task-$task_id-ralph-task.md"
        mkdir -p "$(dirname "$backlog_doc_file")" 2>/dev/null || true
        if cp "$notes_file" "$backlog_doc_file" 2>/dev/null; then
          echo "  ✅ Saved RALPH_TASK.md (含测试通过条目) to $backlog_doc_file as fallback" >&2
        fi
        rm -f "$notes_file"
      fi
    fi
  else
    echo "  ⚠️  backlog CLI not available, skipping doc save" >&2
    # Fallback: build notes_file and save to backlog/docs (需先构建 test_passed_section 与 notes)
    local test_artifacts_dir="$workspace/backlog/test-results/task-$task_id"
    local test_passed_section=""
    if [[ -d "$test_artifacts_dir" ]]; then
      local png_files
      png_files=$(find "$test_artifacts_dir" -maxdepth 1 -name "*.png" -type f 2>/dev/null | sort)
      if [[ -n "$png_files" ]]; then
        test_passed_section=$'\n'"## 测试通过 (Test Passed)"$'\n\n'"- **测试时间**: $(date '+%Y-%m-%d %H:%M:%S')"$'\n'"- **测试结果截图**:"$'\n'
        while IFS= read -r png_path; do
          [[ -z "$png_path" ]] && continue
          test_passed_section+="  - [$(basename "$png_path")](backlog/test-results/task-$task_id/$(basename "$png_path"))"$'\n'
        done <<< "$png_files"
      fi
    fi
    local backlog_doc_file="$workspace/backlog/docs/task-$task_id-ralph-task.md"
    mkdir -p "$(dirname "$backlog_doc_file")" 2>/dev/null || true
    {
      echo "$(date '+%Y-%m-%d %H:%M:%S') - 任务完成，RALPH_TASK.md 已归档"
      echo ""; echo "---"; echo ""
      [[ -n "$test_passed_section" ]] && echo "$test_passed_section" && echo "---" && echo ""
      echo "## RALPH_TASK.md 归档内容"; echo ""
      echo "\`\`\`"; cat "$task_file"; echo "\`\`\`"
    } > "$backlog_doc_file" 2>/dev/null && echo "  ✅ Saved to $backlog_doc_file (含测试通过条目)" >&2 || true
  fi
  
  # Step 3: Delete RALPH_TASK.md
  echo "  3. Deleting RALPH_TASK.md..." >&2
  if rm -f "$task_file"; then
    echo "  ✅ Deleted RALPH_TASK.md" >&2
    echo "" >&2
    echo "✅ Task finalized successfully. RALPH_TASK.md has been archived to backlog and deleted." >&2
    echo "   You can now load the next task from backlog." >&2
    return 0
  else
    echo "  ⚠️  Failed to delete RALPH_TASK.md" >&2
    return 1
  fi
}

# Count task criteria (returns done:total)
count_criteria() {
  local workspace="${1:-.}"
  local task_file="$workspace/RALPH_TASK.md"
  
  if [[ ! -f "$task_file" ]]; then
    echo "0:0"
    return
  fi
  
  # Only count actual checkbox list items, not [x] or [ ] in prose/examples
  # Matches: "- [ ]", "* [x]", "1. [ ]", etc.
  local total done_count
  total=$(grep -cE '^[[:space:]]*([-*]|[0-9]+\.)[[:space:]]+\[(x| )\]' "$task_file" 2>/dev/null) || total=0
  done_count=$(grep -cE '^[[:space:]]*([-*]|[0-9]+\.)[[:space:]]+\[x\]' "$task_file" 2>/dev/null) || done_count=0
  
  echo "$done_count:$total"
}

# =============================================================================
# PROMPT BUILDING
# =============================================================================

# Build the Ralph prompt for an iteration
build_prompt() {
  local workspace="$1"
  local iteration="$2"
  
  cat << EOF
# Ralph Iteration $iteration

You are an autonomous development agent using the Ralph methodology.

## FIRST: Read State Files

Before doing anything:
1. Read \`RALPH_TASK.md\` - your task and completion criteria
2. Read \`.ralph/guardrails.md\` - lessons from past failures (FOLLOW THESE)
3. Read \`.ralph/progress.md\` - what's been accomplished
4. Read \`.ralph/errors.log\` - recent failures to avoid
5. Read \`.ralph/test-results.log\` - latest test results (if exists) - **CRITICAL**: Fix any test failures before continuing

## Working Directory (Critical)

You are already in a git repository. Work HERE, not in a subdirectory:

- Do NOT run \`git init\` - the repo already exists
- Do NOT run scaffolding commands that create nested directories (\`npx create-*\`, \`npm init\`, etc.)
- If you need to scaffold, use flags like \`--no-git\` or scaffold into the current directory (\`.\`)
- All code should live at the repo root or in subdirectories you create manually

## Git Protocol (Critical)

Ralph's strength is state-in-git, not LLM memory. Commit early and often:

1. After completing each criterion, commit your changes:
   \`git add -A && git commit -m 'ralph: implement state tracker'\`
   \`git add -A && git commit -m 'ralph: fix async race condition'\`
   \`git add -A && git commit -m 'ralph: add CLI adapter with commander'\`
   Always describe what you actually did - never use placeholders like '<description>'
2. After any significant code change (even partial): commit with descriptive message
3. Before any risky refactor: commit current state as checkpoint
4. **DO NOT run \`git push\`** - it may require authentication and block execution. Only commit locally.

If you get rotated, the next agent picks up from your last commit. Your commits ARE your memory.

## Task Workflow (Backlog + Branch – 按步调用技能)

You are running in task-branch mode: RALPH_TASK.md was generated from a backlog task. **Follow the step-by-step flow; at each step invoke the corresponding skill** (see **openspec-backlog-flow** for the full orchestration):

1. **Step 3 – spec-refine-and-plan (细化约定与写计划)** before coding: If RALPH_TASK.md does not yet have an "Implementation Steps" section with **per-step acceptance**, invoke the **spec-refine-and-plan** skill: add Implementation Steps (e.g. 1.1 Add route, 1.2 Write handler, 2.1 Run test) and for each step write a short **acceptance** (e.g. "1.1 done when: GET /api/v1/rooms returns 200"). This lets you iterate at the failing step when tests fail.
2. **Step 4 – plan-execute-step (按步执行)** Implement step by step: For each step, invoke the **plan-execute-step** behavior: do one step, verify its acceptance (quick check or run), then move on. When the overall test command fails, map the failure to a step and fix that step before re-running tests.
3. **Step 5 – task-run-test-command (跑测试)** Test convergence: Run the test command from RALPH_TASK.md (as in **task-run-test-command**); do not mark the task complete until tests pass. If they fail, fix the corresponding step and re-run.
4. **Optional – task-request-review** Before marking complete, you may invoke **task-request-review** to check implementation against Description/AC/Implementation Steps.
5. **Step 7 – ralph-finish-branch (完成与 PR)** Only after tests pass: mark AC complete, set Done, and optionally push/PR as in **ralph-finish-branch**.
6. **Test assertions from scenarios (完成前)** Before marking complete, generate or update the test assertion script so each test scenario has a **real assertion** (not a placeholder). Prefer updating the existing \`tests/test-task-<id>.py\`; for browser-side assertions use the **agent-browser** skill and document commands or a small script.

## Task Execution (CRITICAL - READ CAREFULLY)

**YOU MUST ACTUALLY WRITE CODE AND CREATE FILES. DO NOT JUST READ FILES AND EXIT.**

1. **Read the full RALPH_TASK.md** - understand the project context, task description, and implementation steps
2. **Check project structure** - if the project is empty, initialize it first:
   - Create package.json if missing
   - Create necessary directories
   - Install dependencies if needed
3. **Follow Implementation Steps** - if RALPH_TASK.md has "Implementation Steps", follow them in order (with per-step acceptance above)
4. **Work on the next unchecked criterion** - look for \`[ ]\` in Success Criteria section
5. **ACTUALLY WRITE CODE**:
   - Create new files as needed
   - Write actual implementation code
   - Don't just read files and exit
   - Make real changes to the codebase
6. **Test your changes** - run the test command from RALPH_TASK.md
   - If tests fail, read \`.ralph/test-results.log\` to see what failed
   - Fix the issues and run tests again
   - Tests MUST pass before marking criteria as complete
7. **Mark completed criteria**: Edit RALPH_TASK.md and change \`[ ]\` to \`[x]\`
   - Example: \`- [ ] Implement parser\` becomes \`- [x] Implement parser\`
   - This is how progress is tracked - YOU MUST update the file
8. **Commit your work**: \`git add -A && git commit -m 'ralph: [describe what you did]'\`
9. **Update \`.ralph/progress.md\` (Session History)**: In the **Session History** section, add a **new** block: \`**Session N completed** - <one-line summary of this session>\`, then a bullet list of what you did (e.g. 细化约定、实现要点、测试命令与结果). Use the same N as the current iteration (shown in the prompt). This is how session summaries are preserved; YOU MUST add this block before signaling complete.
10. **Before marking complete – 根据测试场景生成断言脚本**: If this task has test scenarios (in RALPH_TASK.md or backlog 测试场景/Acceptance Criteria), generate or update the test assertion script so each scenario has a **real assertion** (no placeholder like "需要根据具体需求实现"). Prefer updating the existing test file (e.g. \`.cursor/skills/watch-together-webapp-testing/tests/test-task-<id>.py\`) and only replace placeholder scenario blocks; keep the existing setup (create room, two browsers, member join). For assertions that need browser-side cooperation, use the **agent-browser** skill and document the commands or generate a small script (e.g. \`run-task-<id>-browser.sh\`).
11. When ALL criteria show \`[x]\` **and** step 9 (progress.md Session History) is done: output \`<ralph>COMPLETE</ralph>\`
12. If stuck 3+ times on same issue: output \`<ralph>GUTTER</ralph>\`

**IMPORTANT**: If you finish without writing any code or creating any files, you have NOT completed the task. You must make actual changes to the codebase.

## Learning from Failures

When something fails:
1. Check \`.ralph/errors.log\` for failure history
2. Figure out the root cause
3. Add a Sign to \`.ralph/guardrails.md\` using this format:

\`\`\`
### Sign: [Descriptive Name]
- **Trigger**: When this situation occurs
- **Instruction**: What to do instead
- **Added after**: Iteration $iteration - what happened
\`\`\`

## Context Rotation Warning

You may receive a warning that context is running low. When you see it:
1. Finish your current file edit
2. Commit and push your changes
3. Update .ralph/progress.md: add a **Session N completed** block in Session History (one-line summary + bullet list of what you did and what's next)
4. You will be rotated to a fresh agent that continues your work

Begin by reading the state files.
EOF
}

# =============================================================================
# SPINNER
# =============================================================================

# Spinner to show the loop is alive (not frozen)
# Outputs to stderr so it's not captured by $()
spinner() {
  local workspace="$1"
  local spin='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
  local i=0
  while true; do
    printf "\r  🐛 Agent working... %s  (watch: tail -f %s/.ralph/activity.log)" "${spin:i++%${#spin}:1}" "$workspace" >&2
    sleep 0.1
  done
}

# =============================================================================
# ITERATION RUNNER
# =============================================================================

# Run a single agent iteration
# Returns: signal (ROTATE, GUTTER, COMPLETE, or empty)
run_iteration() {
  local workspace="$1"
  local iteration="$2"
  local session_id="${3:-}"
  local script_dir="${4:-$(dirname "${BASH_SOURCE[0]}")}"
  
  local prompt=$(build_prompt "$workspace" "$iteration")
  local signal_file="$workspace/.ralph/.parser_signal"
  local prompt_file="$workspace/.ralph/.prompt_$$"
  
  # Write prompt to temporary file to avoid shell parsing issues
  echo "$prompt" > "$prompt_file"
  
  # Use temporary file instead of named pipe (Windows/WSL compatibility)
  rm -f "$signal_file"
  touch "$signal_file"
  
  # Debug: log signal file initialization
  echo "[$(date '+%H:%M:%S')] Initialized signal_file: $signal_file" >> "$workspace/.ralph/signal_debug.log" 2>/dev/null || true
  
  # Try to create named pipe, fallback to regular file if not supported
  local use_fifo=true
  if ! mkfifo "$signal_file" 2>/dev/null; then
    # Fallback: use regular file with tail -f
    rm -f "$signal_file"
    touch "$signal_file"
    use_fifo=false
  fi
  
  # Use stderr for display (stdout is captured for signal)
  echo "" >&2
  echo "═══════════════════════════════════════════════════════════════════" >&2
  echo "🐛 Ralph Iteration $iteration" >&2
  echo "═══════════════════════════════════════════════════════════════════" >&2
  echo "" >&2
  echo "Workspace: $workspace" >&2
  echo "Model:     $MODEL" >&2
  echo "Monitor:   tail -f $workspace/.ralph/activity.log" >&2
  echo "" >&2
  
  # Log session start to progress.md
  log_progress "$workspace" "**Session $iteration started** (model: $MODEL)"
  
  # Find cursor-agent executable
  local cursor_agent_cmd=""
  if command -v cursor-agent &> /dev/null; then
    cursor_agent_cmd="cursor-agent"
  elif [[ -n "${CURSOR_AGENT_PATH:-}" ]] && [[ -x "$CURSOR_AGENT_PATH" ]]; then
    cursor_agent_cmd="$CURSOR_AGENT_PATH"
  else
    echo "❌ cursor-agent not found in PATH and CURSOR_AGENT_PATH not set" >&2
    echo "   Please install cursor-agent or set CURSOR_AGENT_PATH environment variable" >&2
    return 1
  fi
  
  # Change to workspace
  cd "$workspace"
  
  # Start spinner to show we're alive
  spinner "$workspace" &
  local spinner_pid=$!
  
  # Start parser in background, reading from cursor-agent
  # Parser now writes signals directly to signal file (no pipe needed)
  # Separate stderr from stdout: cursor-agent stdout (JSON) goes to parser, stderr goes to log
  echo "[$(date '+%H:%M:%S')] Starting agent with parser, signal_file=$signal_file" >> "$workspace/.ralph/signal_debug.log" 2>/dev/null || true
  echo "[$(date '+%H:%M:%S')] Command: $cursor_agent_cmd -p --force --output-format stream-json --model $MODEL${session_id:+ --resume=$session_id}" >> "$workspace/.ralph/signal_debug.log" 2>/dev/null || true
  (
    # Redirect stderr to log file, stdout (JSON stream) to parser
    # Pass prompt via file to avoid shell parsing issues with special characters
    # cursor-agent reads prompt from stdin or can take it as argument
    # Use process substitution to pipe prompt file to cursor-agent
    
    # Test if cursor-agent actually works before piping
    if ! $cursor_agent_cmd --version &> /dev/null && ! $cursor_agent_cmd --help &> /dev/null; then
      echo "[$(date '+%H:%M:%S')] ERROR: cursor-agent command failed to execute" >> "$workspace/.ralph/parser_stderr.log" 2>&1
      echo "[$(date '+%H:%M:%S')] Attempted command: $cursor_agent_cmd" >> "$workspace/.ralph/parser_stderr.log" 2>&1
      echo "[$(date '+%H:%M:%S')] PATH: $PATH" >> "$workspace/.ralph/parser_stderr.log" 2>&1
      rm -f "$prompt_file"
      exit 1
    fi
    
    # Use array to avoid eval issues with special characters
    # Split command into array for safer execution
    local cmd_parts=()
    cmd_parts+=("$cursor_agent_cmd")
    cmd_parts+=("-p")
    cmd_parts+=("--force")
    cmd_parts+=("--output-format")
    cmd_parts+=("stream-json")
    cmd_parts+=("--model")
    cmd_parts+=("$MODEL")
    
    if [[ -n "$session_id" ]]; then
      cmd_parts+=("--resume=$session_id")
    fi
    
    if command -v stdbuf &> /dev/null; then
      "${cmd_parts[@]}" < "$prompt_file" 2>> "$workspace/.ralph/parser_stderr.log" | stdbuf -oL -eL "$script_dir/stream-parser.sh" "$workspace" 2>> "$workspace/.ralph/parser_stderr.log"
    else
      "${cmd_parts[@]}" < "$prompt_file" 2>> "$workspace/.ralph/parser_stderr.log" | "$script_dir/stream-parser.sh" "$workspace" 2>> "$workspace/.ralph/parser_stderr.log"
    fi
    local exit_code=${PIPESTATUS[0]}
    if [[ $exit_code -ne 0 ]]; then
      echo "[$(date '+%H:%M:%S')] cursor-agent exited with code: $exit_code" >> "$workspace/.ralph/parser_stderr.log" 2>&1
    fi
    # Cleanup prompt file
    rm -f "$prompt_file"
  ) &
  local agent_pid=$!
  echo "[$(date '+%H:%M:%S')] Agent started with PID: $agent_pid" >> "$workspace/.ralph/signal_debug.log" 2>/dev/null || true
  
  # Read signals from parser
  local signal=""
  if [[ "$use_fifo" == "true" ]]; then
    # Use named pipe (Linux/macOS)
    while IFS= read -r line; do
      case "$line" in
        "ROTATE")
          printf "\r\033[K" >&2  # Clear spinner line
          echo "🔄 Context rotation triggered - stopping agent..." >&2
          kill $agent_pid 2>/dev/null || true
          signal="ROTATE"
          break
          ;;
        "WARN")
          printf "\r\033[K" >&2  # Clear spinner line
          echo "⚠️  Context warning - agent should wrap up soon..." >&2
          ;;
        "GUTTER")
          printf "\r\033[K" >&2  # Clear spinner line
          echo "🚨 Gutter detected - agent may be stuck..." >&2
          signal="GUTTER"
          ;;
        "COMPLETE")
          printf "\r\033[K" >&2  # Clear spinner line
          echo "✅ Agent signaled completion!" >&2
          signal="COMPLETE"
          ;;
      esac
    done < "$signal_file"
  else
    # Use file polling (Windows/WSL fallback)
    # Read signals while agent is running
    local last_size=0
    while kill -0 $agent_pid 2>/dev/null; do
      if [[ -f "$signal_file" ]]; then
        local current_size=$(wc -c < "$signal_file" 2>/dev/null || echo 0)
        # Only read if file has grown (new signals)
        if [[ $current_size -gt $last_size ]]; then
          # Read only new lines
          tail -c +$((last_size + 1)) "$signal_file" 2>/dev/null | while IFS= read -r line || [[ -n "$line" ]]; do
            [[ -z "$line" ]] && continue
            # Strip whitespace and newlines
            line=$(echo "$line" | tr -d '\r\n' | xargs)
            case "$line" in
              "ROTATE")
                printf "\r\033[K" >&2
                echo "🔄 Context rotation triggered - stopping agent..." >&2
                kill $agent_pid 2>/dev/null || true
                signal="ROTATE"
                echo "[$(date '+%H:%M:%S')] Signal detected: ROTATE" >> "$workspace/.ralph/signal_debug.log" 2>/dev/null || true
                break 2  # Break both loops
                ;;
              "WARN")
                printf "\r\033[K" >&2
                echo "⚠️  Context warning - agent should wrap up soon..." >&2
                ;;
              "GUTTER")
                printf "\r\033[K" >&2
                echo "🚨 Gutter detected - agent may be stuck..." >&2
                signal="GUTTER"
                echo "[$(date '+%H:%M:%S')] Signal detected: GUTTER" >> "$workspace/.ralph/signal_debug.log" 2>/dev/null || true
                ;;
              "COMPLETE")
                printf "\r\033[K" >&2
                echo "✅ Agent signaled completion!" >&2
                signal="COMPLETE"
                echo "[$(date '+%H:%M:%S')] Signal detected: COMPLETE" >> "$workspace/.ralph/signal_debug.log" 2>/dev/null || true
                ;;
              "FINISHED")
                printf "\r\033[K" >&2
                echo "✓ Agent finished normally" >&2
                signal="FINISHED"
                echo "[$(date '+%H:%M:%S')] Signal detected: FINISHED" >> "$workspace/.ralph/signal_debug.log" 2>/dev/null || true
                ;;
            esac
          done
          last_size=$current_size
        fi
      fi
      sleep 0.1
    done
    
    # After agent finishes, wait a bit and check for final signals
    # (signals might be written after agent process ends)
    sleep 1.0
    if [[ -f "$signal_file" ]] && [[ -z "$signal" ]]; then
      # Read all signals from file (check all lines, not just new ones)
      while IFS= read -r line || [[ -n "$line" ]]; do
        [[ -z "$line" ]] && continue
        # Strip whitespace
        line=$(echo "$line" | tr -d '\r\n' | xargs)
        case "$line" in
          "ROTATE") 
            signal="ROTATE"
            echo "[$(date '+%H:%M:%S')] Final check found: ROTATE" >> "$workspace/.ralph/signal_debug.log" 2>/dev/null || true
            ;;
          "GUTTER") 
            signal="GUTTER"
            echo "[$(date '+%H:%M:%S')] Final check found: GUTTER" >> "$workspace/.ralph/signal_debug.log" 2>/dev/null || true
            ;;
          "COMPLETE") 
            signal="COMPLETE"
            echo "[$(date '+%H:%M:%S')] Final check found: COMPLETE" >> "$workspace/.ralph/signal_debug.log" 2>/dev/null || true
            ;;
          "FINISHED") 
            signal="FINISHED"
            echo "[$(date '+%H:%M:%S')] Final check found: FINISHED" >> "$workspace/.ralph/signal_debug.log" 2>/dev/null || true
            ;;
        esac
        [[ -n "$signal" ]] && break
      done < "$signal_file" 2>/dev/null || true
    fi
  fi
  
  # Wait for agent to finish
  wait $agent_pid 2>/dev/null || true
  
  # Final check for signals after agent finishes (important for Windows/WSL)
  # Wait a bit more for parser to flush output and write FINISHED signal
  sleep 1.0
  echo "[$(date '+%H:%M:%S')] After agent wait, checking signal file: $signal_file" >> "$workspace/.ralph/signal_debug.log" 2>/dev/null || true
  echo "[$(date '+%H:%M:%S')] Signal file exists: $([ -f "$signal_file" ] && echo "yes" || echo "no")" >> "$workspace/.ralph/signal_debug.log" 2>/dev/null || true
  echo "[$(date '+%H:%M:%S')] Signal file size: $(wc -c < "$signal_file" 2>/dev/null || echo 0)" >> "$workspace/.ralph/signal_debug.log" 2>/dev/null || true
  if [[ -z "$signal" ]] && [[ -f "$signal_file" ]] && [[ -s "$signal_file" ]]; then
    # Read the last line (most recent signal)
    local line=$(tail -n 1 "$signal_file" 2>/dev/null | tr -d '\r\n' | xargs || echo "")
    case "$line" in
      "ROTATE") 
        signal="ROTATE"
        echo "[$(date '+%H:%M:%S')] Very final check found: ROTATE" >> "$workspace/.ralph/signal_debug.log" 2>/dev/null || true
        ;;
      "GUTTER") 
        signal="GUTTER"
        echo "[$(date '+%H:%M:%S')] Very final check found: GUTTER" >> "$workspace/.ralph/signal_debug.log" 2>/dev/null || true
        ;;
      "COMPLETE") 
        signal="COMPLETE"
        echo "[$(date '+%H:%M:%S')] Very final check found: COMPLETE" >> "$workspace/.ralph/signal_debug.log" 2>/dev/null || true
        ;;
      "FINISHED") 
        signal="FINISHED"
        echo "[$(date '+%H:%M:%S')] Very final check found: FINISHED" >> "$workspace/.ralph/signal_debug.log" 2>/dev/null || true
        ;;
    esac
  fi
  
  # Log final signal value for debugging
  echo "[$(date '+%H:%M:%S')] Returning signal: '${signal:-empty}'" >> "$workspace/.ralph/signal_debug.log" 2>/dev/null || true
  
  # Stop spinner and clear line
  kill $spinner_pid 2>/dev/null || true
  wait $spinner_pid 2>/dev/null || true
  printf "\r\033[K" >&2  # Clear spinner line
  
  # Cleanup
  rm -f "$signal_file"
  rm -f "$prompt_file"
  
  echo "$signal"
}

# =============================================================================
# MAIN LOOP
# =============================================================================

# Run the main Ralph loop
# Args: workspace
# Uses global: MAX_ITERATIONS, MODEL, USE_BRANCH, OPEN_PR
run_ralph_loop() {
  local workspace="$1"
  local script_dir="${2:-$(dirname "${BASH_SOURCE[0]}")}"
  
  # Commit any uncommitted work first
  cd "$workspace"
  if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
    echo "📦 Committing uncommitted changes..."
    git add -A
    git commit -m "ralph: initial commit before loop" || true
  fi
  
  # Create branch if requested
  if [[ -n "$USE_BRANCH" ]]; then
    echo "🌿 Creating branch: $USE_BRANCH"
    git checkout -b "$USE_BRANCH" 2>/dev/null || git checkout "$USE_BRANCH"
  fi
  
  echo ""
  echo "🚀 Starting Ralph loop..."
  echo ""
  
  # Main loop
  local iteration=1
  local session_id=""
  
  while [[ $iteration -le $MAX_ITERATIONS ]]; do
    # Run iteration
    local signal
    signal=$(run_iteration "$workspace" "$iteration" "$session_id" "$script_dir")
    
    # Check task completion
    local task_status
    task_status=$(check_task_complete "$workspace" "$script_dir")
    
    if [[ "$task_status" == "COMPLETE" ]]; then
      log_progress "$workspace" "**Session $iteration ended** - ✅ TASK COMPLETE"
      echo ""
      echo "═══════════════════════════════════════════════════════════════════"
      echo "🎉 RALPH COMPLETE! All criteria satisfied."
      echo "═══════════════════════════════════════════════════════════════════"
      echo ""
      echo "Completed in $iteration iteration(s)."
      echo "Check git log for detailed history."
      echo ""
      # finalize_completed_task already run inside check_task_complete when all criteria checked
      
      # Open PR if requested
      if [[ "$OPEN_PR" == "true" ]] && [[ -n "$USE_BRANCH" ]]; then
        echo ""
        echo "📝 Opening pull request..."
        git push -u origin "$USE_BRANCH" 2>/dev/null || git push
        if command -v gh &> /dev/null; then
          gh pr create --fill || echo "⚠️  Could not create PR automatically. Create manually."
        else
          echo "⚠️  gh CLI not found. Push complete, create PR manually."
        fi
      fi
      
      return 0
    fi
    
    # Handle signals
    case "$signal" in
      "COMPLETE")
        # Agent signaled completion - verify with checkbox check
        if [[ "$task_status" == "COMPLETE" ]]; then
          log_progress "$workspace" "**Session $iteration ended** - ✅ TASK COMPLETE (agent signaled)"
          echo ""
          echo "═══════════════════════════════════════════════════════════════════"
          echo "🎉 RALPH COMPLETE! Agent signaled completion and all criteria verified."
          echo "═══════════════════════════════════════════════════════════════════"
          echo ""
          echo "Completed in $iteration iteration(s)."
          echo "Check git log for detailed history."
          
          # Open PR if requested
          if [[ "$OPEN_PR" == "true" ]] && [[ -n "$USE_BRANCH" ]]; then
            echo ""
            echo "📝 Opening pull request..."
            git push -u origin "$USE_BRANCH" 2>/dev/null || git push
            if command -v gh &> /dev/null; then
              gh pr create --fill || echo "⚠️  Could not create PR automatically. Create manually."
            else
              echo "⚠️  gh CLI not found. Push complete, create PR manually."
            fi
          fi
          
          return 0
        else
          # Agent said complete but checkboxes say otherwise - continue
          log_progress "$workspace" "**Session $iteration ended** - Agent signaled complete but criteria remain"
          echo ""
          echo "⚠️  Agent signaled completion but unchecked criteria remain."
          echo "   Continuing with next iteration..."
          iteration=$((iteration + 1))
        fi
        ;;
      "ROTATE")
        log_progress "$workspace" "**Session $iteration ended** - 🔄 Context rotation (token limit reached)"
        echo ""
        echo "🔄 Rotating to fresh context..."
        iteration=$((iteration + 1))
        session_id=""
        ;;
      "GUTTER")
        log_progress "$workspace" "**Session $iteration ended** - 🚨 GUTTER (agent stuck)"
        echo ""
        echo "🚨 Gutter detected. Check .ralph/errors.log for details."
        echo "   The agent may be stuck. Consider:"
        echo "   1. Check .ralph/guardrails.md for lessons"
        echo "   2. Manually fix the blocking issue"
        echo "   3. Re-run the loop"
        return 1
        ;;
      *)
        # Agent finished naturally, check if more work needed
        if [[ "$task_status" == INCOMPLETE:* ]]; then
          local remaining_count=${task_status#INCOMPLETE:}
          log_progress "$workspace" "**Session $iteration ended** - Agent finished naturally ($remaining_count criteria remaining)"
          echo ""
          echo "📋 Agent finished but $remaining_count criteria remaining."
          echo "   Starting next iteration..."
          iteration=$((iteration + 1))
        fi
        ;;
    esac
    
    # Brief pause between iterations
    sleep 2
  done
  
  log_progress "$workspace" "**Loop ended** - ⚠️ Max iterations ($MAX_ITERATIONS) reached"
  echo ""
  echo "⚠️  Max iterations ($MAX_ITERATIONS) reached."
  echo "   Task may not be complete. Check progress manually."
  return 1
}

# =============================================================================
# PREREQUISITE CHECKS
# =============================================================================

# Check all prerequisites, exit with error message if any fail
check_prerequisites() {
  local workspace="$1"
  local script_dir="${2:-$(dirname "${BASH_SOURCE[0]}")}"
  local task_file="$workspace/RALPH_TASK.md"
  
  # Check for task file
  if [[ ! -f "$task_file" ]]; then
    echo "ℹ️  No RALPH_TASK.md found in $workspace"
    echo "   Attempting to load task from backlog..." >&2
    
    # Try to load from backlog
    if load_task_from_backlog "$workspace" "$script_dir"; then
      echo "✅ Successfully loaded task from backlog" >&2
      # Task file should now exist, verify
      if [[ -f "$task_file" ]]; then
        return 0
      fi
    fi
    
    echo "❌ Could not load task from backlog. Please create RALPH_TASK.md manually:"
    echo ""
    echo "Create a task file first:"
    echo "  cat > RALPH_TASK.md << 'EOF'"
    echo "  ---"
    echo "  task: Your task description"
    echo "  test_command: \"npm test\""
    echo "  ---"
    echo "  # Task"
    echo "  ## Success Criteria"
    echo "  1. [ ] First thing to do"
    echo "  2. [ ] Second thing to do"
    echo "  EOF"
    return 1
  fi
  
  # Check for cursor-agent CLI
  local cursor_agent_cmd=""
  if command -v cursor-agent &> /dev/null; then
    cursor_agent_cmd="cursor-agent"
  elif [[ -n "${CURSOR_AGENT_PATH:-}" ]] && [[ -x "$CURSOR_AGENT_PATH" ]]; then
    cursor_agent_cmd="$CURSOR_AGENT_PATH"
  else
    echo "❌ cursor-agent CLI not found"
    echo ""
    echo "Options:"
    echo "  1. Install via: curl https://cursor.com/install -fsS | bash"
    echo "  2. Or set CURSOR_AGENT_PATH environment variable to point to cursor-agent executable"
    echo ""
    echo "Current PATH: $PATH"
    if [[ -n "${CURSOR_AGENT_PATH:-}" ]]; then
      echo "CURSOR_AGENT_PATH: $CURSOR_AGENT_PATH (not executable or not found)"
    fi
    return 1
  fi
  
  # Test if cursor-agent actually works
  if ! $cursor_agent_cmd --version &> /dev/null && ! $cursor_agent_cmd --help &> /dev/null 2>&1; then
    echo "⚠️  cursor-agent found but may not be working correctly"
    echo "   Command: $cursor_agent_cmd"
    echo "   This may cause issues during execution"
  fi
  
  # Check for git repo
  if ! git -C "$workspace" rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not a git repository"
    echo "   Ralph requires git for state persistence."
    return 1
  fi
  
  return 0
}

# =============================================================================
# DISPLAY HELPERS
# =============================================================================

# Show task summary
show_task_summary() {
  local workspace="$1"
  local task_file="$workspace/RALPH_TASK.md"
  
  echo "📋 Task Summary:"
  echo "─────────────────────────────────────────────────────────────────"
  head -30 "$task_file"
  echo "─────────────────────────────────────────────────────────────────"
  echo ""
  
  # Count criteria - only actual checkbox list items (- [ ], * [x], 1. [ ], etc.)
  local total_criteria done_criteria remaining
  total_criteria=$(grep -cE '^[[:space:]]*([-*]|[0-9]+\.)[[:space:]]+\[(x| )\]' "$task_file" 2>/dev/null) || total_criteria=0
  done_criteria=$(grep -cE '^[[:space:]]*([-*]|[0-9]+\.)[[:space:]]+\[x\]' "$task_file" 2>/dev/null) || done_criteria=0
  remaining=$((total_criteria - done_criteria))
  
  echo "Progress: $done_criteria / $total_criteria criteria complete ($remaining remaining)"
  echo "Model:    $MODEL"
  echo ""
  
  # Return remaining count for caller to check
  echo "$remaining"
}

# Show Ralph banner
show_banner() {
  echo "═══════════════════════════════════════════════════════════════════"
  echo "🐛 Ralph Wiggum: Autonomous Development Loop"
  echo "═══════════════════════════════════════════════════════════════════"
  echo ""
  echo "  \"That's the beauty of Ralph - the technique is deterministically"
  echo "   bad in an undeterministic world.\""
  echo ""
  echo "═══════════════════════════════════════════════════════════════════"
  echo ""
}
