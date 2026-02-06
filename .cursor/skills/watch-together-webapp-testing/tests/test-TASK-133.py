#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TASK-133 / backlog-133: 房间页顶部 overlay（返回、房主信息、观看人数）
测试场景:
1. 进入房间页，确认顶部有返回、房主/房间名、人数
2. 点击返回/关闭，确认可退出或返回
"""

import sys
import io
import os
import time

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from playwright.sync_api import sync_playwright


def test_task_133():
    artifact_dir = 'backlog/test-results/task-133'
    os.makedirs(artifact_dir, exist_ok=True)

    print("=" * 60)
    print("测试 TASK-133 房间页顶部 overlay")
    print("=" * 60)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        base = "http://localhost:3001"
        page.goto(base)
        page.wait_for_load_state("networkidle")
        time.sleep(1)

        # 创建房间
        if "/room/" not in page.url:
            form = page.locator("#createRoomForm")
            if form.count() > 0:
                page.fill("#roomName", "测试房间")
                page.fill("#targetUrl", "https://www.example.com")
                page.fill("#hostNickname", "测试房主")
                page.click('button[type="submit"]')
                page.wait_for_url("**/room/**", timeout=10000)
            else:
                print("未找到创建房间表单，跳过")
                browser.close()
                return 1

        room_url = page.url
        print("房间 URL:", room_url)
        time.sleep(1.5)

        # 场景 1: 确认顶部有返回、房主/房间名、人数
        overlay = page.locator("#roomTopOverlay")
        back_btn = page.locator("#roomOverlayBack")
        room_name_el = page.locator("#roomOverlayRoomName")
        member_count_el = page.locator("#roomOverlayMemberCount")

        if overlay.count() == 0:
            print("失败: 未找到顶部 overlay #roomTopOverlay")
            page.screenshot(path=os.path.join(artifact_dir, "no-overlay.png"))
            browser.close()
            return 1
        if back_btn.count() == 0:
            print("失败: 未找到返回按钮 #roomOverlayBack")
            browser.close()
            return 1
        if room_name_el.count() == 0:
            print("失败: 未找到房间名元素 #roomOverlayRoomName")
            browser.close()
            return 1
        if member_count_el.count() == 0:
            print("失败: 未找到人数元素 #roomOverlayMemberCount")
            browser.close()
            return 1

        room_name_text = room_name_el.text_content() or ""
        count_text = member_count_el.text_content() or ""
        print("通过 场景1: 顶部 overlay 含返回、房间名、人数")
        print("  房间名:", room_name_text, "| 人数:", count_text)
        page.screenshot(path=os.path.join(artifact_dir, "overlay-visible.png"))

        # 场景 2: 点击返回，确认可退出或返回
        back_btn.click()
        page.wait_for_load_state("networkidle")
        time.sleep(0.5)
        after_url = page.url
        if "/room/" in after_url and after_url == room_url:
            print("失败: 点击返回后仍在房间页")
            browser.close()
            return 1
        print("通过 场景2: 点击返回后已离开房间页，当前 URL:", after_url)

        browser.close()
    print()
    print("总计: 2 通过, 0 失败")
    print("测试通过")
    return 0


if __name__ == "__main__":
    sys.exit(test_task_133())
