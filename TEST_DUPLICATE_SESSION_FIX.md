# Test Plan: Duplicate Session Fix

## Issue
When logging out and logging back in, duplicate sessions appeared in the session list because logout didn't revoke the session in the database.

## Fix Implemented
- Backend: POST `/v1/auth/logout` endpoint now revokes session
- Frontend: `handleLogout()` calls backend before clearing localStorage

---

## Manual Testing Steps

### Prerequisites
- Backend running on `http://localhost:8080`
- Frontend running on `http://localhost:5173`
- PostgreSQL database accessible
- Two different browsers (e.g., Chrome and Firefox) OR one browser + one incognito window

### Test Scenario 1: Duplicate Session Prevention

**Step 1: Initial Login from Browser A**
1. Open **Chrome** browser
2. Navigate to `http://localhost:5173`
3. Login with valid credentials (e.g., admin/admin)
4. Note: Session #1 created in database

**Step 2: Login from Browser B**
1. Open **Firefox** browser (or Chrome Incognito)
2. Navigate to `http://localhost:5173`
3. Login with same credentials
4. Note: Session #2 created in database

**Step 3: Verify Both Sessions Active**
1. In **Firefox**, navigate to Profile → Sessionlar
2. **Expected**: See 2 active sessions
   - Current session (Firefox) with badge "Hozirgi session"
   - Other session (Chrome) without badge
3. **Actual**: _[Record what you see]_

**Step 4: Logout from Browser A**
1. In **Chrome**, click user dropdown → Chiqish
2. **Expected**:
   - Redirected to login page
   - Backend revokes Chrome's session in database
   - Session marked as `isActive = false`
3. **Actual**: _[Record what happens]_

**Step 5: Login Again from Browser A**
1. In **Chrome**, login with same credentials
2. Note: Session #3 created in database
3. Session #1 should be inactive (revoked in Step 4)

**Step 6: Verify No Duplicate Sessions (THE FIX)**
1. In **Firefox**, navigate to Profile → Sessionlar
2. Refresh the page or click on Sessionlar tab again
3. **Expected**: See exactly 2 active sessions
   - Current session (Firefox - Session #2)
   - Other session (Chrome - Session #3, newly created)
   - ❌ **NO** duplicate from old Chrome session (Session #1 - revoked)
4. **Actual**: _[Record what you see]_

**✅ PASS Criteria**: Only 2 sessions visible (not 3)
**❌ FAIL Criteria**: 3 sessions visible (duplicate from revoked session)

---

### Test Scenario 2: Session Cleanup in Database

**Verify in PostgreSQL:**

```sql
-- Connect to your database
\c shina_magazin_db

-- Check all sessions for your user (replace with actual user_id)
SELECT
    id,
    user_id,
    device_type,
    browser,
    is_active,
    revoked_at,
    revoke_reason,
    created_at
FROM sessions
WHERE user_id = 1  -- Replace with your user ID
ORDER BY created_at DESC;
```

**Expected Results:**
- Session #3 (Chrome, latest): `is_active = true`, `revoked_at = NULL`
- Session #2 (Firefox): `is_active = true`, `revoked_at = NULL`
- Session #1 (Chrome, old): `is_active = false`, `revoked_at = [timestamp]`, `revoke_reason = 'User logged out'`

---

### Test Scenario 3: Cross-Browser Session Revocation

**Step 1: From Firefox**
1. Navigate to Profile → Sessionlar
2. Click "Chiqish" button next to Chrome session (Session #3)

**Step 2: Verify Chrome Auto-Logout**
1. In **Chrome**, try to navigate to any protected page
2. Or wait up to 60 seconds (session monitor polling)
3. **Expected**: Chrome automatically logs out with message "Sessioningiz boshqa qurilmadan tugatilgan"

---

## Automated Backend Test

Run this curl command to test the logout endpoint:

```bash
# 1. Login to get token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}')

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')

echo "Access Token: ${ACCESS_TOKEN:0:50}..."

# 2. Verify session is active
VALIDATE_RESPONSE=$(curl -s -X GET http://localhost:8080/api/v1/sessions/validate \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Session valid before logout: $VALIDATE_RESPONSE"

# 3. Logout (should revoke session)
LOGOUT_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Logout response: $LOGOUT_RESPONSE"

# 4. Verify session is now invalid
VALIDATE_AFTER=$(curl -s -X GET http://localhost:8080/api/v1/sessions/validate \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Session valid after logout: $VALIDATE_AFTER"

# Expected: "valid": false
```

---

## Test Results Template

### Test Scenario 1: Duplicate Session Prevention
- [ ] **PASS** - Only 2 active sessions shown after logout and re-login
- [ ] **FAIL** - 3+ sessions shown (duplicate issue still exists)

**Notes:**
_[Add any observations here]_

---

### Test Scenario 2: Database Verification
- [ ] **PASS** - Revoked session has `is_active = false` and `revoked_at` timestamp
- [ ] **FAIL** - Session still active after logout

**SQL Query Results:**
```
_[Paste SQL results here]_
```

---

### Test Scenario 3: Cross-Browser Auto-Logout
- [ ] **PASS** - Chrome auto-logged out within 60 seconds
- [ ] **FAIL** - Chrome remained logged in

**Notes:**
_[Add any observations here]_

---

## Known Issues / Edge Cases

1. **Network Failure During Logout**: If backend API call fails, frontend still logs out (by design). This means session remains active in database but user is logged out on frontend. This is acceptable because:
   - Token expires after 24 hours anyway
   - Session cleanup job runs daily at 2 AM
   - User is still logged out on frontend for security

2. **Session Monitor Delay**: Auto-logout after remote revocation may take up to 60 seconds due to polling interval. This is acceptable for better performance.

---

## Success Criteria

All three test scenarios must pass:
- ✅ No duplicate sessions after logout and re-login
- ✅ Database shows revoked sessions correctly
- ✅ Cross-browser auto-logout works within 60 seconds

---

## Rollback Plan

If tests fail, revert commit:
```bash
git revert HEAD
git push
```

Then investigate:
1. Check backend logs: `tail -f logs/application.log`
2. Check browser console for errors
3. Check database session records with SQL query above
