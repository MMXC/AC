#!/usr/bin/env bash
# agent-browser 流程示例：先探查页面结构，再执行测试命令
# 用法: ./agent-browser-recon-and-test.sh [房间URL]
# 默认: http://localhost:3001/room/cml4sip6300002j2gcx5wwkf0
# 依赖: agent-browser 已安装且可执行（见 .cursor/skills/agent-browser/SKILL.md）

set -e
BASE_URL="${1:-http://localhost:3001/room/cml4sip6300002j2gcx5wwkf0}"
OUT_DIR="backlog/test-results/member-view-room"
mkdir -p "$OUT_DIR"

echo "===== 1. 打开页面 ====="
agent-browser open "$BASE_URL"

echo "===== 2. 等待加载 ====="
agent-browser wait --load networkidle

echo "===== 3. 探查可交互元素（snapshot）====="
agent-browser snapshot -i
# 根据上面输出的 ref（@e1, @e2...）和文案，在下方填写/点击加入等

echo "===== 4. 若有昵称/加入界面：按 snapshot 的 ref 填写并加入 ====="
# 示例（ref 需根据实际 snapshot 修改）:
# agent-browser find placeholder "昵称" fill "测试成员"
# agent-browser find role button click --name "加入房间"
# agent-browser wait 3000

echo "===== 5. 再次 snapshot（加入后页面）====="
agent-browser snapshot -i

echo "===== 6. 断言/取证：视频占位、控制台、错误 ====="
agent-browser get text "#videoPlaceholder" || true
agent-browser console || true
agent-browser errors || true

echo "===== 7. 截图 ====="
agent-browser screenshot "$OUT_DIR/agent-browser-member.png" --full

echo "===== 8. 关闭浏览器 ====="
agent-browser close

echo "完成。截图: $OUT_DIR/agent-browser-member.png"
