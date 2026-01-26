#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
解析已分解的任务文档（BACKEND_TASKS_DECOMPOSED.md），提取任务信息并转换为 JSON 格式
供 requirement-workflow.sh 使用
"""

import json
import re
import sys
import io

# 确保输出使用 UTF-8 编码
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def parse_decomposed_tasks(file_path):
    """解析已分解的任务文档"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    tasks = []
    current_task = None
    current_section = None
    
    lines = content.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()
        
        # 检测任务开始：### 任务 N: 标题
        task_match = re.match(r'^###\s+任务\s+(\d+):\s*(.+)$', line)
        if task_match:
            # 保存上一个任务
            if current_task:
                tasks.append(current_task)
            
            # 开始新任务
            task_num = task_match.group(1)
            title = task_match.group(2)
            current_task = {
                'id': f'backend-{int(task_num):03d}',
                'title': title,
                'description': '',
                'test_command': '',
                'success_criteria': [],
                'test_cases': {
                    'test_data': [],
                    'test_scenarios': [],
                    'assertions': []
                },
                'dependencies': []
            }
            current_section = None
            i += 1
            continue
        
        # 检测任务字段
        if current_task:
            # ID
            if re.match(r'^-\s*\*\*ID\*\*:', line):
                id_match = re.search(r':\s*(.+)', line)
                if id_match:
                    current_task['id'] = id_match.group(1).strip()
            
            # 描述（可能跨多行）
            elif re.match(r'^-\s*\*\*描述\*\*:', line):
                desc_match = re.search(r':\s*(.+)', line)
                if desc_match:
                    current_task['description'] = desc_match.group(1).strip()
                # 继续读取后续行直到下一个字段
                i += 1
                while i < len(lines) and not re.match(r'^-\s*\*\*', lines[i]):
                    if lines[i].strip() and not lines[i].strip().startswith('#'):
                        current_task['description'] += ' ' + lines[i].strip()
                    i += 1
                i -= 1  # 回退一行，因为外层循环会 +1
            
            # 测试命令（可能在代码块中）
            elif re.match(r'^-\s*\*\*测试命令\*\*:', line):
                test_cmd_match = re.search(r':\s*`(.+)`', line)
                if test_cmd_match:
                    current_task['test_command'] = test_cmd_match.group(1).strip()
                else:
                    # 可能在下一行的代码块中
                    if i + 1 < len(lines) and '```' in lines[i + 1]:
                        i += 2  # 跳过 ``` 行
                        if i < len(lines):
                            current_task['test_command'] = lines[i].strip()
                            i += 1
                            while i < len(lines) and '```' not in lines[i]:
                                current_task['test_command'] += ' ' + lines[i].strip()
                                i += 1
                        i -= 1
            
            # 成功标准
            elif re.match(r'^-\s*\*\*成功标准\*\*:', line):
                current_section = 'success_criteria'
                i += 1
                continue
            
            # 依赖
            elif re.match(r'^-\s*\*\*依赖\*\*:', line):
                dep_match = re.search(r':\s*(.+)', line)
                if dep_match:
                    deps = dep_match.group(1).strip()
                    if deps != '无':
                        # 解析依赖（可能是 "任务 1" 或 "backend-001"）
                        dep_ids = re.findall(r'(?:任务\s+(\d+)|backend-(\d+))', deps)
                        current_task['dependencies'] = [f'backend-{int(d[0] or d[1]):03d}' for d in dep_ids]
            
            # 测试用例部分
            elif re.match(r'^-\s*\*\*测试用例\*\*:', line):
                current_section = 'test_cases'
                i += 1
                continue
            
            # 处理成功标准列表
            if current_section == 'success_criteria':
                # 匹配 "1. [ ] 标准内容" 格式
                criteria_match = re.match(r'^\s*\d+\.\s+\[\s*\]\s+(.+)$', line)
                if criteria_match:
                    current_task['success_criteria'].append(criteria_match.group(1).strip())
                elif not line or line.startswith('- **') or line.startswith('###') or line.startswith('##'):
                    current_section = None
            
            # 处理测试用例
            elif current_section == 'test_cases':
                # 测试数据
                if '**测试数据**' in line or ('测试数据' in line and '**' in line):
                    i += 1
                    while i < len(lines) and not (lines[i].strip().startswith('- **') or lines[i].strip().startswith('###') or lines[i].strip().startswith('##')):
                        test_data_line = lines[i].strip()
                        if test_data_line.startswith('- 输入:') or test_data_line.startswith('输入:'):
                            input_match = re.search(r'输入:\s*(.+)', test_data_line)
                            if input_match:
                                i += 1
                                expected_match = None
                                if i < len(lines):
                                    expected_match = re.search(r'预期输出:\s*(.+)', lines[i].strip())
                                if expected_match:
                                    current_task['test_cases']['test_data'].append({
                                        'input': input_match.group(1).strip(),
                                        'expected_output': expected_match.group(1).strip()
                                    })
                        i += 1
                    i -= 1  # 回退
                
                # 测试场景
                elif '**测试场景**' in line or ('测试场景' in line and '**' in line):
                    i += 1
                    while i < len(lines) and not (lines[i].strip().startswith('- **') or lines[i].strip().startswith('###') or lines[i].strip().startswith('##')):
                        scenario_line = lines[i].strip()
                        if re.match(r'^\d+\.', scenario_line):
                            scenario = re.sub(r'^\d+\.\s+', '', scenario_line)
                            if scenario:
                                current_task['test_cases']['test_scenarios'].append(scenario)
                        i += 1
                    i -= 1  # 回退
                
                # 断言示例
                elif '**断言示例**' in line or ('断言示例' in line and '**' in line):
                    # 查找代码块
                    i += 1
                    while i < len(lines) and '```' not in lines[i] and not (lines[i].strip().startswith('- **') or lines[i].strip().startswith('###') or lines[i].strip().startswith('##')):
                        i += 1
                    # 找到代码块开始
                    if i < len(lines) and '```' in lines[i]:
                        i += 1  # 跳过 ``` 行
                        assertions = []
                        while i < len(lines) and '```' not in lines[i]:
                            code_line = lines[i].strip()
                            if code_line and not code_line.startswith('```'):
                                assertions.append(code_line)
                            i += 1
                        if assertions:
                            current_task['test_cases']['assertions'] = assertions
                
                elif not line or line.startswith('- **') or line.startswith('###') or line.startswith('##'):
                    current_section = None
        
        i += 1
    
    # 添加最后一个任务
    if current_task:
        tasks.append(current_task)
    
    return tasks

