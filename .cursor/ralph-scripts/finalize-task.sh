#!/bin/bash
# Ralph Wiggum: Finalize Completed Task
#
# Manually finalize a completed task:
#   1. Update backlog status to "Done"
#   2. Save RALPH_TASK.md content to backlog task notes
#   3. Delete RALPH_TASK.md
#
# Usage:
#   ./finalize-task.sh                    # Finalize current task
#   ./finalize-task.sh /path/to/project   # Finalize task in specific project

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source common functions
source "$SCRIPT_DIR/ralph-common.sh"

# =============================================================================
# MAIN
# =============================================================================

main() {
  # Resolve workspace
  local workspace="${1:-$(pwd)}"
  if [[ "$workspace" == "." ]]; then
    workspace="$(pwd)"
  else
    workspace="$(cd "$workspace" && pwd)"
  fi
  
  local task_file="$workspace/RALPH_TASK.md"
  
  echo "═══════════════════════════════════════════════════════════════════"
  echo "📋 Finalize Completed Task"
  echo "═══════════════════════════════════════════════════════════════════"
  echo ""
  echo "Workspace: $workspace"
  echo ""
  
  # Check if RALPH_TASK.md exists
  if [[ ! -f "$task_file" ]]; then
    echo "❌ RALPH_TASK.md not found in $workspace"
    echo ""
    echo "Nothing to finalize."
    exit 1
  fi
  
  # Show task summary
  echo "📋 Current Task:"
  echo "─────────────────────────────────────────────────────────────────"
  head -10 "$task_file"
  echo "─────────────────────────────────────────────────────────────────"
  echo ""
  
  # Confirm
  read -p "Finalize this task? (update status, save doc, delete RALPH_TASK.md) [y/N] " -n 1 -r
  echo ""
  
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
  
  echo ""
  
  # Call finalize function
  if finalize_completed_task "$workspace" "$SCRIPT_DIR"; then
    echo ""
    echo "✅ Task finalized successfully!"
    exit 0
  else
    echo ""
    echo "❌ Failed to finalize task. Check errors above."
    exit 1
  fi
}

main "$@"
