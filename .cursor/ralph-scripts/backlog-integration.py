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

def call_backlog_cli(command, *args):
    """Call backlog.md CLI command"""
    try:
        cmd = ["backlog"] + command.split() + list(args)
        result = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if result.returncode == 0:
            return result.stdout.strip()
        else:
            # Don't print error if CLI is not installed (fallback to file-based)
            if "not found" not in result.stderr.lower() and "command not found" not in result.stderr.lower():
                print(f"Backlog CLI error: {result.stderr}", file=sys.stderr)
            return None
    except FileNotFoundError:
        # backlog CLI not installed, fallback to file-based
        return None
    except Exception as e:
        print(f"Error calling backlog CLI: {e}", file=sys.stderr)
        return None

def search_backlog_tasks(query="status:To Do OR status:In Progress"):
    """
    Search for tasks in backlog using backlog.md CLI or fallback to file
    Returns list of tasks matching the query
    """
    # Try backlog.md CLI first
    # Parse query to extract status
    statuses = []
    if "To Do" in query or "todo" in query.lower():
        statuses.append("To Do")
    if "In Progress" in query or "in progress" in query.lower():
        statuses.append("In Progress")
    
    # Try using backlog CLI to list tasks
    if statuses:
        all_tasks = []
        for status in statuses:
            result = call_backlog_cli("task", "list", "-s", status, "--plain")
            if result and result.strip():
                # Parse CLI output and convert to our format
                tasks = parse_backlog_cli_output(result)
                if tasks:
                    all_tasks.extend(tasks)
        
        # If we got tasks from CLI, return them
        if all_tasks:
            return all_tasks
        
        # If CLI returned empty but didn't fail, try listing all tasks
        # (maybe status filter didn't match format)
        result = call_backlog_cli("task", "list", "--plain")
        if result and result.strip():
            tasks = parse_backlog_cli_output(result)
            # Filter by status manually
            filtered_tasks = [t for t in tasks if t.get("status") in statuses]
            if filtered_tasks:
                return filtered_tasks
    
    # Fallback: try to read from backlog.md if it exists
    workspace = os.getcwd()
    backlog_file = Path(workspace) / "backlog.md"
    
    if backlog_file.exists():
        return parse_backlog_md(backlog_file)
    
    # Try backlog directory (backlog.md format)
    backlog_dir = Path(workspace) / "backlog"
    if backlog_dir.exists():
        # Look for task files in backlog/tasks/ subdirectory
        tasks_dir = backlog_dir / "tasks"
        if tasks_dir.exists() and tasks_dir.is_dir():
            tasks = []
            for task_file in sorted(tasks_dir.glob("*.md")):
                task = parse_task_file(task_file)
                if task:
                    task_status = task.get("status", "To Do")
                    print(f"Parsed task {task.get('id')}: status={task_status}", file=sys.stderr)
                    if task_status in ["To Do", "In Progress"]:
                        tasks.append(task)
            if tasks:
                print(f"Found {len(tasks)} uncompleted tasks in backlog/tasks/", file=sys.stderr)
                return tasks
        
        # Also check for task files directly in backlog/ directory
        tasks = []
        for task_file in backlog_dir.glob("*.md"):
            if task_file.name != "backlog.md":  # Skip backlog.md if it exists
                task = parse_task_file(task_file)
                if task:
                    task_status = task.get("status", "To Do")
                    if task_status in ["To Do", "In Progress"]:
                        tasks.append(task)
        if tasks:
            print(f"Found {len(tasks)} uncompleted tasks in backlog/", file=sys.stderr)
            return tasks
    
    return []

