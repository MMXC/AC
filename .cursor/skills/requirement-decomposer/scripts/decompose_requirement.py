#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Requirement Decomposer
将用户需求正交分解为可测试的原子子任务
"""

import json
import sys
import re
import io
from typing import List, Dict, Any

# 确保输出使用 UTF-8 编码
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

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
    
    # Web 应用功能模块识别模式
    web_patterns = {
        "首页": r"(?:首页|主页|home|landing)\s*[：:]\s*([^，。！？\n]+)",
        "页面": r"(?:页面|page|界面|screen)\s*[：:]\s*([^，。！？\n]+)",
        "API": r"(?:API|接口|endpoint)\s*[：:]\s*([^，。！？\n]+)",
        "WebSocket": r"(?:WebSocket|websocket|实时通信|实时消息)\s*[：:]\s*([^，。！？\n]+)",
        "功能": r"(?:功能|feature)\s*[：:]\s*([^，。！？\n]+)",
    }
    
    # 识别功能关键词
    requirement_lower = requirement.lower()
    
    # 检查是否是 Web 应用（使用原始需求文本，因为 lower() 可能影响中文匹配）
    is_web_app = (
        any(keyword in requirement for keyword in ["网页", "前端", "后端", "页面", "房间", "首页", "界面"]) or
        any(keyword in requirement_lower for keyword in ["web", "room", "page", "interface", "ui"])
    )
    
    if is_web_app:
        # Web 应用特定分解
        tasks = decompose_web_application(requirement, analysis)
    else:
        # 通用分解逻辑
        tasks = decompose_generic(requirement, analysis)
    
    return tasks

def decompose_web_application(requirement: str, analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
    """专门针对 Web 应用的分解逻辑"""
    tasks = []
    task_index = 1
    
    # 识别主要功能模块
    # 1. 首页/房间创建功能
    if any(keyword in requirement for keyword in ["首页", "创建房间", "房间链接", "邀请"]):
        tasks.append(create_web_task(
            task_index, "创建首页 - 房间创建功能",
            "实现首页，包含创建房间功能，生成唯一房间号和房间链接",
            ["首页可以正常访问", "点击创建房间按钮可以创建新房间", "生成唯一的房间号", "生成可分享的房间链接", "房间链接格式正确"],
            "npm test -- --testNamePattern='首页创建房间'"
        ))
        task_index += 1
    
    # 2. 房间页面布局 - 共享浏览区域
    if any(keyword in requirement for keyword in ["中间", "网页地址", "iframe", "共享", "浏览"]):
        tasks.append(create_web_task(
            task_index, "房间页面布局 - 共享浏览区域",
            "实现房间主界面，中间显示共享的网页地址（iframe），支持加载任意网页",
            ["房间页面可以正常加载", "中间区域显示 iframe", "可以通过 URL 参数加载指定网页", "iframe 可以正常显示外部网页", "支持常见网站的加载"],
            "npm test -- --testNamePattern='共享浏览区域'"
        ))
        task_index += 1
    
    # 3. 房间页面布局 - 侧边栏信息
    if any(keyword in requirement for keyword in ["房间号", "成员", "聊天信息", "侧边栏"]):
        tasks.append(create_web_task(
            task_index, "房间页面布局 - 侧边栏信息",
            "实现房间页面侧边栏，显示房间号和成员列表",
            ["侧边栏正确显示房间号", "侧边栏显示当前成员列表", "新成员加入时列表自动更新", "成员离开时列表自动更新", "UI 布局合理美观"],
            "npm test -- --testNamePattern='侧边栏信息'"
        ))
        task_index += 1
    
    # 4. 实时聊天功能
    if any(keyword in requirement for keyword in ["聊天", "消息", "chat", "实时"]):
        tasks.append(create_web_task(
            task_index, "实时聊天功能",
            "实现房间内的实时聊天功能，成员可以发送消息",
            ["聊天界面可以正常显示", "可以发送消息", "消息实时同步给所有成员", "消息显示发送者信息", "消息历史记录正确保存"],
            "npm test -- --testNamePattern='实时聊天'"
        ))
        task_index += 1
    
    # 5. WebSocket 实时通信服务
    if any(keyword in requirement for keyword in ["WebSocket", "websocket", "实时通信", "实时同步"]):
        tasks.append(create_web_task(
            task_index, "WebSocket 实时通信服务",
            "实现 WebSocket 服务器，支持房间内成员实时通信（聊天、操作同步）",
            ["WebSocket 服务器可以正常启动", "客户端可以成功连接", "支持房间分组通信", "消息可以正确广播给房间内所有成员", "连接断开时正确处理"],
            "npm test -- --testNamePattern='WebSocket服务'"
        ))
        task_index += 1
    
    # 6. 共享区域操作同步
    if any(keyword in requirement for keyword in ["操作", "同步", "滚动", "点击", "一起操作"]):
        tasks.append(create_web_task(
            task_index, "共享区域操作同步",
            "实现共享浏览区域的操作同步，成员的操作（滚动、点击等）同步给其他成员",
            ["可以捕获 iframe 内的操作事件", "操作事件可以发送到服务器", "操作可以同步给其他成员", "滚动位置可以同步", "URL 变化可以同步"],
            "npm test -- --testNamePattern='操作同步'"
        ))
        task_index += 1
    
    # 7. 无登录加入房间功能
    if any(keyword in requirement for keyword in ["无需登录", "无登录", "直接加入", "访客"]):
        tasks.append(create_web_task(
            task_index, "无登录加入房间功能",
            "实现通过房间链接直接加入房间，无需登录注册，自动分配临时昵称",
            ["通过房间链接可以访问房间", "无需登录即可加入", "自动分配临时昵称或使用访客身份", "可以正常使用所有功能", "离开后可以重新加入"],
            "npm test -- --testNamePattern='无登录加入'"
        ))
        task_index += 1
    
    # 8. 房间路由和导航
    if any(keyword in requirement for keyword in ["路由", "导航", "链接", "跳转"]):
        tasks.append(create_web_task(
            task_index, "房间路由和导航",
            "实现前端路由，支持首页和房间页面的导航，处理房间链接参数",
            ["首页路由 / 可以正常访问", "房间路由 /room/:roomId 可以正常访问", "通过房间链接可以正确跳转到房间页面", "URL 参数可以正确解析", "无效房间号显示错误提示"],
            "npm test -- --testNamePattern='路由导航'"
        ))
        task_index += 1
    
    # 9. Mock 数据和 API 模拟（如果提到需要避免阻塞）
    if any(keyword in requirement for keyword in ["Mock", "模拟", "测试数据", "避免阻塞"]):
        tasks.append(create_web_task(
            task_index, "Mock 数据和 API 模拟",
            "创建测试数据和 API Mock 服务，模拟后端返回数据，避免后端功能阻塞前端开发",
            ["创建房间 API Mock 返回正确的数据结构", "获取房间信息 API Mock 返回房间数据和成员列表", "WebSocket 连接 Mock 可以模拟实时消息", "Mock 数据格式与真实 API 一致", "前端可以正常使用 Mock 数据进行开发", "可以轻松切换到真实 API"],
            "npm test -- --testNamePattern='Mock数据'"
        ))
        task_index += 1
    
    # 10. 后端房间管理 API
    if any(keyword in requirement for keyword in ["后端", "API", "服务器", "后端功能"]):
        tasks.append(create_web_task(
            task_index, "后端房间管理 API",
            "实现后端房间管理 API，包括创建房间、获取房间信息、房间成员管理",
            ["POST /api/rooms 可以创建房间", "GET /api/rooms/:roomId 可以获取房间信息", "房间信息包含房间号、成员列表", "API 返回正确的状态码和数据结构", "API 接口与 Mock 数据格式一致"],
            "npm test -- --testNamePattern='房间管理API'"
        ))
        task_index += 1
    
    # 如果没有匹配到任何模式，至少创建一个基础任务
    if not tasks:
        # 即使没有匹配到具体模式，也应该创建一个基础任务
        tasks.append(create_web_task(
            1, "Web 应用基础框架",
            "搭建 Web 应用基础框架和项目结构",
            ["项目结构合理", "依赖安装成功", "开发环境可以正常启动", "基础路由可以访问"],
            "npm test -- --testNamePattern='基础框架'"
        ))
    
    return tasks

def create_web_task(index: int, title: str, description: str, success_criteria: List[str], test_command: str) -> Dict[str, Any]:
    """创建 Web 应用任务，包含详细的测试用例"""
    # 生成测试用例和断言
    test_cases = generate_test_cases(title, description, success_criteria)
    
    return {
        "id": f"watch-together-{index:03d}",
        "title": title,
        "description": description,
        "type": "web_feature",
        "test_command": test_command,
        "success_criteria": success_criteria,
        "test_cases": test_cases,  # 新增：测试用例
        "dependencies": []
    }

def generate_test_cases(title: str, description: str, success_criteria: List[str]) -> Dict[str, Any]:
    """为任务生成详细的测试用例、测试数据和断言"""
    test_cases = {
        "test_data": [],
        "test_scenarios": [],
        "assertions": []
    }
    
    title_lower = title.lower()
    desc_lower = description.lower()
    
    # 根据任务类型生成测试用例
    if "首页" in title or "创建房间" in title:
        test_cases["test_data"] = [
            {
                "input": "点击创建房间按钮",
                "expected_output": "生成房间号和链接"
            },
            {
                "input": "房间号格式",
                "expected_output": "唯一字符串，如 'room-abc123'"
            }
        ]
        test_cases["test_scenarios"] = [
            "场景1: 用户访问首页，点击创建房间按钮",
            "场景2: 验证生成的房间号唯一性",
            "场景3: 验证房间链接格式正确（包含房间号）"
        ]
        test_cases["assertions"] = [
            "assert(roomId).toBeDefined()",
            "assert(roomId).toMatch(/^room-[a-z0-9]+$/)",
            "assert(roomLink).toContain(roomId)",
            "assert(roomLink).toMatch(/^https?:\\/\\/.+\\/room\\/[a-z0-9-]+$/)"
        ]
    
    elif "共享浏览" in title or "iframe" in title:
        test_cases["test_data"] = [
            {
                "input": "URL: https://example.com",
                "expected_output": "iframe 加载该网页"
            },
            {
                "input": "URL 参数: ?url=https://github.com",
                "expected_output": "iframe 显示 GitHub 页面"
            }
        ]
        test_cases["test_scenarios"] = [
            "场景1: 通过 URL 参数加载指定网页",
            "场景2: iframe 正确显示外部网页内容",
            "场景3: 处理跨域限制（如果存在）"
        ]
        test_cases["assertions"] = [
            "assert(iframe).toBeInTheDocument()",
            "assert(iframe.src).toBe(expectedUrl)",
            "assert(iframe).toHaveAttribute('sandbox', expect.stringContaining('allow-same-origin'))"
        ]
    
    elif "侧边栏" in title or "成员列表" in title:
        test_cases["test_data"] = [
            {
                "input": "房间号: room-123",
                "expected_output": "侧边栏显示 '房间号: room-123'"
            },
            {
                "input": "成员列表: [{id: 'user1', name: 'Alice'}, {id: 'user2', name: 'Bob'}]",
                "expected_output": "侧边栏显示成员列表"
            }
        ]
        test_cases["test_scenarios"] = [
            "场景1: 侧边栏正确显示房间号",
            "场景2: 新成员加入时列表自动更新",
            "场景3: 成员离开时列表自动移除"
        ]
        test_cases["assertions"] = [
            "expect(screen.getByText(/房间号/)).toBeInTheDocument()",
            "expect(screen.getByText('room-123')).toBeInTheDocument()",
            "expect(memberList).toHaveLength(expectedCount)",
            "expect(memberList).toContainEqual(expect.objectContaining({name: 'Alice'}))"
        ]
    
    elif "聊天" in title:
        test_cases["test_data"] = [
            {
                "input": "消息: {text: 'Hello', sender: 'Alice', timestamp: '2024-01-01T10:00:00Z'}",
                "expected_output": "消息显示在聊天界面"
            }
        ]
        test_cases["test_scenarios"] = [
            "场景1: 用户发送消息",
            "场景2: 消息实时同步给所有成员",
            "场景3: 消息显示发送者信息和时间戳"
        ]
        test_cases["assertions"] = [
            "expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({text: 'Hello'}))",
            "expect(chatMessages).toContainEqual(expect.objectContaining({text: 'Hello', sender: 'Alice'}))",
            "expect(messageElement).toHaveTextContent('Hello')",
            "expect(messageElement).toHaveTextContent('Alice')"
        ]
    
    elif "websocket" in title or "实时通信" in title:
        test_cases["test_data"] = [
            {
                "input": "WebSocket 连接请求",
                "expected_output": "连接成功，加入房间"
            },
            {
                "input": "消息: {type: 'chat', roomId: 'room-123', data: {text: 'Hello'}}",
                "expected_output": "消息广播给房间内所有成员"
            }
        ]
        test_cases["test_scenarios"] = [
            "场景1: WebSocket 服务器启动",
            "场景2: 客户端成功连接",
            "场景3: 消息正确广播给房间内所有成员",
            "场景4: 连接断开时正确处理"
        ]
        test_cases["assertions"] = [
            "expect(wsServer).toBeDefined()",
            "expect(client.readyState).toBe(WebSocket.OPEN)",
            "expect(broadcast).toHaveBeenCalledWith(roomId, expect.objectContaining({type: 'chat'}))",
            "expect(connectedClients).toContain(clientId)"
        ]
    
    elif "操作同步" in title:
        test_cases["test_data"] = [
            {
                "input": "滚动事件: {type: 'scroll', x: 0, y: 100}",
                "expected_output": "其他成员的页面同步滚动"
            },
            {
                "input": "点击事件: {type: 'click', x: 100, y: 200}",
                "expected_output": "其他成员的页面同步点击位置"
            }
        ]
        test_cases["test_scenarios"] = [
            "场景1: 捕获 iframe 内的操作事件",
            "场景2: 操作事件发送到服务器",
            "场景3: 操作同步给其他成员",
            "场景4: 滚动位置同步"
        ]
        test_cases["assertions"] = [
            "expect(iframe.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function))",
            "expect(sendEvent).toHaveBeenCalledWith(expect.objectContaining({type: 'scroll', y: 100}))",
            "expect(syncScroll).toHaveBeenCalledWith(100)",
            "expect(otherMemberIframe.scrollTop).toBe(100)"
        ]
    
    elif "无登录" in title or "加入房间" in title:
        test_cases["test_data"] = [
            {
                "input": "房间链接: https://example.com/room/room-123",
                "expected_output": "直接进入房间，无需登录"
            },
            {
                "input": "访客信息",
                "expected_output": "自动分配临时昵称，如 '访客-1234'"
            }
        ]
        test_cases["test_scenarios"] = [
            "场景1: 通过房间链接访问",
            "场景2: 无需登录即可加入",
            "场景3: 自动分配临时昵称",
            "场景4: 可以正常使用所有功能"
        ]
        test_cases["assertions"] = [
            "expect(window.location.pathname).toBe('/room/room-123')",
            "expect(requireAuth).toBe(false)",
            "expect(user.name).toMatch(/^访客-\\d+$/)",
            "expect(user.role).toBe('guest')"
        ]
    
    elif "路由" in title or "导航" in title:
        test_cases["test_data"] = [
            {
                "input": "路由: /",
                "expected_output": "显示首页"
            },
            {
                "input": "路由: /room/room-123",
                "expected_output": "显示房间页面，房间号为 room-123"
            }
        ]
        test_cases["test_scenarios"] = [
            "场景1: 首页路由 / 可以正常访问",
            "场景2: 房间路由 /room/:roomId 可以正常访问",
            "场景3: 通过房间链接正确跳转",
            "场景4: 无效房间号显示错误提示"
        ]
        test_cases["assertions"] = [
            "expect(router.pathname).toBe('/')",
            "expect(screen.getByText(/创建房间/)).toBeInTheDocument()",
            "expect(router.pathname).toBe('/room/room-123')",
            "expect(screen.getByText(/房间号/)).toBeInTheDocument()",
            "expect(screen.getByText(/房间不存在/)).toBeInTheDocument()"
        ]
    
    elif "mock" in title or "模拟" in title:
        test_cases["test_data"] = [
            {
                "input": "POST /api/rooms",
                "expected_output": "{roomId: 'room-123', members: [], createdAt: '2024-01-01T10:00:00Z'}"
            },
            {
                "input": "GET /api/rooms/room-123",
                "expected_output": "{roomId: 'room-123', members: [{id: 'user1', name: 'Alice'}]}"
            }
        ]
        test_cases["test_scenarios"] = [
            "场景1: 创建房间 API Mock 返回正确的数据结构",
            "场景2: 获取房间信息 API Mock 返回房间数据和成员列表",
            "场景3: WebSocket Mock 可以模拟实时消息",
            "场景4: Mock 数据格式与真实 API 一致"
        ]
        test_cases["assertions"] = [
            "expect(mockResponse.data).toHaveProperty('roomId')",
            "expect(mockResponse.data).toHaveProperty('members')",
            "expect(mockResponse.data.members).toBeArray()",
            "expect(mockResponse.status).toBe(200)",
            "expect(mockResponse.data.roomId).toMatch(/^room-[a-z0-9]+$/)"
        ]
    
    elif "api" in title or "后端" in title:
        test_cases["test_data"] = [
            {
                "input": "POST /api/rooms {name: 'Test Room'}",
                "expected_output": "{roomId: 'room-123', name: 'Test Room', members: [], status: 201}"
            },
            {
                "input": "GET /api/rooms/room-123",
                "expected_output": "{roomId: 'room-123', members: [{id: 'user1', name: 'Alice'}]}"
            }
        ]
        test_cases["test_scenarios"] = [
            "场景1: POST /api/rooms 可以创建房间",
            "场景2: GET /api/rooms/:roomId 可以获取房间信息",
            "场景3: 房间信息包含房间号、成员列表",
            "场景4: API 返回正确的状态码和数据结构"
        ]
        test_cases["assertions"] = [
            "expect(response.status).toBe(201)",
            "expect(response.data).toHaveProperty('roomId')",
            "expect(response.data).toHaveProperty('members')",
            "expect(response.data.members).toBeArray()",
            "expect(response.headers['content-type']).toMatch(/application\\/json/)"
        ]
    
    else:
        # 默认测试用例
        test_cases["test_data"] = [
            {
                "input": "功能输入",
                "expected_output": "预期输出"
            }
        ]
        test_cases["test_scenarios"] = [
            "场景1: 基本功能测试",
            "场景2: 边界条件测试",
            "场景3: 错误处理测试"
        ]
        test_cases["assertions"] = [
            "expect(result).toBeDefined()",
            "expect(result).toMatch(expectedOutput)"
        ]
    
    return test_cases

def decompose_generic(requirement: str, analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
    """通用分解逻辑（用于非 Web 应用）"""
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
    desc = feature.get("description", "").lower()
    task_type = feature.get("type", "")
    
    # Web 应用特定测试命令
    if task_type == "web_feature":
        # 根据功能类型生成具体的测试命令
        title = feature.get("title", "").lower()
        if "首页" in title or "创建房间" in title:
            return "npm test -- --testNamePattern='首页创建房间'"
        elif "共享浏览" in title or "iframe" in title:
            return "npm test -- --testNamePattern='共享浏览区域'"
        elif "侧边栏" in title or "成员列表" in title:
            return "npm test -- --testNamePattern='侧边栏信息'"
        elif "聊天" in title:
            return "npm test -- --testNamePattern='实时聊天'"
        elif "websocket" in title or "实时通信" in title:
            return "npm test -- --testNamePattern='WebSocket服务'"
        elif "操作同步" in title:
            return "npm test -- --testNamePattern='操作同步'"
        elif "无登录" in title or "加入房间" in title:
            return "npm test -- --testNamePattern='无登录加入'"
        elif "路由" in title or "导航" in title:
            return "npm test -- --testNamePattern='路由导航'"
        elif "mock" in title or "模拟" in title:
            return "npm test -- --testNamePattern='Mock数据'"
        elif "api" in title or "后端" in title:
            return "npm test -- --testNamePattern='房间管理API'"
        else:
            return "npm test"
    
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
        return "npm test"

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
        
        # 添加测试用例信息
        if task.get('test_cases'):
            test_cases = task['test_cases']
            output.append("- **测试用例**:\n")
            
            if test_cases.get('test_data'):
                output.append("  **测试数据**:\n")
                for j, test_data in enumerate(test_cases['test_data'], 1):
                    output.append(f"    {j}. 输入: {test_data.get('input', 'N/A')}\n")
                    output.append(f"       预期输出: {test_data.get('expected_output', 'N/A')}\n")
            
            if test_cases.get('test_scenarios'):
                output.append("  **测试场景**:\n")
                for j, scenario in enumerate(test_cases['test_scenarios'], 1):
                    output.append(f"    {j}. {scenario}\n")
            
            if test_cases.get('assertions'):
                output.append("  **断言示例**:\n")
                for j, assertion in enumerate(test_cases['assertions'], 1):
                    output.append(f"    {j}. `{assertion}`\n")
        
        if task.get('dependencies'):
            output.append(f"- **依赖**: {', '.join(task['dependencies'])}\n")
        else:
            output.append("- **依赖**: 无（可并行执行）\n")
        output.append("\n")
    
    return "".join(output)

def main():
    """CLI 接口"""
    # 设置标准输出编码为 UTF-8
    import io
    if sys.stdout.encoding != 'utf-8':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    if sys.stderr.encoding != 'utf-8':
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
    
    # 支持从 stdin 或命令行参数读取需求
    requirement = ""
    
    # 检查是否从 stdin 读取（通过管道传递）
    if not sys.stdin.isatty():
        # 从 stdin 读取
        requirement = sys.stdin.read().strip()
    elif len(sys.argv) >= 2:
        # 从命令行参数读取
        requirement = sys.argv[1]
    else:
        print("Usage: decompose_requirement.py <requirement_text>", file=sys.stderr)
        print("   or: echo 'requirement' | decompose_requirement.py --json", file=sys.stderr)
        sys.exit(1)
    
    if not requirement:
        print("Error: Empty requirement", file=sys.stderr)
        sys.exit(1)
    
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
