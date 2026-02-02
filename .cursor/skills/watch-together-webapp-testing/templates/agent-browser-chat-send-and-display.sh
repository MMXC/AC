#!/usr/bin/env bash
# agent-browser 测试：聊天发送消息并显示（纯 agent-browser 命令，无 Python）
# 用法: ./agent-browser-chat-send-and-display.sh [房间URL]
# 默认: http://localhost:3001/room/cml4sip6300002j2gcx5wwkf0
# 依赖: agent-browser 已安装或可用 npx agent-browser（见 .cursor/skills/agent-browser/SKILL.md）

set -e
BASE_URL="${1:-http://localhost:3001/room/cml4sip6300002j2gcx5wwkf0}"
OUT_DIR="backlog/test-results/agent-browser-chat"
MSG="测试消息_agent_browser_$(date +%s)"
mkdir -p "$OUT_DIR"

# 优先用全局 agent-browser，否则用 npx
if command -v agent-browser &>/dev/null; then
  AB="agent-browser"
else
  AB="npx --yes agent-browser"
fi

echo "===== 1. 打开房间页 ====="
$AB open "$BASE_URL"

echo "===== 2. 等待加载 ====="
$AB wait --load networkidle

echo "===== 3. 若有昵称/加入界面：填写并加入 ====="
$AB find placeholder "昵称" fill "测试成员" 2>/dev/null || true
$AB find role button click --name "加入房间" 2>/dev/null || true
$AB wait 3000

echo "===== 4. 探查聊天区域（snapshot -i）====="
$AB snapshot -i

echo "===== 5. 在聊天框输入并发送 ====="
$AB fill "#chatInput" "$MSG"
$AB click "#chatSendButton"

echo "===== 6. 等待消息出现在消息区域 ====="
$AB wait 2000

echo "===== 7. 断言：消息区域应包含发送的内容 ====="
CHAT_TEXT=$($AB get text "#chatMessages" 2>/dev/null || echo "")
if echo "$CHAT_TEXT" | grep -q "$MSG"; then
  echo "✅ 聊天发送并显示：消息区域包含 \"$MSG\""
else
  echo "❌ 聊天显示失败：消息区域未包含 \"$MSG\""
  echo "消息区域内容（前 500 字）："
  echo "$CHAT_TEXT" | head -c 500
  exit 1
fi

echo "===== 8. 截图 ====="
$AB screenshot "$OUT_DIR/chat-send-display.png" --full

echo "===== 9. 关闭浏览器 ====="
$AB close

echo "完成。截图: $OUT_DIR/chat-send-display.png"
