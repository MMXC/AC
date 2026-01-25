#!/usr/bin/env python3
"""
Backlog Integration for Ralph
Handles reading tasks from backlog and updating task status
"""

import json
import sys
import os
import subprocess
import re
from pathlib import Path

def call_mcp_tool(tool_name, arguments=None):
    """Call an MCP tool via cursor-agent or direct MCP"""
    # Try to use cursor-agent if available
    # This is a placeholder - actual implementation depends on MCP setup
    try:
        # For now, we'll use a file-based approach if MCP is not directly available
        # In production, this would call the actual MCP tool
        return None
    except Exception as e:
        print(f"Error calling MCP tool {tool_name}: {e}", file=sys.stderr)
        return None

def search_backlog_tasks(query="status:To Do OR status:In Progress"):
    """
    Search for tasks in backlog
    Returns list of tasks matching the query
    """
    # Try MCP first
    result = call_mcp_tool("backlog.search_tasks", {"query": query})
    if result:
        return result
    
    # Fallback: try to read from backlog.md if it exists
    workspace = os.getcwd()
    backlog_file = Path(workspace) / "backlog.md"
    
    if backlog_file.exists():
        return parse_backlog_md(backlog_file)
    
    # Try backlog directory
    backlog_dir = Path(workspace) / "backlog"
    if backlog_dir.exists():
        # Look for task files
        tasks = []
        for task_file in backlog_dir.glob("*.md"):
            task = parse_task_file(task_file)
            if task and task.get("status") in ["To Do", "In Progress"]:
                tasks.append(task)
        return tasks
    
    return []

