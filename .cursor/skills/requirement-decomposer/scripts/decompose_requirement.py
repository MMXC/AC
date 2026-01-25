#!/usr/bin/env python3
"""
Requirement Decomposer
将用户需求正交分解为可测试的原子子任务
"""

import json
import sys
import re
from typing import List, Dict, Any

def analyze_requirement(requirement: str) -> Dict[str, Any]:
    """
    分析需求，提取关键信息
    """
    analysis = {
        "domain": "",
        "components": [],
        "dependencies": [],
        "test_requirements": []
    }
    
    # 简单的关键词提取（实际应该使用更复杂的 NLP）
    # 识别技术栈
    tech_keywords = {
        "typescript": ["typescript", "ts", "tsx"],
        "python": ["python", "py"],
        "javascript": ["javascript", "js", "node"],
        "rust": ["rust", "rs"],
        "go": ["go", "golang"]
    }
    
    requirement_lower = requirement.lower()
    for tech, keywords in tech_keywords.items():
        if any(kw in requirement_lower for kw in keywords):
            analysis["domain"] = tech
            break
    
    return analysis

def decompose_orthogonally(requirement: str, analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    正交分解需求为子任务
    使用启发式规则识别独立的功能模块
    """
    tasks = []
    
    # 识别常见模式
    patterns = {
        "cli_commands": r"(?:命令|command|cmd|cli)\s*[:：]\s*([^\n]+)",
        "features": r"(?:功能|feature|需要|requirement)\s*[:：]\s*([^\n]+)",
        "components": r"(?:组件|component|模块|module)\s*[:：]\s*([^\n]+)",
        "apis": r"(?:接口|api|endpoint)\s*[:：]\s*([^\n]+)"
    }
    
    # 提取功能点
    features = []
    for pattern_name, pattern in patterns.items():
        matches = re.finditer(pattern, requirement, re.IGNORECASE)
        for match in matches:
            features.append({
                "type": pattern_name,
                "description": match.group(1).strip()
            })
    
    # 如果没有明确的功能点，尝试按句子分解
    if not features:
        sentences = re.split(r'[。！？\n]', requirement)
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) > 10:  # 过滤太短的句子
                features.append({
                    "type": "implicit",
                    "description": sentence
                })
    
    # 为每个功能点创建任务
    for i, feature in enumerate(features, 1):
        task_id = f"task-{i:03d}"
        task_title = generate_task_title(feature, i)
        test_command = generate_test_command(feature, analysis)
        success_criteria = generate_success_criteria(feature, analysis)
        
        tasks.append({
            "id": task_id,
            "title": task_title,
            "description": feature["description"],
            "type": feature["type"],
            "test_command": test_command,
            "success_criteria": success_criteria,
            "dependencies": []  # 正交任务无依赖
        })
    
    return tasks

def generate_task_title(feature: Dict[str, Any], index: int) -> str:
    """生成任务标题"""
    desc = feature["description"]
    # 提取关键词作为标题
    words = desc.split()[:5]  # 取前5个词
    title = " ".join(words)
    if len(title) > 50:
        title = title[:47] + "..."
    return title

def generate_test_command(feature: Dict[str, Any], analysis: Dict[str, Any]) -> str:
    """生成测试命令"""
    domain = analysis.get("domain", "")
    desc = feature["description"].lower()
    
    # 根据技术栈和功能类型生成测试命令
    if domain == "typescript" or "ts" in desc:
        if "command" in desc or "cli" in desc:
            return "npx ts-node <file>.ts --help"
        return "npm test"
    elif domain == "python" or "py" in desc:
        if "command" in desc or "cli" in desc:
            return "python <file>.py --help"
        return "pytest"
    elif domain == "javascript" or "js" in desc:
        return "npm test"
    else:
        return "echo 'Test command needed'"

def generate_success_criteria(feature: Dict[str, Any], analysis: Dict[str, Any]) -> List[str]:
    """生成成功标准"""
    desc = feature["description"]
    criteria = []
    
    # 基于描述生成标准
    if "命令" in desc or "command" in desc.lower():
        criteria.append("命令可以正常执行")
        criteria.append("帮助信息正确显示")
        criteria.append("参数解析正确")
    
    if "api" in desc.lower() or "接口" in desc:
        criteria.append("API 端点可以访问")
        criteria.append("返回正确的状态码")
        criteria.append("返回数据格式正确")
    
    if "测试" in desc or "test" in desc.lower():
        criteria.append("测试用例通过")
        criteria.append("覆盖率达标")
    
    # 默认标准
    if not criteria:
        criteria.append("功能按描述实现")
        criteria.append("代码通过测试")
        criteria.append("符合代码规范")
    
    return criteria

def format_tasks_for_review(tasks: List[Dict[str, Any]]) -> str:
    """格式化任务列表供用户审查"""
    output = ["## 需求分解结果\n"]
    output.append(f"共生成 {len(tasks)} 个子任务：\n")
    
    for i, task in enumerate(tasks, 1):
        output.append(f"### 任务 {i}: {task['title']}\n")
        output.append(f"- **ID**: `{task['id']}`\n")
        output.append(f"- **描述**: {task['description']}\n")
        output.append(f"- **测试命令**: `{task['test_command']}`\n")
        output.append("- **成功标准**:\n")
        for j, criterion in enumerate(task['success_criteria'], 1):
            output.append(f"  {j}. [ ] {criterion}\n")
        if task.get('dependencies'):
            output.append(f"- **依赖**: {', '.join(task['dependencies'])}\n")
        else:
            output.append("- **依赖**: 无（可并行执行）\n")
        output.append("\n")
    
    return "".join(output)

def main():
    """CLI 接口"""
    if len(sys.argv) < 2:
        print("Usage: decompose_requirement.py <requirement_text>", file=sys.stderr)
        sys.exit(1)
    
    requirement = sys.argv[1]
    
    # 分析需求
    analysis = analyze_requirement(requirement)
    
    # 分解任务
    tasks = decompose_orthogonally(requirement, analysis)
    
    # 输出 JSON 格式（供程序使用）
    if "--json" in sys.argv:
        print(json.dumps(tasks, indent=2, ensure_ascii=False))
    else:
        # 输出人类可读格式
        print(format_tasks_for_review(tasks))
        print("\n---\n")
        print("JSON 格式（用于创建 backlog 任务）:")
        print(json.dumps(tasks, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
