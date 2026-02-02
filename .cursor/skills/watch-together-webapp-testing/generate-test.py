#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
根据 backlog task 或 RALPH_TASK.md 自动生成 Playwright 测试脚本
"""

import os
import sys
import re
import json
import subprocess
import io
from pathlib import Path

# 修复 Windows 控制台编码问题
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def extract_test_scenarios_from_task(task_content: str) -> list:
    """从任务内容中提取测试场景"""
    scenarios = []
    
    # 尝试从测试用例部分提取
    test_cases_match = re.search(r'\*\*测试用例\*\*:(.*?)(?=\n\*\*|\n---|\Z)', task_content, re.DOTALL)
    if test_cases_match:
        test_cases_content = test_cases_match.group(1)
        
        # 提取测试场景
        scenarios_match = re.search(r'\*\*测试场景\*\*:(.*?)(?=\n\*\*|\Z)', test_cases_content, re.DOTALL)
        if scenarios_match:
            scenarios_text = scenarios_match.group(1).strip()
            # 按行分割，提取编号的场景
            for line in scenarios_text.split('\n'):
                line = line.strip()
                if not line:
                    continue
                # 移除编号（如 "1. " 或 "- "）
                line = re.sub(r'^\d+\.\s*', '', line)
                line = re.sub(r'^-\s*', '', line)
                if line:
                    scenarios.append(line)
    
    # 如果没有找到测试场景，尝试从 Acceptance Criteria 提取
    if not scenarios:
        ac_pattern = r'-\s*\[[ xX]\]\s*(.+?)(?=\n|$)'
        for match in re.finditer(ac_pattern, task_content):
            criterion = match.group(1).strip()
            # 移除编号（如 "#1 "）
            criterion = re.sub(r'^#\d+\s*', '', criterion)
            if criterion:
                scenarios.append(criterion)
    
    return scenarios

def generate_playwright_test(task_id: str, scenarios: list, task_description: str = "") -> str:
    """根据测试场景生成 Playwright 测试脚本"""
    
    function_name = task_id.lower().replace("-", "_")
    
    test_code = f'''#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自动生成的测试脚本 - {task_id}
根据任务描述和测试场景生成
"""

import sys
import io

# 修复 Windows 控制台编码问题
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from playwright.sync_api import sync_playwright
import time
import os