def format_task_for_backlog(task):
    """格式化任务为 backlog 格式"""
    # 构建完整描述（包含测试命令和测试用例）
    description_parts = [task['description']]
    
    if task.get('test_command'):
        description_parts.append(f"\n\n**Test Command**: `{task['test_command']}`")
    
    # 添加测试用例
    if task.get('test_cases'):
        tc = task['test_cases']
        if tc.get('test_data') or tc.get('test_scenarios') or tc.get('assertions'):
            description_parts.append("\n\n**测试用例**:")
            
            if tc.get('test_data'):
                description_parts.append("\n**测试数据**:")
                for i, td in enumerate(tc['test_data'], 1):
                    description_parts.append(f"{i}. 输入: `{td.get('input', '')}`")
                    description_parts.append(f"   预期输出: `{td.get('expected_output', '')}`")
            
            if tc.get('test_scenarios'):
                description_parts.append("\n**测试场景**:")
                for i, ts in enumerate(tc['test_scenarios'], 1):
                    description_parts.append(f"{i}. {ts}")
            
            if tc.get('assertions'):
                description_parts.append("\n**断言示例**:")
                for i, assertion in enumerate(tc['assertions'], 1):
                    description_parts.append(f"{i}. `{assertion}`")
    
    full_description = '\n'.join(description_parts)
    
    # 构建成功标准（作为 Acceptance Criteria）
    success_criteria = task.get('success_criteria', [])
    
    return {
        'id': task['id'],
        'title': task['title'],
        'description': full_description,
        'test_command': task.get('test_command', ''),
        'success_criteria': success_criteria,
        'test_cases': task.get('test_cases', {}),
        'dependencies': task.get('dependencies', [])
    }

def main():
    if len(sys.argv) < 2:
        print("Usage: parse-decomposed-tasks.py <decomposed-tasks.md> [--json]", file=sys.stderr)
        sys.exit(1)
    
    file_path = sys.argv[1]
    output_json = '--json' in sys.argv
    
    try:
        tasks = parse_decomposed_tasks(file_path)
        formatted_tasks = [format_task_for_backlog(task) for task in tasks]
        
        if output_json:
            print(json.dumps(formatted_tasks, ensure_ascii=False, indent=2))
        else:
            # 输出可读格式
            print(f"解析完成，找到 {len(formatted_tasks)} 个任务：\n")
            for task in formatted_tasks:
                print(f"### {task['id']}: {task['title']}")
                print(f"描述: {task['description'][:100]}...")
                print(f"测试命令: {task['test_command']}")
                print(f"成功标准: {len(task['success_criteria'])} 条")
                print()
        
        sys.exit(0)
    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
