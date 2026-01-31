#!/usr/bin/env bash
# 房间 REST API 自动化测试（需 docker compose up 后 localhost:3000 可用）
# 用法: ./scripts/test-rooms-api.sh [create|get|join|url|leave|all]
set -eu
[ -n "${BASH_VERSION:-}" ] && set -o pipefail
BASE="${API_BASE:-http://localhost:3000}"
MODE="${1:-all}"

# 等待 API 就绪（docker compose up -d 后服务可能尚未监听）
wait_for_api() {
  local max=15 interval=2
  while [ "$max" -gt 0 ]; do
    if curl -sf "$BASE/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$interval"
    max=$(( max - 1 ))
  done
  echo "Timeout waiting for API at $BASE" >&2
  return 1
}
wait_for_api

# 创建房间，返回 roomId 和 hostUserId
do_create() {
    local r
    r=$(curl -sf -X POST "$BASE/api/v1/rooms" -H "Content-Type: application/json" \
        -d '{"name":"t","hostNickname":"h","url":"https://example.com"}') || return 1
    echo "$r" | grep -q '"success":true' || (echo "create: success not true"; return 1)
    echo "$r" | python3 -c "
import sys,json
d=json.load(sys.stdin)['data']
print('ROOM_ID=' + (d.get('roomId') or d.get('id') or ''))
print('HOST_ID=' + (d.get('hostUserId') or d.get('hostId') or ''))
"
}

# GET 房间
do_get() {
    local room_id
    room_id=$(do_create | grep ROOM_ID= | cut -d= -f2)
    [[ -z "$room_id" ]] && return 1
    curl -sf "$BASE/api/v1/rooms/$room_id" | grep -q '"success":true' || (echo "get failed"; return 1)
}

# JOIN 房间（房主用 userId 关联）
do_join() {
    local room_id host_id j
    eval "$(do_create | grep -E '^ROOM_ID=|^HOST_ID=')"
    [[ -z "$ROOM_ID" || -z "$HOST_ID" ]] && return 1
    j=$(curl -sf -X POST "$BASE/api/v1/rooms/$ROOM_ID/join" -H "Content-Type: application/json" \
        -d "{\"nickname\":\"h\",\"userId\":\"$HOST_ID\"}") || return 1
    echo "$j" | grep -q '"success":true' || (echo "join failed"; return 1)
}

# PUT url
do_url() {
    local room_id host_id
    eval "$(do_create | grep -E '^ROOM_ID=|^HOST_ID=')"
    [[ -z "$ROOM_ID" || -z "$HOST_ID" ]] && return 1
    curl -sf -X PUT "$BASE/api/v1/rooms/$ROOM_ID/url" -H "Content-Type: application/json" \
        -d "{\"url\":\"https://example.com/2\",\"userId\":\"$HOST_ID\"}" | grep -q '"success":true' || return 1
}

# LEAVE（成员加入后离开）
do_leave() {
    local room_id j user_id
    eval "$(do_create | grep -E '^ROOM_ID=|^HOST_ID=')"
    j=$(curl -sf -X POST "$BASE/api/v1/rooms/$ROOM_ID/join" -H "Content-Type: application/json" \
        -d '{"nickname":"m1"}')
    user_id=$(echo "$j" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('userId',''))")
    [[ -z "$user_id" ]] && return 1
    curl -sf -X POST "$BASE/api/v1/rooms/$ROOM_ID/leave" -H "Content-Type: application/json" \
        -d "{\"userId\":\"$user_id\"}" | grep -q '"success":true' || return 1
}

case "$MODE" in
    create) do_create >/dev/null ;;
    get)    do_get ;;
    join)   do_join ;;
    url)    do_url ;;
    leave)  do_leave ;;
    all)
        do_create >/dev/null && do_get && do_join && do_url && do_leave
        ;;
    *) echo "Usage: $0 [create|get|join|url|leave|all]"; exit 1 ;;
esac
echo "OK"
