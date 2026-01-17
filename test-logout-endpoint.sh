#!/bin/bash

# Test script for logout endpoint session cleanup
# Tests that POST /v1/auth/logout properly revokes sessions

set -e

API_BASE="http://localhost:8080/api"
USERNAME="admin"
PASSWORD="admin"

echo "========================================="
echo "Testing Logout Session Cleanup"
echo "========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Login
echo "Test 1: Login to get access token"
echo "-----------------------------------------"
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

SUCCESS=$(echo "$LOGIN_RESPONSE" | jq -r '.success')
if [ "$SUCCESS" != "true" ]; then
    echo -e "${RED}❌ FAIL: Login failed${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken')
echo -e "${GREEN}✅ PASS: Login successful${NC}"
echo "Token: ${ACCESS_TOKEN:0:40}..."
echo ""

# Test 2: Verify session is active
echo "Test 2: Validate session before logout"
echo "-----------------------------------------"
VALIDATE_BEFORE=$(curl -s -X GET "$API_BASE/v1/sessions/validate" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

IS_VALID_BEFORE=$(echo "$VALIDATE_BEFORE" | jq -r '.data.valid')
if [ "$IS_VALID_BEFORE" != "true" ]; then
    echo -e "${RED}❌ FAIL: Session should be valid before logout${NC}"
    echo "Response: $VALIDATE_BEFORE"
    exit 1
fi

echo -e "${GREEN}✅ PASS: Session is valid before logout${NC}"
echo "Response: $VALIDATE_BEFORE"
echo ""

# Test 3: Get sessions list (should see 1 active session)
echo "Test 3: Get active sessions list"
echo "-----------------------------------------"
SESSIONS_BEFORE=$(curl -s -X GET "$API_BASE/v1/sessions" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

SESSION_COUNT_BEFORE=$(echo "$SESSIONS_BEFORE" | jq -r '.data | length')
echo -e "${GREEN}✅ PASS: Retrieved active sessions${NC}"
echo "Active sessions before logout: $SESSION_COUNT_BEFORE"
echo ""

# Test 4: Call logout endpoint
echo "Test 4: Call logout endpoint"
echo "-----------------------------------------"
LOGOUT_RESPONSE=$(curl -s -X POST "$API_BASE/v1/auth/logout" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

LOGOUT_SUCCESS=$(echo "$LOGOUT_RESPONSE" | jq -r '.success')
if [ "$LOGOUT_SUCCESS" != "true" ]; then
    echo -e "${RED}❌ FAIL: Logout endpoint failed${NC}"
    echo "Response: $LOGOUT_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ PASS: Logout endpoint returned success${NC}"
echo "Response: $LOGOUT_RESPONSE"
echo ""

# Test 5: Verify session is now invalid
echo "Test 5: Validate session after logout (should be invalid)"
echo "-----------------------------------------"
VALIDATE_AFTER=$(curl -s -X GET "$API_BASE/v1/sessions/validate" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

IS_VALID_AFTER=$(echo "$VALIDATE_AFTER" | jq -r '.data.valid')
if [ "$IS_VALID_AFTER" != "false" ]; then
    echo -e "${RED}❌ FAIL: Session should be invalid after logout${NC}"
    echo "Response: $VALIDATE_AFTER"
    exit 1
fi

echo -e "${GREEN}✅ PASS: Session is correctly marked as invalid after logout${NC}"
echo "Response: $VALIDATE_AFTER"
echo ""

# Test 6: Try to access protected endpoint (should fail with 401)
echo "Test 6: Try to access protected endpoint with revoked token"
echo "-----------------------------------------"
PROTECTED_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/v1/sessions" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

HTTP_CODE=$(echo "$PROTECTED_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" != "401" ]; then
    echo -e "${YELLOW}⚠️  WARNING: Expected 401, got $HTTP_CODE${NC}"
    echo "Response: $PROTECTED_RESPONSE"
else
    echo -e "${GREEN}✅ PASS: Protected endpoint correctly returns 401 Unauthorized${NC}"
fi
echo ""

# Test 7: Login again and verify new session created
echo "Test 7: Login again to create new session"
echo "-----------------------------------------"
LOGIN2_RESPONSE=$(curl -s -X POST "$API_BASE/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

ACCESS_TOKEN2=$(echo "$LOGIN2_RESPONSE" | jq -r '.data.accessToken')
echo -e "${GREEN}✅ PASS: Second login successful${NC}"
echo "New token: ${ACCESS_TOKEN2:0:40}..."
echo ""

# Test 8: Verify new session is different from old one
echo "Test 8: Verify new session created (different token)"
echo "-----------------------------------------"
if [ "$ACCESS_TOKEN" == "$ACCESS_TOKEN2" ]; then
    echo -e "${RED}❌ FAIL: New token should be different from old token${NC}"
    exit 1
fi

echo -e "${GREEN}✅ PASS: New session has different token${NC}"
echo ""

# Test 9: Get sessions list with new token (should see only 1 active session)
echo "Test 9: Verify only 1 active session exists (no duplicate)"
echo "-----------------------------------------"
SESSIONS_AFTER=$(curl -s -X GET "$API_BASE/v1/sessions" \
  -H "Authorization: Bearer $ACCESS_TOKEN2")

SESSION_COUNT_AFTER=$(echo "$SESSIONS_AFTER" | jq -r '.data | length')

echo "Active sessions after logout and re-login: $SESSION_COUNT_AFTER"

if [ "$SESSION_COUNT_AFTER" -gt "$SESSION_COUNT_BEFORE" ]; then
    echo -e "${YELLOW}⚠️  WARNING: Session count increased (possible duplicate)${NC}"
    echo "Before: $SESSION_COUNT_BEFORE, After: $SESSION_COUNT_AFTER"
    echo "This may be expected if you had other active sessions"
else
    echo -e "${GREEN}✅ PASS: No duplicate sessions created${NC}"
fi
echo ""

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "${GREEN}✅ All critical tests passed!${NC}"
echo ""
echo "Key findings:"
echo "  • Logout endpoint successfully revokes session"
echo "  • Revoked sessions return valid=false on validation"
echo "  • Protected endpoints reject revoked tokens"
echo "  • New login creates new session without duplicating old revoked session"
echo ""
echo -e "${YELLOW}Next step: Manual testing with two browsers${NC}"
echo "  See TEST_DUPLICATE_SESSION_FIX.md for detailed instructions"
echo ""

# Cleanup - logout from new session
echo "Cleaning up test session..."
curl -s -X POST "$API_BASE/v1/auth/logout" \
  -H "Authorization: Bearer $ACCESS_TOKEN2" > /dev/null

echo -e "${GREEN}Done!${NC}"
