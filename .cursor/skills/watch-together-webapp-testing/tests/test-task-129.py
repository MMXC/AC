#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试 backlog-129: 用户离开房间后服务端广播 MEMBER_LEFT 与前端列表移除
场景: 房主 + 成员 A + 成员 B → B 离开 → 房主端与成员 A 端成员列表不再包含 B
"""

import sys
import io
import os
import re
import time

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from playwright.sync_api import sync_playwright


def test_task_129():
    artifact_dir = os.path.join('backlog', 'test-results', 'task-129')
    os.makedirs(artifact_dir, exist_ok=True)

    print("=" * 60)
    print("测试 TASK-129 (MEMBER_LEFT 广播与成员列表移除)")
    print("=" * 60)

    with sync_playwright() as p:
        browser_host = p.chromium.launch(headless=True)
        context_host = browser_host.new_context()
        page_host = context_host.new_page()

        browser_a = p.chromium.launch(headless=True)
        context_a = browser_a.new_context()
        page_a = context_a.new_page()

        browser_b = p.chromium.launch(headless=True)
        context_b = browser_b.new_context()
        page_b = context_b.new_page()

        # 房主：创建房间
        page_host.goto('http://localhost:3001')
        page_host.wait_for_load_state('networkidle')
        time.sleep(1)

        if '/room/' not in page_host.url:
            form = page_host.locator('#createRoomForm')
            if form.count() > 0:
                page_host.locator('#roomName, input[name="roomName"]').first.fill('测试房间')
                page_host.locator('#targetUrl, input[name="url"], input[type="url"]').first.fill('https://www.example.com')
                page_host.locator('#hostNickname, input[name="hostNickname"]').first.fill('测试房主')
                page_host.locator('button:has-text("创建"), button[type="submit"]').first.click()
                page_host.wait_for_url('**/room/**', timeout=10000)
                page_host.wait_for_load_state('networkidle')
                time.sleep(2)

        room_match = re.search(r'/room/([^/?]+)', page_host.url)
        if not room_match:
            print("❌ 未获取到房间 ID")
            browser_host.close()
            browser_a.close()
            browser_b.close()
            return False
        room_id = room_match.group(1)
        print(f"✅ 房间 ID: {room_id}")

        base_url = f'http://localhost:3001/room/{room_id}'

        # 成员 A 加入
        page_a.goto(base_url)
        page_a.wait_for_load_state('networkidle')
        time.sleep(1)
        page_a.locator('input[name="nickname"], input[placeholder*="昵称"]').first.fill('成员A')
        page_a.locator('button:has-text("加入"), button:has-text("进入")').first.click()
        page_a.wait_for_load_state('networkidle')
        time.sleep(2)

        # 成员 B 加入
        page_b.goto(base_url)
        page_b.wait_for_load_state('networkidle')
        time.sleep(1)
        page_b.locator('input[name="nickname"], input[placeholder*="昵称"]').first.fill('成员B')
        page_b.locator('button:has-text("加入"), button:has-text("进入")').first.click()
        page_b.wait_for_load_state('networkidle')
        time.sleep(2)

        # 等待成员列表在房主端包含 A 和 B
        time.sleep(2)
        host_list_text = page_host.locator('#membersList').inner_text() if page_host.locator('#membersList').count() > 0 else ''
        if '成员A' not in host_list_text or '成员B' not in host_list_text:
            print("  ⚠️  房主端成员列表可能尚未刷新出 A/B，继续执行")

        # 成员 B 离开：关闭 B 的浏览器（模拟断开/关页）
        page_b.close()
        context_b.close()
        browser_b.close()
        time.sleep(2)

        # 约定时间内：房主端与成员 A 端成员列表不应再包含「成员B」
        time.sleep(2)

        passed = True

        # 房主端：成员列表不应包含「成员B」
        host_list = page_host.locator('#membersList').inner_text() if page_host.locator('#membersList').count() > 0 else ''
        if '成员B' in host_list:
            print("  ❌ 房主端成员列表仍包含「成员B」")
            passed = False
        else:
            print("  ✅ 房主端成员列表已不包含「成员B」")

        # 成员 A 端：成员列表不应包含「成员B」
        list_a = page_a.locator('#membersList').inner_text() if page_a.locator('#membersList').count() > 0 else ''
        if '成员B' in list_a:
            print("  ❌ 成员 A 端成员列表仍包含「成员B」")
            passed = False
        else:
            print("  ✅ 成员 A 端成员列表已不包含「成员B」")

        page_host.screenshot(path=os.path.join(artifact_dir, 'host-after-b-left.png'), full_page=True)
        page_a.screenshot(path=os.path.join(artifact_dir, 'member-a-after-b-left.png'), full_page=True)

        browser_host.close()
        browser_a.close()

        print("=" * 60)
        print("测试结果: " + ("通过" if passed else "失败"))
        print("=" * 60)
        return passed


if __name__ == '__main__':
    success = test_task_129()
    sys.exit(0 if success else 1)
