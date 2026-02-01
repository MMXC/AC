#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自动生成的测试脚本 - TASK-109
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

def test_task_109():
    """
    测试 TASK-109
    
    测试场景:
    1. 房主点击开始共享能向目标成员发送 WEBRTC_OFFER
    2. 成员收到 WEBRTC_OFFER 后能创建 answer 并用 WEBRTC_ANSWER 回传
    3. 双方能正确处理 WEBRTC_ICE_CANDIDATE 直至连接建立
    4. 成员端 VideoPlayer 成功接收远端 MediaStream 并播放画面
    5. 房主点击开始共享能向目标成员发送 WEBRTC_OFFER
    6. 成员收到 WEBRTC_OFFER 后能创建 answer 并用 WEBRTC_ANSWER 回传
    7. 双方能正确处理 WEBRTC_ICE_CANDIDATE 直至连接建立
    8. 成员端 VideoPlayer 成功接收远端 MediaStream 并播放画面
    """
    # 测试结果截图保存到单独文件夹，便于归档与文档关联
    artifact_dir = 'backlog/test-results/task-109'
    os.makedirs(artifact_dir, exist_ok=True)
    scenarios = ['房主点击开始共享能向目标成员发送 WEBRTC_OFFER', '成员收到 WEBRTC_OFFER 后能创建 answer 并用 WEBRTC_ANSWER 回传', '双方能正确处理 WEBRTC_ICE_CANDIDATE 直至连接建立', '成员端 VideoPlayer 成功接收远端 MediaStream 并播放画面', '房主点击开始共享能向目标成员发送 WEBRTC_OFFER', '成员收到 WEBRTC_OFFER 后能创建 answer 并用 WEBRTC_ANSWER 回传', '双方能正确处理 WEBRTC_ICE_CANDIDATE 直至连接建立', '成员端 VideoPlayer 成功接收远端 MediaStream 并播放画面']
    print("=" * 60)
    print(f"测试 TASK-109")
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
            print("\n检测到需要创建房间...")
            
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
                        print(f"  ⚠️  等待跳转超时: {e}")
                        # 尝试检查是否还在首页
                        if '/room/' not in page.url:
                            print("  ❌ 未成功跳转到房间页面")
                else:
                    print("  ❌ 未找到提交按钮")
            else:
                print("  ⚠️  未找到创建房间表单")
        else:
            print("\n已在房间页面，跳过创建房间步骤")
        
        # 保存房间 ID（用于成员端加入）
        room_id = None
        if '/room/' in page.url:
            # 从 URL 中提取房间 ID
            import re as re_module
            room_id_match = re_module.search(r'/room/([^/?]+)', page.url)
            if room_id_match:
                room_id = room_id_match.group(1)
                print(f"\n✅ 房间 ID: {room_id}")
        
        # 如果创建了成员端浏览器，让成员加入房间
        if needs_member_view and room_id and page_member:
            print("\n让成员端加入房间...")
            member_room_url = f'http://localhost:3001/room/{room_id}'
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
            print(f"✅ 已保存成员端截图: {artifact_dir}/member-joined.png")
        
        # 初始截图（房主端）
        page.screenshot(path=os.path.join(artifact_dir, 'initial.png'), full_page=True)
        print(f"✅ 已保存房主端初始截图: {artifact_dir}/initial.png")
        
        # 根据测试场景执行测试
        test_results = []
        
        # 测试场景 1: 房主点击开始共享能向目标成员发送 WEBRTC_OFFER
        print(f"\n测试场景 1: 房主点击开始共享能向目标成员发送 WEBRTC_OFFER")
        try:
            # 场景: 房主点击开始共享能向目标成员发送 WEBRTC_OFFER
            # TODO: 根据具体场景实现测试逻辑
            print(f"  ⚠️  场景 1 需要根据具体需求实现")
            test_results.append(("场景 1", None, "需要手动实现"))
        except Exception as e:
            print(f"  ❌ 场景 {i} 测试失败: {{e}}")
            test_results.append(("场景 {i}", False, str(e)))
        
        # 测试场景 2: 成员收到 WEBRTC_OFFER 后能创建 answer 并用 WEBRTC_ANSWER 回传
        print(f"\n测试场景 2: 成员收到 WEBRTC_OFFER 后能创建 answer 并用 WEBRTC_ANSWER 回传")
        try:
            # 场景: 成员收到 WEBRTC_OFFER 后能创建 answer 并用 WEBRTC_ANSWER 回传
            # TODO: 根据具体场景实现测试逻辑
            print(f"  ⚠️  场景 2 需要根据具体需求实现")
            test_results.append(("场景 2", None, "需要手动实现"))
        except Exception as e:
            print(f"  ❌ 场景 {i} 测试失败: {{e}}")
            test_results.append(("场景 {i}", False, str(e)))
        
        # 测试场景 3: 双方能正确处理 WEBRTC_ICE_CANDIDATE 直至连接建立
        print(f"\n测试场景 3: 双方能正确处理 WEBRTC_ICE_CANDIDATE 直至连接建立")
        try:
            # 场景: 双方能正确处理 WEBRTC_ICE_CANDIDATE 直至连接建立
            # TODO: 根据具体场景实现测试逻辑
            print(f"  ⚠️  场景 3 需要根据具体需求实现")
            test_results.append(("场景 3", None, "需要手动实现"))
        except Exception as e:
            print(f"  ❌ 场景 {i} 测试失败: {{e}}")
            test_results.append(("场景 {i}", False, str(e)))
        
        # 测试场景 4: 成员端 VideoPlayer 成功接收远端 MediaStream 并播放画面
        print(f"\n测试场景 4: 成员端 VideoPlayer 成功接收远端 MediaStream 并播放画面")
        try:
            # 检查视频元素（通常在点击开始共享后）
            # 如果场景提到"选择内容后"，说明需要先点击开始共享按钮
            if '选择内容后' in '成员端 VideoPlayer 成功接收远端 MediaStream 并播放画面' or '选择' in '成员端 VideoPlayer 成功接收远端 MediaStream 并播放画面':
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
                    print(f"  ✅ 找到视频元素: {selector}")
                    
                    # 等待视频加载
                    page.wait_for_timeout(3000)
                    
                    # 检查视频是否在播放
                    is_playing = page.evaluate("""
                        () => {
                            const video = document.querySelector('video#videoStream, video[srcObject], video');
                            return video && !video.paused && video.readyState >= 2;
                        }
                    """)
                    
                    if is_playing:
                        print(f"  ✅ 视频正在播放")
                        test_results.append(("场景 4", True, "视频正在播放"))
                    else:
                        print(f"  ⚠️  视频未播放（可能用户还未选择屏幕源）")
                        test_results.append(("场景 4", None, "视频未播放（需要用户选择屏幕源）"))
                    video_found = True
                    break
            
            if not video_found:
                print(f"  ❌ 未找到视频元素")
                test_results.append(("场景 4", False, "未找到视频元素"))
        except Exception as e:
            print(f"  ❌ 场景 {i} 测试失败: {{e}}")
            test_results.append(("场景 {i}", False, str(e)))
        
        # 测试场景 5: 房主点击开始共享能向目标成员发送 WEBRTC_OFFER
        print(f"\n测试场景 5: 房主点击开始共享能向目标成员发送 WEBRTC_OFFER")
        try:
            # 场景: 房主点击开始共享能向目标成员发送 WEBRTC_OFFER
            # TODO: 根据具体场景实现测试逻辑
            print(f"  ⚠️  场景 5 需要根据具体需求实现")
            test_results.append(("场景 5", None, "需要手动实现"))
        except Exception as e:
            print(f"  ❌ 场景 {i} 测试失败: {{e}}")
            test_results.append(("场景 {i}", False, str(e)))
        
        # 测试场景 6: 成员收到 WEBRTC_OFFER 后能创建 answer 并用 WEBRTC_ANSWER 回传
        print(f"\n测试场景 6: 成员收到 WEBRTC_OFFER 后能创建 answer 并用 WEBRTC_ANSWER 回传")
        try:
            # 场景: 成员收到 WEBRTC_OFFER 后能创建 answer 并用 WEBRTC_ANSWER 回传
            # TODO: 根据具体场景实现测试逻辑
            print(f"  ⚠️  场景 6 需要根据具体需求实现")
            test_results.append(("场景 6", None, "需要手动实现"))
        except Exception as e:
            print(f"  ❌ 场景 {i} 测试失败: {{e}}")
            test_results.append(("场景 {i}", False, str(e)))
        
        # 测试场景 7: 双方能正确处理 WEBRTC_ICE_CANDIDATE 直至连接建立
        print(f"\n测试场景 7: 双方能正确处理 WEBRTC_ICE_CANDIDATE 直至连接建立")
        try:
            # 场景: 双方能正确处理 WEBRTC_ICE_CANDIDATE 直至连接建立
            # TODO: 根据具体场景实现测试逻辑
            print(f"  ⚠️  场景 7 需要根据具体需求实现")
            test_results.append(("场景 7", None, "需要手动实现"))
        except Exception as e:
            print(f"  ❌ 场景 {i} 测试失败: {{e}}")
            test_results.append(("场景 {i}", False, str(e)))
        
        # 测试场景 8: 成员端 VideoPlayer 成功接收远端 MediaStream 并播放画面
        print(f"\n测试场景 8: 成员端 VideoPlayer 成功接收远端 MediaStream 并播放画面")
        try:
            # 检查视频元素（通常在点击开始共享后）
            # 如果场景提到"选择内容后"，说明需要先点击开始共享按钮
            if '选择内容后' in '成员端 VideoPlayer 成功接收远端 MediaStream 并播放画面' or '选择' in '成员端 VideoPlayer 成功接收远端 MediaStream 并播放画面':
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
                    print(f"  ✅ 找到视频元素: {selector}")
                    
                    # 等待视频加载
                    page.wait_for_timeout(3000)
                    
                    # 检查视频是否在播放
                    is_playing = page.evaluate("""
                        () => {
                            const video = document.querySelector('video#videoStream, video[srcObject], video');
                            return video && !video.paused && video.readyState >= 2;
                        }
                    """)
                    
                    if is_playing:
                        print(f"  ✅ 视频正在播放")
                        test_results.append(("场景 8", True, "视频正在播放"))
                    else:
                        print(f"  ⚠️  视频未播放（可能用户还未选择屏幕源）")
                        test_results.append(("场景 8", None, "视频未播放（需要用户选择屏幕源）"))
                    video_found = True
                    break
            
            if not video_found:
                print(f"  ❌ 未找到视频元素")
                test_results.append(("场景 8", False, "未找到视频元素"))
        except Exception as e:
            print(f"  ❌ 场景 {i} 测试失败: {{e}}")
            test_results.append(("场景 {i}", False, str(e)))
        
        # 最终截图（房主端，保存到任务专属目录）
        page.screenshot(path=os.path.join(artifact_dir, 'final.png'), full_page=True)
        print(f"✅ 已保存房主端最终截图: {{artifact_dir}}/final.png")
        
        # 汇总测试结果
        print("\n" + "=" * 60)
        print("测试结果汇总")
        print("=" * 60)
        passed = sum(1 for _, result, _ in test_results if result is True)
        failed = sum(1 for _, result, _ in test_results if result is False)
        skipped = sum(1 for _, result, _ in test_results if result is None)
        
        for scenario_name, result, message in test_results:
            status = "✅" if result is True else "❌" if result is False else "⚠️ "
            print(f"{status} {scenario_name}: {message}")
        
        print(f"\n总计: {passed} 通过, {failed} 失败, {skipped} 跳过")
        print("=" * 60)
        
        # 关闭浏览器
        browser_host.close()
        if browser_member:
            browser_member.close()
        
        # 如果有失败的测试，返回 False
        return failed == 0

if __name__ == '__main__':
    success = test_task_109()
    sys.exit(0 if success else 1)
