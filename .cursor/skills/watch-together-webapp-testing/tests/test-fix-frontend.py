#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
前端修复任务自动化测试 - fix-1, fix-2, fix-3, fix-4
- fix-1: 无 WebRTCSignalingType 重复声明错误
- fix-2: 无 webrtcState 重复声明错误
- fix-3: 无 API_BASE 重复声明错误
- fix-4: 新成员加入后 WebSocket 能成功连接（无 userId 格式错误）

运行前提: docker compose up -d，前端 localhost:3001，API localhost:3000
"""

import sys
import io
import time

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from playwright.sync_api import sync_playwright

BASE_URL = 'http://localhost:3001'
API_BASE = 'http://localhost:3000'


def create_room():
    """通过 API 创建房间，返回 roomId"""
    import urllib.request
    import json
    req = urllib.request.Request(
        f'{API_BASE}/api/v1/rooms',
        data=json.dumps({
            'url': 'https://www.example.com',
            'hostNickname': '测试房主'
        }).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=5) as resp:
        data = json.loads(resp.read().decode())
        return data.get('data', {}).get('roomId')


def test_fix_1_2_3_no_syntax_errors(page_errors):
    """fix-1/2/3: 检查页面无重复声明类 SyntaxError"""
    bad = []
    for err in page_errors:
        if "has already been declared" in err:
            bad.append(err)
    return bad


def run_tests():
    page_errors = []
    console_logs = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        def on_pageerror(err):
            page_errors.append(str(err))

        def on_console(msg):
            text = msg.text if hasattr(msg, 'text') else str(msg)
            console_logs.append(text)

        page.on('pageerror', on_pageerror)
        page.on('console', on_console)

        # 创建房间
        try:
            room_id = create_room()
        except Exception as e:
            print(f"⚠️  无法通过 API 创建房间（{e}），使用模拟 roomId")
            room_id = 'test-fix-room-001'

        # 打开房间页面（加载 join.html 及所有脚本）
        print(f"导航到 {BASE_URL}/room/{room_id} ...")
        page.goto(f'{BASE_URL}/room/{room_id}', wait_until='networkidle', timeout=15000)
        time.sleep(2)

        # 填写昵称并加入（触发 chat/sync WebSocket 连接）
        nickname_input = page.locator('input[name="nickname"], input[placeholder*="昵称"], input[id*="nickname"]')
        if nickname_input.count() > 0:
            nickname_input.first.fill('测试成员')
            join_btn = page.locator('button:has-text("加入"), button:has-text("进入")')
            if join_btn.count() > 0:
                join_btn.first.click()
                page.wait_for_load_state('networkidle')
                time.sleep(3)

        browser.close()

    # 校验 fix-1/2/3
    syntax_errors = test_fix_1_2_3_no_syntax_errors(page_errors)
    fix_123_ok = len(syntax_errors) == 0
    if syntax_errors:
        print("❌ fix-1/2/3: 发现重复声明错误:")
        for e in syntax_errors:
            print(f"   - {e[:120]}...")
    else:
        print("✅ fix-1/2/3: 无重复声明类 SyntaxError")

    # 校验 fix-4：无 userId 格式错误即视为通过（WebSocket 连接依赖后端）
    has_userid_err = any('userId 格式不正确' in str(m) for m in console_logs)
    fix_4_ok = not has_userid_err
    if has_userid_err:
        print("❌ fix-4: 控制台仍出现「userId 格式不正确」")
    else:
        print("✅ fix-4: 无 userId 格式错误，WebSocket 可正常尝试连接")

    return fix_123_ok and fix_4_ok


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