def parse_backlog_md(backlog_file):
    """Parse a backlog.md file and extract tasks"""
    tasks = []
    try:
        with open(backlog_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Look for task sections
        # Format: ### [ ] Task Title
        task_pattern = r'###\s+\[([ x])\]\s+(.+?)(?=\n###|\n---|\Z)'
        matches = re.finditer(task_pattern, content, re.DOTALL)
        
        for match in matches:
            status_char = match.group(1)
            task_content = match.group(2).strip()
            
            # Extract status from checkbox and Status field
            status = "Done" if status_char == "x" else "To Do"
            
            # Check for explicit Status field
            status_match = re.search(r'\*\*Status\*\*:\s*([^\n]+)', task_content)
            if status_match:
                status = status_match.group(1).strip()
            
            # Extract title (first line, remove markdown formatting)
            lines = task_content.split('\n')
            title = lines[0].strip() if lines else "Untitled Task"
            title = re.sub(r'^\*\*.*?\*\*:\s*', '', title)  # Remove **Field**: prefix
            title = title.strip()
            
            # Extract backlog_id if present
            backlog_id_match = re.search(r'\*\*ID\*\*:\s*([^\n]+)', task_content)
            backlog_id = backlog_id_match.group(1).strip() if backlog_id_match else None
            
            # If no ID found, generate from title
            if not backlog_id:
                backlog_id = title.lower().replace(' ', '-').replace('(', '').replace(')', '')
                backlog_id = re.sub(r'[^\w-]', '', backlog_id)
            
            # Extract description (everything after title, before next section)
            description_lines = []
            skip_next = False
            for line in lines[1:]:
                line = line.strip()
                if not line:
                    continue
                # Skip metadata lines
                if re.match(r'\*\*(ID|Status)\*\*:', line):
                    continue
                description_lines.append(line)
            
            description = '\n'.join(description_lines).strip()
            
            tasks.append({
                "id": backlog_id,
                "title": title,
                "description": description,
                "status": status,
                "content": task_content
            })
    except Exception as e:
        print(f"Error parsing backlog.md: {e}", file=sys.stderr)
    
    return tasks

def parse_task_file(task_file):
    """Parse a single task file from backlog directory"""
    try:
        with open(task_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract frontmatter if present
        if content.startswith('---'):
            parts = content.split('---', 2)
            if len(parts) >= 3:
                import yaml
                try:
                    frontmatter = yaml.safe_load(parts[1])
                    body = parts[2].strip()
                    
                    return {
                        "id": frontmatter.get("id") or task_file.stem,
                        "title": frontmatter.get("title", task_file.stem),
                        "description": body,
                        "status": frontmatter.get("status", "To Do"),
                        "content": content
                    }
                except:
                    pass
        
        # Fallback: use filename and content
        return {
            "id": task_file.stem,
            "title": task_file.stem.replace('-', ' ').title(),
            "description": content,
            "status": "To Do",
            "content": content
        }
    except Exception as e:
        print(f"Error parsing task file {task_file}: {e}", file=sys.stderr)
        return None

def get_next_task():
    """Get the next uncompleted task from backlog"""
    tasks = search_backlog_tasks()
    
    # Prioritize "In Progress" tasks, then "To Do"
    in_progress = [t for t in tasks if t.get("status") == "In Progress"]
    to_do = [t for t in tasks if t.get("status") == "To Do"]
    
    if in_progress:
        return in_progress[0]
    elif to_do:
        return to_do[0]
    
    return None

def generate_ralph_task(task):
    """Generate RALPH_TASK.md content from a backlog task"""
    if not task:
        return None
    
    # Extract success criteria from task description
    # Look for numbered lists or checkboxes
    criteria = []
    description = task.get("description", "") or task.get("content", "")
    
    # Extract checkboxes or numbered items
    criteria_pattern = r'(?:^|\n)\s*(?:[-*]|\d+\.)\s+\[([ x])\]\s+(.+?)(?=\n(?:[-*]|\d+\.)|$)'
    criteria_matches = re.finditer(criteria_pattern, description, re.MULTILINE)
    
    for match in criteria_matches:
        checked = match.group(1) == "x"
        criterion_text = match.group(2).strip()
        criteria.append({
            "text": criterion_text,
            "checked": checked
        })
    
    # If no criteria found, try to extract from "Success Criteria" section
    if not criteria:
        success_section = re.search(r'##\s+Success\s+Criteria\s*\n(.*?)(?=\n##|\Z)', description, re.DOTALL | re.IGNORECASE)
        if success_section:
            criteria_text = success_section.group(1)
            criteria_matches = re.finditer(criteria_pattern, criteria_text, re.MULTILINE)
            for match in criteria_matches:
                checked = match.group(1) == "x"
                criterion_text = match.group(2).strip()
                criteria.append({
                    "text": criterion_text,
                    "checked": checked
                })
    
    # Build RALPH_TASK.md
    backlog_id = task.get("id", "")
    title = task.get("title", "Untitled Task")
    
    frontmatter = f"""---
task: {title}
backlog_id: "{backlog_id}"
---
"""
    
    body = f"""# Task: {title}

{description}

## Success Criteria

"""
    
    # Add criteria
    for i, criterion in enumerate(criteria, 1):
        checkbox = "[x]" if criterion["checked"] else "[ ]"
        body += f"{i}. {checkbox} {criterion['text']}\n"
    
    # If no criteria, add a default one
    if not criteria:
        body += "1. [ ] Complete the task\n"
    
    body += """
---

## Ralph Instructions

1. Work on the next incomplete criterion (marked [ ])
2. Check off completed criteria (change [ ] to [x])
3. Run tests after changes
4. Commit your changes frequently
5. When ALL criteria are [x], output: `<ralph>COMPLETE</ralph>`
6. If stuck on the same issue 3+ times, output: `<ralph>GUTTER</ralph>`
"""
    
    return frontmatter + body

def update_backlog_status(backlog_id, new_status):
    """Update the status of a task in backlog"""
    # Try MCP first
    result = call_mcp_tool("backlog.update_task", {
        "task_id": backlog_id,
        "status": new_status
    })
    
    if result:
        return True
    
    # Fallback: update backlog.md file
    workspace = os.getcwd()
    backlog_file = Path(workspace) / "backlog.md"
    
    if backlog_file.exists():
        try:
            with open(backlog_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Update task status in markdown
            # Find the task by ID and update both checkbox and Status field
            # Pattern: ### [x] Title ... **ID**: backlog_id ... **Status**: ...
            pattern = rf'(###\s+\[)([ x])(\]\s+.*?\*\*ID\*\*:\s*{re.escape(backlog_id)}[^\n]*\n.*?\*\*Status\*\*:\s*)([^\n]+)'
            
            def replace_status(m):
                checkbox = m.group(1)
                old_checkbox = m.group(2)
                status_prefix = m.group(3)
                old_status = m.group(4)
                
                # Update checkbox
                if new_status == "Done":
                    new_checkbox = "x"
                elif new_status == "In Progress":
                    new_checkbox = " "
                else:
                    new_checkbox = " "
                
                return f"{checkbox}{new_checkbox}]{status_prefix}{new_status}"
            
            updated_content = re.sub(pattern, replace_status, content, flags=re.DOTALL)
            
            # Also update just the checkbox if Status field doesn't exist
            if updated_content == content:
                pattern2 = rf'(###\s+\[)([ x])(\]\s+.*?\*\*ID\*\*:\s*{re.escape(backlog_id)}[^\n]*)'
                if new_status == "Done":
                    replacement2 = r'\1x\2\3'
                elif new_status == "In Progress":
                    replacement2 = r'\1 \2\3'
                else:
                    replacement2 = r'\1 \2\3'
                updated_content = re.sub(pattern2, replacement2, content, flags=re.DOTALL)
            
            if updated_content != content:
                with open(backlog_file, 'w', encoding='utf-8') as f:
                    f.write(updated_content)
                return True
        except Exception as e:
            print(f"Error updating backlog.md: {e}", file=sys.stderr)
    
    return False

def create_backlog_task(task_data):
    """Create a new task in backlog.md"""
    workspace = os.getcwd()
    backlog_file = Path(workspace) / "backlog.md"
    
    # Ensure backlog.md exists
    if not backlog_file.exists():
        # Create initial backlog.md
        with open(backlog_file, 'w', encoding='utf-8') as f:
            f.write("# Backlog\n\n## Tasks\n\n")
    
    try:
        with open(backlog_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract task fields
        task_id = task_data.get('id', '')
        title = task_data.get('title', 'Untitled Task')
        description = task_data.get('description', '')
        test_command = task_data.get('test_command', '')
        success_criteria = task_data.get('success_criteria', [])
        
        # Build task markdown
        task_md = f"\n### [ ] {title}\n\n"
        task_md += f"**ID**: {task_id}  \n"
        task_md += f"**Status**: To Do\n\n"
        
        if description:
            task_md += f"**Description**:  \n{description}\n\n"
        
        if test_command:
            task_md += f"**Test Command**: `{test_command}`\n\n"
        
        if success_criteria:
            task_md += "**Success Criteria**:\n"
            for i, criterion in enumerate(success_criteria, 1):
                task_md += f"{i}. [ ] {criterion}\n"
            task_md += "\n"
        
        task_md += "---\n"
        
        # Append to backlog.md (before the last line if it exists)
        if content.strip().endswith("---"):
            # Insert before last ---
            content = content.rstrip() + task_md
        else:
            content += task_md
        
        with open(backlog_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return True
    except Exception as e:
        print(f"Error creating task in backlog.md: {e}", file=sys.stderr)
        return False

def create_tasks_from_decomposition(tasks_json):
    """Create multiple tasks from decomposition result"""
    try:
        if isinstance(tasks_json, str):
            tasks = json.loads(tasks_json)
        else:
            tasks = tasks_json
        
        created = []
        for task in tasks:
            if create_backlog_task(task):
                created.append(task['id'])
        
        return created
    except Exception as e:
        print(f"Error creating tasks: {e}", file=sys.stderr)
        return []

def main():
    """CLI interface"""
    if len(sys.argv) < 2:
        print("Usage: backlog-integration.py <command> [args...]")
        print("Commands:")
        print("  get-next-task     - Get next uncompleted task")
        print("  generate-task     - Generate RALPH_TASK.md from next task")
        print("  update-status <id> <status> - Update task status")
        print("  create-task <json> - Create a single task from JSON")
        print("  create-tasks <json_file> - Create multiple tasks from JSON file")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "get-next-task":
        task = get_next_task()
        if task:
            print(json.dumps(task, indent=2, ensure_ascii=False))
        else:
            print("{}")
            sys.exit(1)
    
    elif command == "generate-task":
        task = get_next_task()
        if task:
            ralph_task = generate_ralph_task(task)
            if ralph_task:
                print(ralph_task)
            else:
                print("Failed to generate task", file=sys.stderr)
                sys.exit(1)
        else:
            print("No tasks found", file=sys.stderr)
            sys.exit(1)
    
    elif command == "update-status":
        if len(sys.argv) < 4:
            print("Usage: backlog-integration.py update-status <backlog_id> <status>", file=sys.stderr)
            sys.exit(1)
        
        backlog_id = sys.argv[2]
        status = sys.argv[3]
        
        if update_backlog_status(backlog_id, status):
            print(f"Updated task {backlog_id} to {status}")
        else:
            print(f"Failed to update task {backlog_id}", file=sys.stderr)
            sys.exit(1)
    
    elif command == "create-task":
        if len(sys.argv) < 3:
            print("Usage: backlog-integration.py create-task <json_string>", file=sys.stderr)
            sys.exit(1)
        
        task_json = sys.argv[2]
        task_data = json.loads(task_json)
        
        if create_backlog_task(task_data):
            print(f"Created task: {task_data.get('id')}")
        else:
            print(f"Failed to create task", file=sys.stderr)
            sys.exit(1)
    
    elif command == "create-tasks":
        if len(sys.argv) < 3:
            print("Usage: backlog-integration.py create-tasks <json_file>", file=sys.stderr)
            sys.exit(1)
        
        json_file = sys.argv[2]
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                tasks_data = json.load(f)
            
            created = create_tasks_from_decomposition(tasks_data)
            if created:
                print(f"Created {len(created)} tasks: {', '.join(created)}")
            else:
                print("No tasks created", file=sys.stderr)
                sys.exit(1)
        except Exception as e:
            print(f"Error reading JSON file: {e}", file=sys.stderr)
            sys.exit(1)
    
    else:
        print(f"Unknown command: {command}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
