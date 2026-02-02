#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
成员端查看房间页面
以成员身份打开指定房间 URL，填写昵称并加入，截图并输出页面关键信息。
用法: python member-view-room.py [房间URL]
默认: http://localhost:3001/room/cml4sip6300002j2gcx5wwkf0
"""

import sys
import io
import os
import re

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from playwright.sync_api import sync_playwright
import time

DEFAULT_ROOM_URL = "http://localhost:3001/room/cml4sip6300002j2gcx5wwkf0"
ARTIFACT_DIR = "backlog/test-results/member-view-room"


def member_view_room(room_url=DEFAULT_ROOM_URL):
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    print("=" * 60)
    print("成员端查看房间页面")
    print("=" * 60)
    print(f"房间 URL: {room_url}")
    print()

    with sync_playwright() as p:
        # 成员端：全新 context，无房主 localStorage
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # 先注册控制台与错误监听（便于分析问题，类似 agent-browser console/errors）
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page_errors = []
        page.on("pageerror", lambda err: page_errors.append(str(err)))

        print("导航到房间页...")
        page.goto(room_url, wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        # 若在昵称/加入界面，填写并加入
        nickname_input = page.locator(
            'input[name="nickname"], input[id*="nickname"], input[placeholder*="昵称"]'
        )
        join_btn = page.locator(
            'button:has-text("加入"), button:has-text("进入"), button:has-text("加入房间")'
        )
        if nickname_input.count() > 0 and join_btn.count() > 0:
            nickname_input.first.fill("测试成员")
            join_btn.first.click()
            print("已填写昵称并点击加入")
            page.wait_for_load_state("networkidle")
            time.sleep(3)

        # 提取房间 ID 用于截图命名
        room_id = "unknown"
        m = re.search(r"/room/([^/?]+)", page.url)
        if m:
            room_id = m.group(1)

        # 读取页面关键信息（类似 agent-browser snapshot / get text）
        info = []
        try:
            ph = page.locator("#videoPlaceholder")
            if ph.count() > 0:
                info.append("视频占位: " + ph.first.inner_text().strip().replace("\n", " "))
            room_el = page.locator("#roomInfo, #sidebarRoomId")
            if room_el.count() > 0:
                info.append("房间信息: " + room_el.first.inner_text().strip())
            msgs = page.locator("#chatMessages")
            if msgs.count() > 0:
                info.append("聊天区域可见: 是")
            # 检查 WebSocket 连接标记（chat.js 会设置）
            body = page.locator("body")
            if body.get_attribute("data-chat-ws-connected") == "true":
                info.append("WebSocket(聊天): 已连接")
            else:
                info.append("WebSocket(聊天): 未连接或未就绪")
        except Exception as e:
            info.append("读取信息异常: " + str(e))

        for line in info:
            print("  ", line)

        # 输出控制台与错误（便于分析问题）
        if console_logs:
            log_path = os.path.join(ARTIFACT_DIR, f"member-room-{room_id}-console.txt")
            with open(log_path, "w", encoding="utf-8") as f:
                f.write("\n".join(console_logs[-80:]))  # 最近 80 条
            print(f"  控制台日志已保存: {log_path} (最近 {min(80, len(console_logs))} 条)")
        if page_errors:
            print("  页面 JS 错误:", page_errors[:5])
            err_path = os.path.join(ARTIFACT_DIR, f"member-room-{room_id}-errors.txt")
            with open(err_path, "w", encoding="utf-8") as f:
                f.write("\n".join(page_errors))
            print(f"  错误详情已保存: {err_path}")

        # 截图
        path_before = os.path.join(ARTIFACT_DIR, f"member-room-{room_id}-full.png")
        page.screenshot(path=path_before, full_page=True)
        print(f"\n✅ 成员端全页截图已保存: {path_before}")

        browser.close()

    print("=" * 60)
    return path_before


if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_ROOM_URL
    member_view_room(url)