def test_{function_name}():
    """
    测试 {task_id}
    
    测试场景:
'''
    
    for i, scenario in enumerate(scenarios, 1):
        test_code += f"    {i}. {scenario}\n"
    
    task_num = task_id.replace("TASK-", "").replace("task-", "")
    artifact_dir = os.path.join("backlog", "test-results", f"task-{task_num}")
    
    # 将 scenarios 列表转换为字符串，用于嵌入到代码中
    scenarios_repr = repr(scenarios)
    
    test_code += f'''    """
    # 测试结果截图保存到单独文件夹，便于归档与文档关联
    artifact_dir = {repr(artifact_dir)}
    os.makedirs(artifact_dir, exist_ok=True)
    scenarios = {scenarios_repr}
    print("=" * 60)
    print(f"测试 {task_id}")
    print("=" * 60)
    print()
    
    with sync_playwright() as p:
        # 根据功能需求决定是否使用 headless 模式
        # 如果涉及 getDisplayMedia、getUserMedia 等需要用户交互的 API，使用 headless=False
        scenarios_str = ' '.join(scenarios).lower()
        needs_user_interaction = any(keyword in scenarios_str for keyword in [
            'getdisplaymedia', 'getusermedia', '屏幕共享', '摄像头', '麦克风', '权限', '对话框', '弹出'
        ])
        
        browser_args = []
        context_permissions = []
        
        if needs_user_interaction:
            browser_args = [
                '--use-fake-ui-for-media-stream',
                '--use-fake-device-for-media-stream',
                '--allow-http-screen-capture',
                '--enable-usermedia-screen-capturing',
            ]
            # Playwright 支持的权限名称：camera, microphone, geolocation, notifications, etc.
            # display-capture 需要通过浏览器参数设置，不能通过 permissions API
            context_permissions = ['camera', 'microphone']
        
        print("启动浏览器（房主端）...")
        browser_host = p.chromium.launch(
            headless=not needs_user_interaction,
            args=browser_args
        )
        
        context_host = browser_host.new_context(
            permissions=context_permissions
        )
        page_host = context_host.new_page()
        
        # 如果需要测试成员端观看视频，创建第二个浏览器实例
        needs_member_view = any(keyword in scenarios_str for keyword in [
            '成员', '观看', '播放', '接收', 'member', 'view', 'play'
        ])
        
        browser_member = None
        page_member = None
        
        if needs_member_view:
            print("启动浏览器（成员端）...")
            browser_member = p.chromium.launch(
                headless=False,  # 成员端也需要看到视频，使用非 headless
                args=browser_args
            )
            context_member = browser_member.new_context(
                permissions=context_permissions
            )
            page_member = context_member.new_page()
        
        # 使用房主页面作为主页面
        page = page_host
        
        # 导航到应用首页
        print("导航到 http://localhost:3001 ...")
        page.goto('http://localhost:3001')
        page.wait_for_load_state('networkidle')
        
        # 等待页面加载
        print("等待页面加载...")
        time.sleep(2)
        
        # 检查是否需要创建房间（如果当前不在房间页面）
        current_url = page.url
        if '/room/' not in current_url:
            print("\\n检测到需要创建房间...")
            
            # 查找创建房间表单
            form = page.locator('#createRoomForm')
            if form.count() > 0:
                print("找到创建房间表单，填写表单...")
                
                # 填写房间名称（可选）
                room_name_input = page.locator('#roomName, input[name="roomName"]')
                if room_name_input.count() > 0:
                    room_name_input.first.fill('测试房间')
                    print("  ✅ 已填写房间名称: 测试房间")
                
                # 填写 URL（必填）
                url_input = page.locator('#targetUrl, input[name="url"], input[type="url"]')
                if url_input.count() > 0:
                    url_input.first.fill('https://www.example.com')
                    print("  ✅ 已填写 URL: https://www.example.com")
                else:
                    print("  ❌ 未找到 URL 输入框")
                
                # 填写房主昵称（可选）
                nickname_input = page.locator('#hostNickname, input[name="hostNickname"]')
                if nickname_input.count() > 0:
                    nickname_input.first.fill('测试房主')
                    print("  ✅ 已填写房主昵称: 测试房主")
                
                # 提交表单
                submit_button = page.locator('#createBtn, button[type="submit"], button:has-text("创建房间")')
                if submit_button.count() > 0:
                    print("  提交表单...")
                    submit_button.first.click()
                    
                    # 等待跳转到房间页面
                    print("  等待跳转到房间页面...")
                    try:
                        page.wait_for_url('**/room/**', timeout=10000)
                        print("  ✅ 已跳转到房间页面")
                        page.wait_for_load_state('networkidle')
                        time.sleep(3)  # 等待房间页面完全加载
                    except Exception as e:
                        print(f"  ⚠️  等待跳转超时: {{e}}")
                        # 尝试检查是否还在首页
                        if '/room/' not in page.url:
                            print("  ❌ 未成功跳转到房间页面")
                else:
                    print("  ❌ 未找到提交按钮")
            else:
                print("  ⚠️  未找到创建房间表单")
        else:
            print("\\n已在房间页面，跳过创建房间步骤")
        
        # 保存房间 ID（用于成员端加入）
        room_id = None
        if '/room/' in page.url:
            # 从 URL 中提取房间 ID
            import re as re_module
            room_id_match = re_module.search(r'/room/([^/?]+)', page.url)
            if room_id_match:
                room_id = room_id_match.group(1)
                print(f"\\n✅ 房间 ID: {{room_id}}")
        
        # 如果创建了成员端浏览器，让成员加入房间
        if needs_member_view and room_id and page_member:
            print("\\n让成员端加入房间...")
            member_room_url = f'http://localhost:3001/room/{{room_id}}'
            page_member.goto(member_room_url)
            page_member.wait_for_load_state('networkidle')
            time.sleep(3)  # 等待成员端页面加载
            
            # 成员端可能需要填写昵称并加入
            member_nickname_input = page_member.locator('input[name="nickname"], input[id*="nickname"], input[placeholder*="昵称"]')
            if member_nickname_input.count() > 0:
                member_nickname_input.first.fill('测试成员')
                print("  ✅ 成员端已填写昵称")
                
                # 查找加入按钮
                join_button = page_member.locator('button:has-text("加入"), button:has-text("进入"), button[type="submit"]')
                if join_button.count() > 0:
                    join_button.first.click()
                    print("  ✅ 成员端已点击加入按钮")
                    page_member.wait_for_load_state('networkidle')
                    time.sleep(2)
            
            page_member.screenshot(path=os.path.join(artifact_dir, 'member-joined.png'), full_page=True)
            print(f"✅ 已保存成员端截图: {{artifact_dir}}/member-joined.png")
        
        # 初始截图（房主端）
        page.screenshot(path=os.path.join(artifact_dir, 'initial.png'), full_page=True)
        print(f"✅ 已保存房主端初始截图: {{artifact_dir}}/initial.png")
        
        # 根据测试场景执行测试
        test_results = []
        
