#!/bin/bash

# 权限校验测试脚本
# 用于验证所有关键接口的权限校验是否正常工作

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
API_BASE="${API_BASE:-http://localhost:3001}"
API_URL="${API_BASE}/api/v1"

echo "=========================================="
echo "权限校验测试脚本"
echo "API URL: ${API_URL}"
echo "=========================================="
echo ""

# 测试结果计数器
PASSED=0
FAILED=0

# 测试函数
test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local expected_status="$5"
    local description="$6"
    
    echo -n "测试: ${name} ... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "${url}" 2>/dev/null || echo -e "\n000")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "${url}" \
            -H "Content-Type: application/json" \
            -d "${data}" 2>/dev/null || echo -e "\n000")
    elif [ "$method" = "PUT" ]; then
        response=$(curl -s -w "\n%{http_code}" -X PUT "${url}" \
            -H "Content-Type: application/json" \
            -d "${data}" 2>/dev/null || echo -e "\n000")
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X DELETE "${url}" 2>/dev/null || echo -e "\n000")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP ${http_code})"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (期望 HTTP ${expected_status}, 实际 HTTP ${http_code})"
        echo "  响应: ${body}"
        ((FAILED++))
        return 1
    fi
}

# 1. 创建房间（房主）
echo "=== 步骤 1: 创建房间（房主） ==="
CREATE_RESPONSE=$(curl -s -X POST "${API_URL}/rooms" \
    -H "Content-Type: application/json" \
    -d '{
        "hostNickname": "房主测试",
        "url": "https://www.example.com"
    }' 2>/dev/null)

if [ $? -ne 0 ] || [ -z "$CREATE_RESPONSE" ]; then
    echo -e "${RED}✗ 无法创建房间，请确保服务器正在运行${NC}"
    exit 1
fi

ROOM_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
HOST_USER_ID=$(echo "$CREATE_RESPONSE" | grep -o '"hostUserId":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$ROOM_ID" ] || [ -z "$HOST_USER_ID" ]; then
    echo -e "${RED}✗ 无法解析房间ID或房主ID${NC}"
    echo "响应: ${CREATE_RESPONSE}"
    exit 1
fi

echo -e "${GREEN}✓ 房间创建成功${NC}"
echo "  房间ID: ${ROOM_ID}"
echo "  房主ID: ${HOST_USER_ID}"
echo ""

# 2. 加入房间（普通成员）
echo "=== 步骤 2: 加入房间（普通成员） ==="
JOIN_RESPONSE=$(curl -s -X POST "${API_URL}/rooms/${ROOM_ID}/join" \
    -H "Content-Type: application/json" \
    -d '{
        "nickname": "普通成员测试"
    }' 2>/dev/null)

MEMBER_USER_ID=$(echo "$JOIN_RESPONSE" | grep -o '"userId":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$MEMBER_USER_ID" ]; then
    echo -e "${RED}✗ 无法加入房间${NC}"
    echo "响应: ${JOIN_RESPONSE}"
    exit 1
fi

echo -e "${GREEN}✓ 成员加入成功${NC}"
echo "  成员ID: ${MEMBER_USER_ID}"
echo ""

# 3. 测试更新 URL 接口（非房主应该被拒绝）
echo "=== 步骤 3: 测试更新 URL 接口权限校验 ==="
test_endpoint \
    "非房主更新URL（应被拒绝）" \
    "PUT" \
    "${API_URL}/rooms/${ROOM_ID}/url" \
    "{\"url\": \"https://www.example2.com\", \"userId\": \"${MEMBER_USER_ID}\"}" \
    "403" \
    "非房主尝试更新URL应该返回403"

test_endpoint \
    "房主更新URL（应成功）" \
    "PUT" \
    "${API_URL}/rooms/${ROOM_ID}/url" \
    "{\"url\": \"https://www.example2.com\", \"userId\": \"${HOST_USER_ID}\"}" \
    "200" \
    "房主更新URL应该返回200"

echo ""

# 4. 测试设置操作来源接口（非房主应该被拒绝）
echo "=== 步骤 4: 测试设置操作来源接口权限校验 ==="
test_endpoint \
    "非房主设置操作来源（应被拒绝）" \
    "POST" \
    "${API_URL}/rooms/${ROOM_ID}/operation-source" \
    "{\"userId\": \"${MEMBER_USER_ID}\", \"operationSourceUserId\": \"${MEMBER_USER_ID}\"}" \
    "403" \
    "非房主尝试设置操作来源应该返回403"

test_endpoint \
    "房主设置操作来源（应成功）" \
    "POST" \
    "${API_URL}/rooms/${ROOM_ID}/operation-source" \
    "{\"userId\": \"${HOST_USER_ID}\", \"operationSourceUserId\": \"${MEMBER_USER_ID}\"}" \
    "200" \
    "房主设置操作来源应该返回200"

echo ""

# 5. 测试伪造用户ID（使用不存在的用户ID）
echo "=== 步骤 5: 测试伪造用户ID ==="
FAKE_USER_ID="user-12345678"
test_endpoint \
    "使用不存在的用户ID更新URL（应被拒绝）" \
    "PUT" \
    "${API_URL}/rooms/${ROOM_ID}/url" \
    "{\"url\": \"https://www.example3.com\", \"userId\": \"${FAKE_USER_ID}\"}" \
    "404" \
    "使用不存在的用户ID应该返回404"

test_endpoint \
    "使用不存在的用户ID设置操作来源（应被拒绝）" \
    "POST" \
    "${API_URL}/rooms/${ROOM_ID}/operation-source" \
    "{\"userId\": \"${FAKE_USER_ID}\", \"operationSourceUserId\": \"${MEMBER_USER_ID}\"}" \
    "404" \
    "使用不存在的用户ID应该返回404"

echo ""

# 6. 测试使用其他房间的房主ID（跨房间攻击）
echo "=== 步骤 6: 测试跨房间攻击防护 ==="
# 创建第二个房间
CREATE_RESPONSE2=$(curl -s -X POST "${API_URL}/rooms" \
    -H "Content-Type: application/json" \
    -d '{
        "hostNickname": "房主2测试",
        "url": "https://www.example.com"
    }' 2>/dev/null)

ROOM_ID2=$(echo "$CREATE_RESPONSE2" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
HOST_USER_ID2=$(echo "$CREATE_RESPONSE2" | grep -o '"hostUserId":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$ROOM_ID2" ] && [ -n "$HOST_USER_ID2" ]; then
    test_endpoint \
        "使用其他房间的房主ID更新URL（应被拒绝）" \
        "PUT" \
        "${API_URL}/rooms/${ROOM_ID}/url" \
        "{\"url\": \"https://www.example4.com\", \"userId\": \"${HOST_USER_ID2}\"}" \
        "403" \
        "使用其他房间的房主ID应该返回403"
else
    echo -e "${YELLOW}⚠ 无法创建第二个房间，跳过跨房间攻击测试${NC}"
fi

echo ""

# 总结
echo "=========================================="
echo "测试总结"
echo "=========================================="
echo -e "${GREEN}通过: ${PASSED}${NC}"
echo -e "${RED}失败: ${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ 所有权限校验测试通过！${NC}"
    exit 0
else
    echo -e "${RED}✗ 部分测试失败，请检查权限校验实现${NC}"
    exit 1
fi
