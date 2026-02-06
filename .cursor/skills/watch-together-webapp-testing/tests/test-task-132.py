#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
backlog-132 / 房间页主内容区全屏布局骨架 自动化测试
- 场景1: 房主或成员打开 join.html 进入房间，确认主内容区（iframe 区域）为视觉主体
- 场景2: 确认左侧无固定宽侧栏长期遮挡主内容

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


def run_tests():
    passed = 0
    failed = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        try:
            room_id = create_room()
        except Exception as e:
            print(f"⚠️  无法通过 API 创建房间（{e}），使用模拟 roomId")
            room_id = 'test-layout-room-001'

        print(f"导航到 {BASE_URL}/room/{room_id} ...")
        page.goto(f'{BASE_URL}/room/{room_id}', wait_until='networkidle', timeout=15000)
        time.sleep(1)

        # 若有昵称/加入表单则填写并加入
        nickname_input = page.locator('input[id="nicknameInput"], input[placeholder*="昵称"]')
        if nickname_input.count() > 0:
            nickname_input.first.fill('测试成员')
            join_btn = page.locator('button:has-text("加入房间"), button:has-text("加入")')
            if join_btn.count() > 0:
                join_btn.first.click()
                page.wait_for_load_state('networkidle')
                time.sleep(1)

        # 场景1: 主内容区（.browser-area）为视觉主体，宽度 >= 80% 视口
        browser_area = page.locator('.browser-area')
        if browser_area.count() == 0:
            print("❌ 场景1: 未找到 .browser-area")
            failed += 1
        else:
            width_ok = page.evaluate("""() => {
                const el = document.querySelector('.browser-area');
                if (!el) return false;
                const r = el.getBoundingClientRect();
                const vw = window.innerWidth;
                return r.width >= vw * 0.8;
            }""")
            if width_ok:
                print("✅ 场景1: 主内容区 .browser-area 占据主要可视区域（宽度 ≥80% 视口）")
                passed += 1
            else:
                print("❌ 场景1: 主内容区宽度不足视口 80%")
                failed += 1

        # 场景2: 左侧无固定宽侧栏长期遮挡 — 侧栏默认收起（left < 0 或不可见）
        sidebar_ok = page.evaluate("""() => {
            const sidebar = document.querySelector('.sidebar');
            if (!sidebar) return true;
            const left = parseFloat(getComputedStyle(sidebar).left);
            const hasOpen = sidebar.classList.contains('open');
            return !hasOpen && left < 0;
        }""")
        if sidebar_ok:
            print("✅ 场景2: 左侧边栏默认收起，无固定宽侧栏遮挡主内容")
            passed += 1
        else:
            print("❌ 场景2: 侧栏未默认收起或仍占据左侧固定宽度")
            failed += 1

        browser.close()

    print("\n总计: %d 通过, %d 失败" % (passed, failed))
    return failed == 0


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
