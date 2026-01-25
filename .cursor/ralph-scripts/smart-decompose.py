#!/usr/bin/env python3
"""
智能需求分解工具
- 读取现有 backlog 任务
- 对比新旧任务
- 支持编辑、删除、创建新任务
- 已完成任务不允许修改
"""
import sys
import os
import json
import subprocess
import re
from pathlib import Path
from typing import List, Dict, Any, Optional

# 添加脚本目录到路径
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir.parent / "skills" / "requirement-decomposer" / "scripts"))
sys.path.insert(0, str(script_dir))

from decompose_requirement import decompose_orthogonally, analyze_requirement, format_tasks_for_review

# 导入 backlog-integration 模块（需要作为模块导入）
import importlib.util
spec = importlib.util.spec_from_file_location("backlog_integration", script_dir / "backlog-integration.py")
backlog_integration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backlog_integration)

def get_existing_tasks():
    """获取现有的 backlog 任务"""
    # 尝试使用 backlog CLI
    tasks = backlog_integration.search_backlog_tasks("status:To Do OR status:In Progress OR status:Done")
    
    # 如果 CLI 不可用，从文件读取
    if not tasks:
        workspace = os.getcwd()
        backlog_file = Path(workspace) / "backlog.md"
        if backlog_file.exists():
            tasks = backlog_integration.parse_backlog_md(backlog_file)
    
    return tasks

def normalize_task_for_comparison(task: Dict[str, Any]) -> str:
    """标准化任务用于比较（基于标题和描述）"""
    title = task.get('title', '').lower().strip()
    desc = task.get('description', '').lower().strip()
    # 提取关键信息用于匹配
    return f"{title} {desc[:100]}"