def parse_backlog_cli_output(cli_output):
    """Parse backlog CLI output and convert to our task format"""
    tasks = []
    try:
        if not cli_output or not cli_output.strip():
            return tasks
        
        lines = cli_output.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Try multiple patterns to extract task ID and title
            # Pattern 1: "1. Title" or "1. Title (status)"
            match = re.match(r'^\s*(\d+)\.\s+(.+?)(?:\s+\(.*?\))?$', line)
            if not match:
                # Pattern 2: "ID: Title" or "#ID Title"
                match = re.match(r'^\s*(?:#)?(\d+)[:：]\s*(.+)$', line)
            if not match:
                # Pattern 3: Just task ID (if line is just a number)
                match = re.match(r'^\s*(\d+)\s*$', line)
                if match:
                    task_id = match.group(1)
                    # Fetch task details to get title
                    task_details = call_backlog_cli("task", task_id, "--plain")
                    if task_details:
                        # Extract title from task details
                        title_match = re.search(r'Title:\s*(.+)', task_details, re.IGNORECASE)
                        title = title_match.group(1).strip() if title_match else f"Task {task_id}"
                        task = parse_backlog_cli_task_details(task_id, title, task_details)
                        if task:
                            tasks.append(task)
                    continue
            
            if match:
                task_id = match.group(1)
                title = match.group(2).strip() if len(match.groups()) > 1 else f"Task {task_id}"
                # Fetch full task details
                task_details = call_backlog_cli("task", task_id, "--plain")
                if task_details:
                    task = parse_backlog_cli_task_details(task_id, title, task_details)
                    if task:
                        tasks.append(task)
    except Exception as e:
        print(f"Error parsing backlog CLI output: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
    
    return tasks

def parse_backlog_cli_task_details(task_id, title, details):
    """Parse detailed task information from backlog CLI output"""
    try:
        task = {
            "id": f"backlog-{task_id}",
            "backlog_task_id": task_id,
            "title": title,
            "status": "To Do",
            "description": "",
            "test_command": "",
            "success_criteria": []
        }
        
        # If title wasn't provided, try to extract from details
        if not title or title == f"Task {task_id}":
            title_match = re.search(r'Title:\s*(.+)', details, re.IGNORECASE)
            if title_match:
                task["title"] = title_match.group(1).strip()
            else:
                task["title"] = title if title else f"Task {task_id}"
        
        # Parse details to extract description, status, acceptance criteria
        lines = details.split('\n')
        current_section = None
        in_description = False
        
        for line in lines:
            original_line = line
            line = line.strip()
            if not line:
                # Empty line might end a section
                if current_section == "description":
                    in_description = False
                continue
            
            # Check for status (various formats)
            status_match = re.match(r'Status:\s*(.+)', line, re.IGNORECASE)
            if status_match:
                task["status"] = status_match.group(1).strip()
                current_section = None
                continue
            
            # Check for title (if not already set)
            title_match = re.match(r'Title:\s*(.+)', line, re.IGNORECASE)
            if title_match and (not task["title"] or task["title"] == f"Task {task_id}"):
                task["title"] = title_match.group(1).strip()
                current_section = None
                continue
            
            # Check for description section start
            if re.match(r'Description:', line, re.IGNORECASE) or re.match(r'^Description\s*$', line, re.IGNORECASE):
                current_section = "description"
                in_description = True
                continue
            elif in_description or current_section == "description":
                # Continue reading description until we hit another section
                if re.match(r'^(Acceptance|AC|Test|Status|Title|Plan|Notes):', line, re.IGNORECASE):
                    # Hit a new section, stop description
                    in_description = False
                    current_section = None
                    # Process this line as the new section
                else:
                    task["description"] += original_line + "\n"
                    continue
            
            # Check for acceptance criteria section
            if re.match(r'Acceptance\s+Criteria:', line, re.IGNORECASE) or re.match(r'^ACs?:', line, re.IGNORECASE):
                current_section = "ac"
                continue
            elif current_section == "ac":
                # Parse AC line: "1. [ ] Criterion text" or "1. Criterion text" or "- [ ] Criterion"
                ac_match = re.match(r'^[-*]?\s*\d+\.\s+(?:\[([ x])\]\s+)?(.+)$', line)
                if not ac_match:
                    # Try bullet format: "- [ ] Criterion" or "* Criterion"
                    ac_match = re.match(r'^[-*]\s+(?:\[([ x])\]\s+)?(.+)$', line)
                if ac_match:
                    criterion_text = ac_match.group(2).strip() if len(ac_match.groups()) >= 2 else line
                    task["success_criteria"].append(criterion_text)
                elif not re.match(r'^(Description|Status|Title|Plan|Notes|Test):', line, re.IGNORECASE):
                    # If it doesn't look like a new section, treat as AC continuation
                    task["success_criteria"][-1] += " " + line if task["success_criteria"] else line
        
        task["description"] = task["description"].strip()
        
        # Extract test command from description if present
        test_match = re.search(r'\*\*Test Command\*\*:\s*`([^`]+)`', task["description"])
        if test_match:
            task["test_command"] = test_match.group(1)
        
        return task
    except Exception as e:
        print(f"Error parsing task details: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return None

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
    """Parse a single task file from backlog/tasks/ directory"""
    try:
        with open(task_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        task = {
            "id": task_file.stem,
            "title": task_file.stem.replace('-', ' ').title(),
            "description": "",
            "status": "To Do",
            "test_command": "",
            "success_criteria": [],
            "content": content
        }
        
        # Parse frontmatter (YAML-like format)
        if content.startswith('---'):
            parts = content.split('---', 2)
            if len(parts) >= 3:
                frontmatter_text = parts[1].strip()
                body = parts[2].strip()
                
                # Parse YAML-like frontmatter (simple key: value format)
                frontmatter = {}
                for line in frontmatter_text.split('\n'):
                    line = line.strip()
                    if not line:
                        continue
                    if ':' in line:
                        key, value = line.split(':', 1)
                        key = key.strip()
                        value = value.strip().strip('"\'[]')
                        frontmatter[key] = value
                
                # Extract fields from frontmatter
                if "id" in frontmatter:
                    task["id"] = frontmatter["id"]
                if "title" in frontmatter:
                    task["title"] = frontmatter["title"]
                if "status" in frontmatter:
                    status_value = frontmatter["status"].strip()
                    # Normalize status values
                    if status_value.lower() in ["todo", "to do", "待办"]:
                        task["status"] = "To Do"
                    elif status_value.lower() in ["in progress", "进行中"]:
                        task["status"] = "In Progress"
                    elif status_value.lower() in ["done", "完成"]:
                        task["status"] = "Done"
                    else:
                        task["status"] = status_value
        else:
            body = content
        
        # Parse body for description and acceptance criteria
        # Extract description section
        desc_match = re.search(r'##\s+Description\s*\n(.*?)(?=\n##|\Z)', body, re.DOTALL | re.IGNORECASE)
        if desc_match:
            desc_text = desc_match.group(1).strip()
            # Remove HTML comments
            desc_text = re.sub(r'<!--.*?-->', '', desc_text, flags=re.DOTALL)
            task["description"] = desc_text.strip()
        else:
            # Use entire body as description if no section found
            task["description"] = body.strip()
        
        # Extract test command from description
        test_match = re.search(r'\*\*Test Command\*\*:\s*`([^`]+)`', task["description"])
        if test_match:
            task["test_command"] = test_match.group(1)
        
        # Extract acceptance criteria
        ac_match = re.search(r'##\s+Acceptance\s+Criteria\s*\n(.*?)(?=\n##|\Z)', body, re.DOTALL | re.IGNORECASE)
        if ac_match:
            ac_text = ac_match.group(1).strip()
            # Remove HTML comments
            ac_text = re.sub(r'<!--.*?-->', '', ac_text, flags=re.DOTALL)
            # Parse AC lines
            for line in ac_text.split('\n'):
                line = line.strip()
                if not line:
                    continue
                # Extract criterion text (remove checkboxes, numbering, and # markers)
                criterion = re.sub(r'^[-*]?\s*#?\d+\.?\s*', '', line)  # Remove numbering
                criterion = re.sub(r'^\[([ x])\]\s*', '', criterion)  # Remove checkbox
                criterion = re.sub(r'^[-*]\s*', '', criterion)  # Remove bullet
                if criterion and not criterion.startswith('<!--'):
                    task["success_criteria"].append(criterion.strip())
        
        return task
    except Exception as e:
        print(f"Error parsing task file {task_file}: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return None

def get_next_task():
    """Get the next uncompleted task from backlog"""
    tasks = search_backlog_tasks()
    
    if not tasks:
        print("No tasks found in backlog", file=sys.stderr)
        return None
    
    # Debug: print found tasks
    print(f"Found {len(tasks)} tasks in backlog", file=sys.stderr)
    for t in tasks[:3]:
        print(f"  - {t.get('id')}: {t.get('title')} (status: {t.get('status')})", file=sys.stderr)
    
    # Prioritize "In Progress" tasks, then "To Do"
    in_progress = [t for t in tasks if t.get("status") == "In Progress"]
    to_do = [t for t in tasks if t.get("status") == "To Do"]
    
    if in_progress:
        print(f"Returning In Progress task: {in_progress[0].get('id')}", file=sys.stderr)
        return in_progress[0]
    elif to_do:
        print(f"Returning To Do task: {to_do[0].get('id')}", file=sys.stderr)
        return to_do[0]
    
    print("No uncompleted tasks found (all tasks are Done)", file=sys.stderr)
    return None

def generate_ralph_task(task):
    """Generate RALPH_TASK.md content from a backlog task"""
    if not task:
        return None
    
    # Use success_criteria from task if available (from parse_task_file)
    criteria = []
    if task.get("success_criteria"):
        # Already parsed by parse_task_file
        for criterion in task.get("success_criteria", []):
            criteria.append({
                "text": criterion,
                "checked": False
            })
    else:
        # Fallback: extract from description
        description = task.get("description", "") or task.get("content", "")
        
        # Extract checkboxes or numbered items from Success Criteria section
        success_criteria_section = re.search(r'\*\*Success\s+Criteria\*\*:\s*\n(.*?)(?=\n\*\*|\n---|\Z)', description, re.DOTALL | re.IGNORECASE)
        if success_criteria_section:
            criteria_text = success_criteria_section.group(1)
            criteria_pattern = r'^\s*(\d+)\.\s+\[([ x])\]\s+(.+?)(?=\n\d+\.|\n\*\*|\Z)'
            criteria_matches = re.finditer(criteria_pattern, criteria_text, re.MULTILINE)
            for match in criteria_matches:
                checked = match.group(2) == "x"
                criterion_text = match.group(3).strip()
                criteria.append({
                    "text": criterion_text,
                    "checked": checked
                })
        
        # If no criteria found, try alternative patterns
        if not criteria:
            criteria_pattern = r'(?:^|\n)\s*(?:[-*]|\d+\.)\s+\[([ x])\]\s+(.+?)(?=\n(?:[-*]|\d+\.)|$)'
            criteria_matches = re.finditer(criteria_pattern, description, re.MULTILINE)
            
            for match in criteria_matches:
                checked = match.group(1) == "x"
                criterion_text = match.group(2).strip()
                criteria.append({
                    "text": criterion_text,
                    "checked": checked
                })
        
        # If no criteria found, try to extract from "Acceptance Criteria" section
        if not criteria:
            success_section = re.search(r'##\s+Acceptance\s+Criteria\s*\n(.*?)(?=\n##|\Z)', description, re.DOTALL | re.IGNORECASE)
            if success_section:
                criteria_text = success_section.group(1)
                # Remove HTML comments
                criteria_text = re.sub(r'<!--.*?-->', '', criteria_text, flags=re.DOTALL)
                criteria_pattern = r'(?:^|\n)\s*(?:[-*]|\d+\.)\s+\[([ x])\]\s+(.+?)(?=\n(?:[-*]|\d+\.)|$)'
                criteria_matches = re.finditer(criteria_pattern, criteria_text, re.MULTILINE)
                for match in criteria_matches:
                    checked = match.group(1) == "x"
                    criterion_text = match.group(2).strip()
                    # Remove # markers
                    criterion_text = re.sub(r'^#\d+\s*', '', criterion_text)
                    if criterion_text:
                        criteria.append({
                            "text": criterion_text,
                            "checked": checked
                        })
    
    # Try to get project context from backlog.md
    project_context = ""
    workspace = os.getcwd()
    backlog_file = Path(workspace) / "backlog.md"
    if backlog_file.exists():
        try:
            with open(backlog_file, 'r', encoding='utf-8') as f:
                backlog_content = f.read()
            
            # Look for project description or requirement at the top
            # Check if there's a "## Project" or "## Requirement" section
            project_match = re.search(r'##\s+(?:Project|Requirement|Overview)\s*\n(.*?)(?=\n##|\Z)', backlog_content, re.DOTALL | re.IGNORECASE)
            if project_match:
                project_context = project_match.group(1).strip()
            
            # If no project section, try to extract from first task's description if it's a high-level task
            # Look for tasks that might contain the overall requirement
            if not project_context:
                # Check if there's a task with "watch-together" or similar that might have the full requirement
                full_req_match = re.search(r'网页版一起看功能.*?(?=\n###|\Z)', backlog_content, re.DOTALL)
                if full_req_match:
                    project_context = full_req_match.group(0).strip()
        except:
            pass
    
    # Build RALPH_TASK.md
    backlog_id = task.get("id", "")
    title = task.get("title", "Untitled Task")
    test_command = task.get("test_command", "")
    
    frontmatter = f"""---
task: {title}
backlog_id: "{backlog_id}"
"""
    if test_command:
        frontmatter += f'test_command: "{test_command}"\n'
    frontmatter += "---\n"
    
    body = f"""# Task: {title}

"""
    
    # Add project context if available
    if project_context:
        body += f"""## Project Context

{project_context}

"""
    
    body += f"""## Task Description

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
    
    # 添加测试用例信息（如果存在）
    # 尝试从任务描述中提取测试用例信息
    test_cases_match = re.search(r'\*\*测试用例\*\*:(.*?)(?=\n\*\*|\n---|\Z)', description, re.DOTALL)
    if test_cases_match:
        test_cases_content = test_cases_match.group(1).strip()
        body += "\n## Test Cases\n\n"
        
        # 提取测试数据
        test_data_match = re.search(r'\*\*测试数据\*\*:(.*?)(?=\n\*\*|\Z)', test_cases_content, re.DOTALL)
        if test_data_match:
            body += "### Test Data\n\n"
            body += test_data_match.group(1).strip()
            body += "\n\n"
        
        # 提取测试场景
        test_scenarios_match = re.search(r'\*\*测试场景\*\*:(.*?)(?=\n\*\*|\Z)', test_cases_content, re.DOTALL)
        if test_scenarios_match:
            body += "### Test Scenarios\n\n"
            body += test_scenarios_match.group(1).strip()
            body += "\n\n"
        
        # 提取断言
        assertions_match = re.search(r'\*\*断言示例\*\*:(.*?)(?=\n\*\*|\Z)', test_cases_content, re.DOTALL)
        if assertions_match:
            body += "### Assertions\n\n"
            body += assertions_match.group(1).strip()
            body += "\n\n"
    
    body += """
---

## Ralph Instructions

1. **Write test cases first** - Use the test cases and assertions provided above
2. Work on the next incomplete criterion (marked [ ])
3. Check off completed criteria (change [ ] to [x])
4. **Run tests after changes** - Execute the test command to verify: `{test_command}`
5. Commit your changes frequently
6. When ALL criteria are [x] and tests pass, output: `<ralph>COMPLETE</ralph>`
7. If stuck on the same issue 3+ times, output: `<ralph>GUTTER</ralph>`
""".format(test_command=test_command or "npm test")
    
    return frontmatter + body

def update_backlog_file_status(backlog_id, new_status, backlog_file):
    """Update status in backlog.md file"""
    if not backlog_file or not backlog_file.exists():
        return False
    
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

def update_backlog_status(backlog_id, new_status):
    """Update the status of a task using backlog.md CLI or fallback to file"""
    # Try backlog.md CLI first
    workspace = os.getcwd()
    backlog_file = Path(workspace) / "backlog.md"
    
    backlog_task_id = None
    if backlog_file.exists():
        try:
            with open(backlog_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check if backlog_id is already a numeric ID
            if backlog_id.isdigit():
                backlog_task_id = backlog_id
            elif backlog_id.startswith("backlog-") and backlog_id[8:].isdigit():
                backlog_task_id = backlog_id[8:]
            else:
                # Look for mapping comment
                mapping_pattern = rf'<!-- Task mapping: {re.escape(backlog_id)} -> backlog-(\d+) -->'
                mapping_match = re.search(mapping_pattern, content)
                if mapping_match:
                    backlog_task_id = mapping_match.group(1)
        except:
            pass
    
    # If we found a backlog task ID, try using CLI
    if backlog_task_id:
        # Map our status to backlog CLI status
        status_map = {
            "To Do": "To Do",
            "In Progress": "In Progress",
            "Done": "Done"
        }
        backlog_status = status_map.get(new_status, new_status)
        
        result = call_backlog_cli("task", "edit", backlog_task_id, "-s", backlog_status)
        if result:
            # Also update the file for consistency
            if backlog_file.exists():
                update_backlog_file_status(backlog_id, new_status, backlog_file)
            return True
    
    # Fallback: update backlog.md file directly
    if backlog_file.exists():
        return update_backlog_file_status(backlog_id, new_status, backlog_file)
    
    return False

def create_backlog_task(task_data):
    """Create a new task using backlog.md CLI or fallback to file"""
    # Extract task fields
    task_id = task_data.get('id', '')
    title = task_data.get('title', 'Untitled Task')
    description = task_data.get('description', '')
    test_command = task_data.get('test_command', '')
    success_criteria = task_data.get('success_criteria', [])
    test_cases = task_data.get('test_cases', {})
    
    # Try using backlog.md CLI first
    # Build acceptance criteria string (包含测试用例信息)
    ac_args = []
    for criterion in success_criteria:
        ac_args.extend(["--ac", criterion])
    
    # 添加测试用例相关的 Acceptance Criteria
    if test_cases:
        if test_cases.get('test_scenarios'):
            for scenario in test_cases['test_scenarios']:
                ac_args.extend(["--ac", f"测试场景: {scenario}"])
    
    # Build description with test command and test cases if available
    full_description = description
    if test_command:
        full_description += f"\n\n**Test Command**: `{test_command}`"
    
    # 添加测试用例详细信息到描述中
    if test_cases:
        full_description += "\n\n**测试用例**:\n"
        
        if test_cases.get('test_data'):
            full_description += "\n**测试数据**:\n"
            for i, test_data in enumerate(test_cases['test_data'], 1):
                full_description += f"{i}. 输入: {test_data.get('input', 'N/A')}\n"
                full_description += f"   预期输出: {test_data.get('expected_output', 'N/A')}\n"
        
        if test_cases.get('assertions'):
            full_description += "\n**断言示例**:\n"
            for i, assertion in enumerate(test_cases['assertions'], 1):
                full_description += f"{i}. `{assertion}`\n"
    
    # Try backlog CLI
    result = call_backlog_cli("task", "create", title, "-d", full_description, *ac_args)
    if result:
        # Extract task ID from result (backlog CLI returns task info)
        # Format: "Created task 42: Title"
        match = re.search(r'Created task (\d+):', result)
        if match:
            created_id = match.group(1)
            # Store the mapping in backlog.md for later reference
            workspace = os.getcwd()
            backlog_file = Path(workspace) / "backlog.md"
            if backlog_file.exists():
                try:
                    with open(backlog_file, 'a', encoding='utf-8') as f:
                        f.write(f"\n<!-- Task mapping: {task_id} -> backlog-{created_id} -->\n")
                except:
                    pass
            return True
    
    # Fallback to file-based approach
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
        
        # 添加测试用例信息
        if test_cases:
            task_md += "**测试用例**:\n\n"
            
            if test_cases.get('test_data'):
                task_md += "**测试数据**:\n"
                for i, test_data in enumerate(test_cases['test_data'], 1):
                    task_md += f"{i}. 输入: `{test_data.get('input', 'N/A')}`\n"
                    task_md += f"   预期输出: `{test_data.get('expected_output', 'N/A')}`\n"
                task_md += "\n"
            
            if test_cases.get('test_scenarios'):
                task_md += "**测试场景**:\n"
                for i, scenario in enumerate(test_cases['test_scenarios'], 1):
                    task_md += f"{i}. {scenario}\n"
                task_md += "\n"
            
            if test_cases.get('assertions'):
                task_md += "**断言示例**:\n"
                for i, assertion in enumerate(test_cases['assertions'], 1):
                    task_md += f"{i}. `{assertion}`\n"
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