'''
    
    # 为每个场景生成测试代码
    for i, scenario in enumerate(scenarios, 1):
        test_code += f'''        # 测试场景 {i}: {scenario}
        print(f"\\n测试场景 {i}: {scenario}")
        try:
'''
        
        # 根据场景内容生成相应的测试代码
        scenario_lower = scenario.lower()
        
        if '按钮' in scenario or 'button' in scenario_lower:
            # 提取按钮文本
            button_match = re.search(r'["""](.+?)["""]', scenario)
            if button_match:
                button_text = button_match.group(1)
                test_code += f'''            # 查找按钮: {button_text}
            button = page.locator(f'button:has-text("{button_text}")')
            if button.count() == 0:
                # 尝试其他选择器
                button = page.locator(f'[aria-label*="{button_text}"], [title*="{button_text}"]')
            
            if button.count() > 0 and button.first.is_visible():
                print(f"  ✅ 找到按钮: {button_text}")
                button.first.click()
                print(f"  ✅ 已点击按钮: {button_text}")
                page.wait_for_timeout(1000)  # 等待操作完成
                test_results.append(("场景 {i}", True, "按钮点击成功"))
            else:
                print(f"  ❌ 未找到按钮: {button_text}")
                test_results.append(("场景 {i}", False, f"未找到按钮: {button_text}"))
'''
            else:
                test_code += f'''            # 场景描述: {scenario}
            # TODO: 根据具体场景实现测试逻辑
            print(f"  ⚠️  场景 {i} 需要手动实现")
            test_results.append(("场景 {i}", None, "需要手动实现"))
'''
        
        elif 'video' in scenario_lower or '视频' in scenario or '预览' in scenario or '选择内容后' in scenario:
            test_code += f'''            # 检查视频元素（通常在点击开始共享后）
            # 如果场景提到"选择内容后"，说明需要先点击开始共享按钮
            if '选择内容后' in '{scenario}' or '选择' in '{scenario}':
                # 先查找并点击"开始共享"按钮
                start_button = page.locator('button:has-text("开始共享"), button:has-text("开始")')
                if start_button.count() > 0 and start_button.first.is_visible():
                    print(f"  ✅ 找到开始共享按钮，点击...")
                    start_button.first.click()
                    print(f"  ⚠️  等待用户选择屏幕/标签页（10秒）...")
                    page.wait_for_timeout(10000)  # 给用户时间选择屏幕源
            
            video_selectors = ['video#videoStream', 'video[srcObject]', 'video', '#videoContainer video']
            video_found = False
            for selector in video_selectors:
                videos = page.locator(selector).all()
                if videos:
                    video = videos[0]
                    print(f"  ✅ 找到视频元素: {{selector}}")
                    
                    # 等待视频加载
                    page.wait_for_timeout(3000)
                    
                    # 检查视频是否在播放
                    is_playing = page.evaluate("""
                        () => {{
                            const video = document.querySelector('video#videoStream, video[srcObject], video');
                            return video && !video.paused && video.readyState >= 2;
                        }}
                    """)
                    
                    if is_playing:
                        print(f"  ✅ 视频正在播放")
                        test_results.append(("场景 {i}", True, "视频正在播放"))
                    else:
                        print(f"  ⚠️  视频未播放（可能用户还未选择屏幕源）")
                        test_results.append(("场景 {i}", None, "视频未播放（需要用户选择屏幕源）"))
                    video_found = True
                    break
            
            if not video_found:
                print(f"  ❌ 未找到视频元素")
                test_results.append(("场景 {i}", False, "未找到视频元素"))