def find_similar_task(new_task: Dict[str, Any], existing_tasks: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """查找相似的任务"""
    new_normalized = normalize_task_for_comparison(new_task)
    
    best_match = None
    best_score = 0
    
    for existing in existing_tasks:
        existing_normalized = normalize_task_for_comparison(existing)
        
        # 简单的相似度计算（基于共同词汇）
        new_words = set(new_normalized.split())
        existing_words = set(existing_normalized.split())
        
        if new_words and existing_words:
            common_words = new_words & existing_words
            score = len(common_words) / max(len(new_words), len(existing_words))
            
            if score > best_score and score > 0.3:  # 30% 相似度阈值
                best_score = score
                best_match = existing
    
    return best_match

def categorize_tasks(new_tasks: List[Dict[str, Any]], existing_tasks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """将任务分类：新任务、已存在任务、需要删除的任务"""
    result = {
        "new": [],  # 新任务，需要创建
        "existing": [],  # 已存在的任务（可编辑）
        "to_delete": [],  # 需要删除的任务
        "completed": []  # 已完成的任务（不允许修改）
    }
    
    # 按状态分组现有任务
    existing_by_status = {
        "To Do": [],
        "In Progress": [],
        "Done": []
    }
    
    for task in existing_tasks:
        status = task.get("status", "To Do")
        existing_by_status[status] = existing_by_status.get(status, [])
        existing_by_status[status].append(task)
    
    # 标记已匹配的现有任务
    matched_existing = set()
    
    # 处理新任务
    for new_task in new_tasks:
        similar = find_similar_task(new_task, existing_tasks)
        
        if similar:
            similar_id = similar.get("id", "")
            if similar.get("status") == "Done":
                # 已完成的任务，不允许修改，但可以创建新任务
                result["completed"].append({
                    "new": new_task,
                    "existing": similar
                })
            else:
                # 已存在但未完成，可以编辑
                result["existing"].append({
                    "new": new_task,
                    "existing": similar
                })
                matched_existing.add(similar_id)
        else:
            # 新任务
            result["new"].append(new_task)
    
    # 找出需要删除的任务（现有任务中没有匹配的，且未完成）
    for task in existing_tasks:
        task_id = task.get("id", "")
        status = task.get("status", "To Do")
        
        if status != "Done" and task_id not in matched_existing:
            result["to_delete"].append(task)
    
    return result

def display_task_comparison(categorized: Dict[str, Any]):
    """显示任务对比结果"""
    print("\n" + "="*70)
    print("📊 任务对比结果")
    print("="*70 + "\n")
    
    # 新任务
    if categorized["new"]:
        print(f"🆕 新任务 ({len(categorized['new'])} 个):")
        for i, task in enumerate(categorized["new"], 1):
            print(f"  {i}. {task.get('title', 'Untitled')}")
            print(f"     ID: {task.get('id', 'N/A')}")
        print()
    
    # 已存在任务（可编辑）
    if categorized["existing"]:
        print(f"✏️  已存在任务 ({len(categorized['existing'])} 个，可编辑):")
        for i, item in enumerate(categorized["existing"], 1):
            existing = item["existing"]
            new = item["new"]
            print(f"  {i}. {existing.get('title', 'Untitled')}")
            print(f"     现有 ID: {existing.get('id', 'N/A')} (状态: {existing.get('status', 'To Do')})")
            print(f"     新任务: {new.get('title', 'Untitled')}")
        print()
    
    # 已完成任务（不允许修改）
    if categorized["completed"]:
        print(f"✅ 已完成任务 ({len(categorized['completed'])} 个，不允许修改):")
        for i, item in enumerate(categorized["completed"], 1):
            existing = item["existing"]
            new = item["new"]
            print(f"  {i}. {existing.get('title', 'Untitled')}")
            print(f"     现有 ID: {existing.get('id', 'N/A')} (状态: Done)")
            print(f"     新任务: {new.get('title', 'Untitled')} (将创建为新任务)")
        print()
    
    # 需要删除的任务
    if categorized["to_delete"]:
        print(f"🗑️  需要删除的任务 ({len(categorized['to_delete'])} 个):")
        for i, task in enumerate(categorized["to_delete"], 1):
            print(f"  {i}. {task.get('title', 'Untitled')}")
            print(f"     ID: {task.get('id', 'N/A')} (状态: {task.get('status', 'To Do')})")
        print()

def interactive_task_planning(categorized: Dict[str, Any]) -> Dict[str, Any]:
    """交互式任务规划"""
    plan = {
        "create": [],  # 要创建的任务
        "update": [],  # 要更新的任务（existing -> new）
        "delete": [],  # 要删除的任务
        "keep": []  # 保持不变的任务
    }
    
    print("\n" + "="*70)
    print("📝 交互式任务规划")
    print("="*70 + "\n")
    
    # 处理新任务
    if categorized["new"]:
        print("🆕 新任务处理:")
        for task in categorized["new"]:
            print(f"\n任务: {task.get('title', 'Untitled')}")
            print(f"描述: {task.get('description', '')[:100]}...")
            response = input("是否创建此任务? [Y/n] ").strip().lower()
            if response not in ['n', 'no']:
                plan["create"].append(task)
        print()
    
    # 处理已存在任务
    if categorized["existing"]:
        print("✏️  已存在任务处理:")
        for item in categorized["existing"]:
            existing = item["existing"]
            new = item["new"]
            print(f"\n现有任务: {existing.get('title', 'Untitled')}")
            print(f"  状态: {existing.get('status', 'To Do')}")
            print(f"  描述: {existing.get('description', '')[:100]}...")
            print(f"\n新任务: {new.get('title', 'Untitled')}")
            print(f"  描述: {new.get('description', '')[:100]}...")
            
            print("\n操作选项:")
            print("  1. 更新现有任务（用新任务内容替换）")
            print("  2. 保持现有任务不变")
            print("  3. 创建为新任务（保留现有任务）")
            
            response = input("请选择 [1/2/3，默认: 1] ").strip()
            
            if response == "2":
                plan["keep"].append(existing)
            elif response == "3":
                plan["create"].append(new)
                plan["keep"].append(existing)
            else:  # 默认更新
                plan["update"].append({
                    "existing": existing,
                    "new": new
                })
        print()
    
    # 处理已完成任务
    if categorized["completed"]:
        print("✅ 已完成任务处理:")
        for item in categorized["completed"]:
            existing = item["existing"]
            new = item["new"]
            print(f"\n已完成任务: {existing.get('title', 'Untitled')} (不允许修改)")
            print(f"新任务: {new.get('title', 'Untitled')}")
            response = input("是否创建为新任务? [Y/n] ").strip().lower()
            if response not in ['n', 'no']:
                plan["create"].append(new)
        print()
    
    # 处理需要删除的任务
    if categorized["to_delete"]:
        print("🗑️  需要删除的任务处理:")
        for task in categorized["to_delete"]:
            print(f"\n任务: {task.get('title', 'Untitled')}")
            print(f"  状态: {task.get('status', 'To Do')}")
            print(f"  描述: {task.get('description', '')[:100]}...")
            response = input("是否删除此任务? [y/N] ").strip().lower()
            if response in ['y', 'yes']:
                plan["delete"].append(task)
        print()
    
    return plan

def execute_plan(plan: Dict[str, Any]):
    """执行任务规划"""
    
    print("\n" + "="*70)
    print("🚀 执行任务规划")
    print("="*70 + "\n")
    
    # 创建新任务
    if plan["create"]:
        print(f"创建 {len(plan['create'])} 个新任务...")
        print("（优先使用 backlog.md CLI，失败则使用文件模式）\n")
        
        for task in plan["create"]:
            title = task.get('title', 'Untitled Task')
            description = task.get('description', '')
            success_criteria = task.get('success_criteria', [])
            test_command = task.get('test_command', '')
            
            print(f"  正在创建: {title}")
            
            # 优先使用 backlog.md CLI
            ac_args = []
            for criterion in success_criteria:
                ac_args.extend(["--ac", criterion])
            
            # 构建完整描述（包含测试命令）
            full_description = description
            if test_command:
                full_description += f"\n\n**Test Command**: `{test_command}`"
            
            # 尝试使用 backlog CLI 创建
            print(f"    尝试使用 backlog.md CLI...")
            result = backlog_integration.call_backlog_cli("task", "create", title, "-d", full_description, *ac_args)
            
            if result:
                # 提取任务 ID
                match = re.search(r'Created task (\d+):', result)
                if match:
                    created_id = match.group(1)
                    print(f"    ✅ 使用 backlog.md CLI 创建成功 (ID: {created_id})")
                    # 存储映射关系
                    workspace = os.getcwd()
                    backlog_file = Path(workspace) / "backlog.md"
                    if backlog_file.exists():
                        try:
                            with open(backlog_file, 'a', encoding='utf-8') as f:
                                f.write(f"\n<!-- Task mapping: {task.get('id', '')} -> backlog-{created_id} -->\n")
                        except:
                            pass
                else:
                    print(f"    ✅ 使用 backlog.md CLI 创建成功")
            else:
                # 回退到文件模式
                print(f"    ⚠️  backlog.md CLI 不可用，回退到文件模式...")
                if backlog_integration.create_backlog_task(task):
                    print(f"    ✅ 使用文件模式创建成功")
                else:
                    print(f"    ❌ 创建失败")
            print()
        print()
    
    # 更新现有任务
    if plan["update"]:
        print(f"更新 {len(plan['update'])} 个任务...")
        for item in plan["update"]:
            existing = item["existing"]
            new = item["new"]
            existing_id = existing.get("id", "")
            
            # 使用 backlog CLI 更新任务
            backlog_task_id = existing.get("backlog_task_id")
            if not backlog_task_id and existing_id.startswith("backlog-"):
                backlog_task_id = existing_id[8:]
            
            if backlog_task_id:
                # 更新标题和描述
                result = backlog_integration.call_backlog_cli("task", "edit", backlog_task_id, "-t", new.get("title", ""))
                if result:
                    # 更新描述
                    desc = new.get("description", "")
                    if desc:
                        backlog_integration.call_backlog_cli("task", "edit", backlog_task_id, "-d", desc)
                    print(f"  ✅ 更新: {existing.get('title', 'Untitled')} -> {new.get('title', 'Untitled')}")
                else:
                    print(f"  ⚠️  部分更新失败: {existing.get('title', 'Untitled')}")
            else:
                # 回退到文件模式：需要手动更新
                print(f"  ⚠️  需要手动更新: {existing.get('title', 'Untitled')} (ID: {existing_id})")
        print()
    
    # 删除任务
    if plan["delete"]:
        print(f"删除 {len(plan['delete'])} 个任务...")
        for task in plan["delete"]:
            task_id = task.get("id", "")
            backlog_task_id = task.get("backlog_task_id")
            
            if not backlog_task_id and task_id.startswith("backlog-"):
                backlog_task_id = task_id[8:]
            
            # 注意：backlog.md CLI 可能不支持删除，需要手动处理
            print(f"  ⚠️  需要手动删除: {task.get('title', 'Untitled')} (ID: {task_id})")
            print(f"     提示: 可以在 backlog.md 中删除对应任务，或使用 backlog CLI")
        print()
    
    print("="*70)
    print("✅ 任务规划执行完成！")
    print("="*70 + "\n")

def main():
    if len(sys.argv) < 2:
        print("Usage: smart-decompose.py <requirement_text>", file=sys.stderr)
        sys.exit(1)
    
    requirement = sys.argv[1]
    
    print("\n" + "="*70)
    print("🧠 智能需求分解工具")
    print("="*70 + "\n")
    print("需求描述：")
    print(requirement)
    print("\n")
    
    # 步骤 1: 获取现有任务
    print("步骤 1/5: 获取现有 backlog 任务...")
    existing_tasks = get_existing_tasks()
    print(f"✅ 找到 {len(existing_tasks)} 个现有任务\n")
    
    # 步骤 2: 分解新需求
    print("步骤 2/5: 分解新需求...")
    analysis = analyze_requirement(requirement)
    new_tasks = decompose_orthogonally(requirement, analysis)
    print(f"✅ 生成 {len(new_tasks)} 个新任务\n")
    
    # 步骤 3: 对比任务
    print("步骤 3/5: 对比新旧任务...")
    categorized = categorize_tasks(new_tasks, existing_tasks)
    display_task_comparison(categorized)
    
    # 步骤 4: 交互式规划
    print("步骤 4/5: 交互式任务规划...")
    plan = interactive_task_planning(categorized)
    
    # 步骤 5: 执行规划
    print("步骤 5/5: 执行任务规划...")
    execute_plan(plan)
    
    print("🎉 智能需求分解完成！")
    print("\n可以运行以下命令开始执行任务：")
    print("  ./.cursor/ralph-scripts/ralph-once.sh")
    print("  或")
    print("  ./.cursor/ralph-scripts/ralph-loop.sh")

if __name__ == "__main__":
    main()
