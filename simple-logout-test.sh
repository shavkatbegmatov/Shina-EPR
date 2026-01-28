#!/bin/bash
# Simple logout endpoint test without jq dependency

API_BASE="http://localhost:8080/api"

echo "========================================="
echo "Testing Logout Session Cleanup"
echo "========================================="
echo ""

# Test 1: Login
echo "1. Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}')

echo "Login response:"
echo "$LOGIN_RESPONSE"
echo ""

# Extract token (simple grep/sed approach)
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ FAIL: Could not extract access token"
    exit 1
fi

echo "✅ Access token extracted: ${ACCESS_TOKEN:0:40}..."
echo ""

# Test 2: Validate session before logout
echo "2. Validate session BEFORE logout..."
VALIDATE_BEFORE=$(curl -s -X GET "$API_BASE/v1/sessions/validate" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$VALIDATE_BEFORE"
echo ""

# Test 3: Call logout
echo "3. Calling logout endpoint..."
LOGOUT_RESPONSE=$(curl -s -X POST "$API_BASE/v1/auth/logout" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$LOGOUT_RESPONSE"
echo ""

# Test 4: Validate session after logout
echo "4. Validate session AFTER logout (should be invalid)..."
VALIDATE_AFTER=$(curl -s -X GET "$API_BASE/v1/sessions/validate" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$VALIDATE_AFTER"
echo ""

# Check if validation shows false
if echo "$VALIDATE_AFTER" | grep -q '"valid":false'; then
    echo "✅ SUCCESS: Session correctly invalidated after logout"
    echo "   The logout endpoint is working properly!"
else
    echo "❌ FAIL: Session still valid after logout"
    echo "   Expected: \"valid\":false"
    echo "   Got: $VALIDATE_AFTER"
    exit 1
fi

echo ""
echo "========================================="
echo "✅ Automated Test PASSED"
echo "========================================="
echo ""
echo "Next step: Manual testing with two browsers"
echo "  1. Open Chrome and Firefox"
echo "  2. Login from both browsers"
echo "  3. Logout from Chrome"
echo "  4. Login again from Chrome"
echo "  5. Check Firefox → Profile → Sessionlar"
echo "  6. Should see only 2 sessions (not 3)"
echo ""
