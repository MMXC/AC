#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试 TASK-126 / backlog-126: 成员加入房间后成员列表不实时更新

测试场景:
1. 房主进入房间，成员 A 加入；记录当前房主端与成员 A 端成员列表人数或昵称
2. 成员 B 加入同一房间
3. 在房主端与成员 A 端分别等待约 2 秒后检查成员列表
4. 断言房主端与成员 A 端成员列表均包含成员 B（或人数/昵称符合预期）
"""

import sys
import io
import re
import time
import os

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from playwright.sync_api import sync_playwright


def get_member_names_from_page(page):
    """从页面 #membersList 获取所有成员昵称（.member-name 文本）"""
    names = []
    try:
        list_el = page.locator('#membersList')
        if list_el.count() == 0:
            return names
        items = list_el.locator('li.member-item .member-name')
        for i in range(items.count()):
            names.append(items.nth(i).text_content() or '')
    except Exception:
        pass
    return names


def test_task_126():
    artifact_dir = 'backlog/test-results/task-126'
    os.makedirs(artifact_dir, exist_ok=True)

    print("=" * 60)
    print("测试 TASK-126 成员列表实时更新")
    print("=" * 60)

    with sync_playwright() as p:
        # 房主
        browser_host = p.chromium.launch(headless=True)
        context_host = browser_host.new_context()
        page_host = context_host.new_page()

        # 成员 A
        browser_member_a = p.chromium.launch(headless=True)
        context_member_a = browser_member_a.new_context()
        page_member_a = context_member_a.new_page()

        # 成员 B（稍后加入）
        browser_member_b = p.chromium.launch(headless=True)
        context_member_b = browser_member_b.new_context()
        page_member_b = context_member_b.new_page()

        try:
            # 1. 房主创建房间并进入
            print("\n导航到首页...")
            page_host.goto('http://localhost:3001')
            page_host.wait_for_load_state('networkidle')
            time.sleep(1)

            form = page_host.locator('#createRoomForm')
            if form.count() == 0:
                print("  ❌ 未找到创建房间表单")
                return False

            page_host.locator('#roomName, input[name="roomName"]').first.fill('测试房间')
            page_host.locator('#targetUrl, input[name="url"], input[type="url"]').first.fill('https://www.example.com')
            page_host.locator('#hostNickname, input[name="hostNickname"]').first.fill('测试房主')
            page_host.locator('#createBtn, button[type="submit"], button:has-text("创建房间")').first.click()
            page_host.wait_for_url('**/room/**', timeout=10000)
            page_host.wait_for_load_state('networkidle')
            time.sleep(5)

            room_id_match = re.search(r'/room/([^/?]+)', page_host.url)
            if not room_id_match:
                print("  ❌ 未从 URL 解析到房间 ID")
                return False
            room_id = room_id_match.group(1)
            print(f"  ✅ 房间 ID: {room_id}")

            # 2. 成员 A 加入
            print("\n成员 A 加入房间...")
            page_member_a.goto(f'http://localhost:3001/room/{room_id}')
            page_member_a.wait_for_load_state('networkidle')
            time.sleep(2)

            page_member_a.locator('input[name="nickname"], input[placeholder*="昵称"]').first.fill('成员A')
            page_member_a.locator('button:has-text("加入"), button:has-text("进入")').first.click()
            page_member_a.wait_for_load_state('networkidle')
            time.sleep(3)

            # 等待房主端与成员A端成员列表至少为 2（确保 WebSocket 推送已收到）
            try:
                page_host.wait_for_function(
                    "document.querySelectorAll('#membersList li.member-item .member-name').length >= 2",
                    timeout=8000
                )
            except Exception:
                pass
            time.sleep(1)

            # 记录房主端与成员 A 端当前成员列表（应为 2：房主 + 成员A）
            host_names_before = get_member_names_from_page(page_host)
            member_a_names_before = get_member_names_from_page(page_member_a)
            print(f"  房主端成员数（B 加入前）: {len(host_names_before)} {host_names_before}")
            print(f"  成员A端成员数（B 加入前）: {len(member_a_names_before)} {member_a_names_before}")

            # 3. 成员 B 加入
            print("\n成员 B 加入房间...")
            page_member_b.goto(f'http://localhost:3001/room/{room_id}')
            page_member_b.wait_for_load_state('networkidle')
            time.sleep(2)

            page_member_b.locator('input[name="nickname"], input[placeholder*="昵称"]').first.fill('成员B')
            page_member_b.locator('button:has-text("加入"), button:has-text("进入")').first.click()
            page_member_b.wait_for_load_state('networkidle')
            time.sleep(1)

            # 4. 等待房主端与成员A端成员列表出现「成员B」（最多等 8 秒）
            print("\n等待成员列表推送（房主与成员A端出现成员B）...")
            try:
                page_host.wait_for_function(
                    "Array.from(document.querySelectorAll('#membersList li.member-item .member-name')).some(el => el.textContent && el.textContent.includes('成员B'))",
                    timeout=8000
                )
            except Exception:
                pass
            try:
                page_member_a.wait_for_function(
                    "Array.from(document.querySelectorAll('#membersList li.member-item .member-name')).some(el => el.textContent && el.textContent.includes('成员B'))",
                    timeout=8000
                )
            except Exception:
                pass
            time.sleep(1)

            # 5. 断言房主端与成员 A 端成员列表均包含「成员B」
            host_names_after = get_member_names_from_page(page_host)
            member_a_names_after = get_member_names_from_page(page_member_a)

            print(f"  房主端成员（B 加入后）: {host_names_after}")
            print(f"  成员A端成员（B 加入后）: {member_a_names_after}")

            host_has_b = any('成员B' in n for n in host_names_after)
            member_a_has_b = any('成员B' in n for n in member_a_names_after)

            if host_has_b and member_a_has_b:
                print("\n  ✅ 房主端与成员A端成员列表均包含成员B")
            else:
                if not host_has_b:
                    print("\n  ❌ 房主端成员列表未包含成员B")
                if not member_a_has_b:
                    print("  ❌ 成员A端成员列表未包含成员B")

            # 可选：人数至少为 3
            host_count_ok = len(host_names_after) >= 3
            member_a_count_ok = len(member_a_names_after) >= 3
            if not host_count_ok:
                print(f"  ⚠️  房主端成员数 {len(host_names_after)} < 3")
            if not member_a_count_ok:
                print(f"  ⚠️  成员A端成员数 {len(member_a_names_after)} < 3")

            page_host.screenshot(path=os.path.join(artifact_dir, 'host-after-b-joined.png'), full_page=True)
            page_member_a.screenshot(path=os.path.join(artifact_dir, 'member-a-after-b-joined.png'), full_page=True)

            success = host_has_b and member_a_has_b
            return success

        finally:
            browser_host.close()
            browser_member_a.close()
            browser_member_b.close()


if __name__ == '__main__':
    success = test_task_126()
    sys.exit(0 if success else 1)