'''
        
        elif '停止' in scenario or '关闭' in scenario or 'stop' in scenario_lower or 'close' in scenario_lower:
            test_code += f'''            # 检查停止/关闭功能
            # 查找停止按钮
            stop_button = page.locator('button:has-text("停止"), button:has-text("关闭")')
            if stop_button.count() > 0:
                stop_button.first.click()
                print(f"  ✅ 已点击停止/关闭")
                page.wait_for_timeout(1000)
                
                # 检查 MediaStream 是否已关闭（如果适用）
                streams_closed = page.evaluate("""
                    () => {{
                        const video = document.querySelector('video');
                        if (!video || !video.srcObject) return true;
                        const stream = video.srcObject;
                        if (!stream || !stream.getVideoTracks) return true;
                        return stream.getVideoTracks().every(track => track.readyState === 'ended');
                    }}
                """)
                
                if streams_closed:
                    print(f"  ✅ MediaStream 已正确关闭")
                    test_results.append(("场景 {i}", True, "MediaStream 已关闭"))
                else:
                    print(f"  ⚠️  MediaStream 可能未完全关闭")
                    test_results.append(("场景 {i}", None, "MediaStream 可能未完全关闭"))
            else:
                print(f"  ⚠️  未找到停止/关闭按钮")
                test_results.append(("场景 {i}", None, "未找到停止按钮"))
'''
        
        elif '对话框' in scenario or 'dialog' in scenario_lower or '弹出' in scenario:
            test_code += f'''            # 检查对话框/弹出窗口（如屏幕共享选择对话框）
            # 先查找并点击"开始共享"按钮
            start_button = page.locator('button:has-text("开始共享"), button:has-text("开始")')
            if start_button.count() > 0 and start_button.first.is_visible():
                print(f"  ✅ 找到开始共享按钮，点击...")
                start_button.first.click()
                print(f"  ⚠️  等待浏览器弹出屏幕/标签页选择对话框（10秒）...")
                print(f"  ⚠️  请在浏览器对话框中选择要共享的屏幕/标签页")
                page.wait_for_timeout(10000)  # 给用户时间选择屏幕源
                test_results.append(("场景 {i}", True, "已点击开始共享按钮，等待用户选择屏幕源"))
            else:
                print(f"  ❌ 未找到开始共享按钮")
                # 尝试查找所有按钮
                all_buttons = page.locator('button').all()
                print(f"  页面上的所有按钮:")
                for btn_idx, btn in enumerate(all_buttons[:10]):  # 最多显示10个
                    try:
                        btn_text = btn.inner_text().strip()
                        if btn_text:
                            print(f"    [{{btn_idx}}] {{btn_text}}")
                    except:
                        pass
                test_results.append(("场景 {i}", False, "未找到开始共享按钮"))
'''
        
        elif 'chatinput' in scenario_lower or 'chatmessages' in scenario_lower or ('发送' in scenario and ('成员' in scenario or 'member' in scenario_lower or 'chat' in scenario_lower)) or ('房主发送' in scenario and '成员' in scenario):
            # 房主发送消息 → 成员端 #chatMessages 显示（TASK-125 及同类任务复用）
            test_code += f'''            # 房主在 #chatInput 输入并点击发送，成员端 #chatMessages 应包含该消息
            chat_text = f"test-msg-''' + '{time.time()}' + '''"
            chat_input = page.locator('#chatInput')
            if chat_input.count() == 0:
                chat_input = page.locator('input[placeholder*="消息"], input[name="message"]')
            if chat_input.count() > 0:
                chat_input.first.fill(chat_text)
                print(f"  ✅ 房主端已输入: {{chat_text[:20]}}...")
                send_btn = page.locator('#chatSendButton, button:has-text("发送")')
                if send_btn.count() > 0 and send_btn.first.is_visible():
                    send_btn.first.click()
                    print(f"  ✅ 已点击发送")
                    page.wait_for_timeout(2000)
                    if page_member:
                        member_msgs = page_member.locator('#chatMessages')
                        if member_msgs.count() > 0:
                            member_text = member_msgs.first.inner_text()
                            if chat_text in member_text:
                                print(f"  ✅ 成员端 #chatMessages 包含发送内容")
                                test_results.append(("场景 {i}", True, "成员端 #chatMessages 包含房主发送的文本"))
                            else:
                                print(f"  ❌ 成员端 #chatMessages 未包含发送内容。当前内容: {{member_text[:200]}}")
                                test_results.append(("场景 {i}", False, "成员端 #chatMessages 未包含房主发送的文本"))
                        else:
                            print(f"  ❌ 成员端未找到 #chatMessages")
                            test_results.append(("场景 {i}", False, "成员端未找到 #chatMessages"))
                else:
                    print(f"  ❌ 未找到发送按钮")
                    test_results.append(("场景 {i}", False, "未找到发送按钮"))
            else:
                print(f"  ❌ 未找到 #chatInput")
                test_results.append(("场景 {i}", False, "未找到 #chatInput"))
'''
        
        elif '成员列表' in scenario or '成员加入' in scenario or ('成员' in scenario and ('实时' in scenario or '更新' in scenario or '显示' in scenario)):
            # 成员加入后成员列表应显示新成员（TASK-126 及同类任务复用）
            test_code += f'''            # 检查房主端/成员端成员列表是否包含新加入成员
            member_list_selector = '#memberList, .member-list, [data-testid="member-list"], ul.members'
            found_on_host = False
            found_on_member = False
            if page.locator(member_list_selector).count() > 0:
                host_list_text = page.locator(member_list_selector).first.inner_text()
                if '测试成员' in host_list_text or '测试房主' in host_list_text:
                    found_on_host = True
                print(f"  {{'✅' if found_on_host else '⚠️'}} 房主端成员列表: {{host_list_text[:100]}}...")
            if page_member and page_member.locator(member_list_selector).count() > 0:
                member_list_text = page_member.locator(member_list_selector).first.inner_text()
                if '测试成员' in member_list_text or '测试房主' in member_list_text:
                    found_on_member = True
                print(f"  {{'✅' if found_on_member else '⚠️'}} 成员端成员列表: {{member_list_text[:100]}}...")
            if found_on_host or found_on_member:
                test_results.append(("场景 {i}", True, "成员列表包含预期成员"))
            else:
                test_results.append(("场景 {i}", None, "成员列表需根据页面选择器调整"))
'''
        
        else:
            # 通用场景处理
            test_code += f'''            # 场景: {scenario}
            # TODO: 根据具体场景实现测试逻辑
            print(f"  ⚠️  场景 {i} 需要根据具体需求实现")
            test_results.append(("场景 {i}", None, "需要手动实现"))
'''
        
        test_code += '''        except Exception as e:
            print(f"  ❌ 场景 {i} 测试失败: {{e}}")
            test_results.append(("场景 {i}", False, str(e)))
        
'''
    
    test_code += '''        # 最终截图（房主端，保存到任务专属目录）
        page.screenshot(path=os.path.join(artifact_dir, 'final.png'), full_page=True)
        print(f"✅ 已保存房主端最终截图: {{artifact_dir}}/final.png")
        
        # 汇总测试结果
        print("\\n" + "=" * 60)
        print("测试结果汇总")
        print("=" * 60)
        passed = sum(1 for _, result, _ in test_results if result is True)
        failed = sum(1 for _, result, _ in test_results if result is False)
        skipped = sum(1 for _, result, _ in test_results if result is None)
        
        for scenario_name, result, message in test_results:
            status = "✅" if result is True else "❌" if result is False else "⚠️ "
            print(f"{status} {scenario_name}: {message}")
        
        print(f"\\n总计: {passed} 通过, {failed} 失败, {skipped} 跳过")
        print("=" * 60)
        
        # 关闭浏览器
        browser_host.close()
        if browser_member:
            browser_member.close()
        
        # 如果有失败的测试，返回 False
        return failed == 0

if __name__ == '__main__':
    success = test_{function_name}()
    sys.exit(0 if success else 1)
'''
    
    # 替换模板中的变量占位符（使用字符串替换）
    test_code = test_code.replace('{function_name}', function_name)
    test_code = test_code.replace('{task_id}', task_id)
    
    return test_code

def main():
    if len(sys.argv) < 2:
        print("用法: python generate-test.py <TASK-ID> [RALPH_TASK.md路径]")
        print("示例: python generate-test.py TASK-32")
        print("      python generate-test.py TASK-32 /path/to/RALPH_TASK.md")
        sys.exit(1)
    
    task_id = sys.argv[1]
    task_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    # 如果没有提供文件路径，尝试从当前目录或项目根目录查找
    task_content = None
    
    if not task_file:
        script_dir = Path(__file__).parent
        project_root = script_dir.parent.parent.parent
        
        # 尝试查找 RALPH_TASK.md
        ralph_task = project_root / "RALPH_TASK.md"
        if ralph_task.exists():
            task_file = str(ralph_task)
            with open(task_file, 'r', encoding='utf-8') as f:
                task_content = f.read()
        else:
            # 尝试从 backlog task 读取
            try:
                result = subprocess.run(
                    ["backlog", "task", task_id.replace("TASK-", ""), "--plain"],
                    capture_output=True,
                    text=True,
                    encoding='utf-8',
                    errors='replace',
                    timeout=10
                )
                if result.returncode == 0:
                    task_content = result.stdout
                else:
                    print(f"❌ 无法读取 backlog task {task_id}", file=sys.stderr)
                    print(f"   错误输出: {result.stderr}", file=sys.stderr)
                    sys.exit(1)
            except Exception as e:
                print(f"❌ 错误: {e}", file=sys.stderr)
                sys.exit(1)
    else:
        with open(task_file, 'r', encoding='utf-8') as f:
            task_content = f.read()
    
    if not task_content:
        print(f"❌ 无法读取任务内容", file=sys.stderr)
        sys.exit(1)
    
    # 提取测试场景
    scenarios = extract_test_scenarios_from_task(task_content)
    
    if not scenarios:
        print("⚠️  未找到测试场景，将生成基础测试模板", file=sys.stderr)
        scenarios = ["验证页面基本功能"]
    
    # 生成测试脚本
    test_code = generate_playwright_test(task_id, scenarios, task_content)
    
    # 保存测试脚本
    script_dir = Path(__file__).parent
    tests_dir = script_dir / "tests"
    tests_dir.mkdir(exist_ok=True)
    
    test_file = tests_dir / f"test-{task_id.lower()}.py"
    with open(test_file, 'w', encoding='utf-8') as f:
        f.write(test_code)
    
    print(f"✅ 已生成测试脚本: {test_file}")
    print(f"   包含 {len(scenarios)} 个测试场景")
    
    # 使脚本可执行
    import os
    os.chmod(test_file, 0o755)

if __name__ == '__main__':
    main()
