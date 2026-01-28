# Quick Test Guide: Duplicate Session Fix

## 🎯 What We're Testing
**Problem**: Logout didn't clean up sessions in database, causing duplicates to appear.
**Fix**: Backend now revokes session when user logs out.

---

## 📋 Quick Test (5 minutes)

### Step 1: Start Servers
```bash
# Terminal 1: Backend
cd shina-magazin-api
mvn spring-boot:run

# Terminal 2: Frontend
cd shina-magazin-front
npm run dev
```

### Step 2: Two-Browser Test

#### **Browser A (Chrome):**
1. Open `http://localhost:5173`
2. Login with `admin` / `admin`
3. Go to **Profile → Sessionlar**
4. See **1 session** (current)

#### **Browser B (Firefox or Incognito):**
1. Open `http://localhost:5173`
2. Login with `admin` / `admin`
3. Go to **Profile → Sessionlar**
4. See **2 sessions** (current + Chrome)

### Step 3: Test Logout Cleanup

#### **Back to Browser A (Chrome):**
1. Click **User Dropdown → Chiqish**
2. Should redirect to login page

#### **Browser B (Firefox):**
1. Refresh **Profile → Sessionlar**
2. Should see **1 session** (only Firefox now)
3. Chrome session should be GONE (revoked)

### Step 4: Test No Duplicates

#### **Browser A (Chrome):**
1. Login again with `admin` / `admin`
2. Go to **Profile → Sessionlar**
3. See **1 session** (current)

#### **Browser B (Firefox):**
1. Go to **Profile → Sessionlar**
2. **✅ EXPECTED**: See **2 sessions**
   - Current (Firefox)
   - Other (Chrome - new session)
3. **❌ FAIL**: If you see **3+ sessions**, the fix didn't work

---

## 🔍 What to Look For

### ✅ **PASS** Signs:
- After logout from Chrome, its session disappears from Firefox's list
- After re-login from Chrome, only 2 total sessions visible (not 3)
- Each session shows correct device/browser info
- Current session has green "Hozirgi session" badge

### ❌ **FAIL** Signs:
- Old revoked Chrome session still appears in list
- After re-login, see 3+ sessions
- Sessions don't disappear after logout

---

## 🗄️ Database Verification (Optional)

If you want to check the database directly:

```bash
# Connect to PostgreSQL
psql -U postgres -d shina_magazin_db

# Check sessions for user ID 1 (admin)
SELECT
    id,
    browser,
    is_active,
    revoked_at,
    created_at
FROM sessions
WHERE user_id = 1
ORDER BY created_at DESC
LIMIT 5;
```

**What to expect:**
- Recent sessions: `is_active = true`, `revoked_at = null`
- Logged out sessions: `is_active = false`, `revoked_at = [timestamp]`

---

## 🐛 Troubleshooting

**Issue**: Sessions not showing up at all
- Check backend is running on `http://localhost:8080`
- Check browser console for errors (F12)
- Verify login successful

**Issue**: Can't access Profile → Sessionlar
- Make sure you're logged in as staff user (not customer)
- Check permissions (ADMIN, MANAGER, or SELLER role)

**Issue**: Backend errors in console
- Check backend logs: `tail -f logs/application.log`
- Verify database is running
- Check SessionService and AuthController for errors

---

## 📸 Expected Behavior

### Before Fix:
```
Login → Logout → Login again → See duplicate session ❌
```

### After Fix:
```
Login → Logout (backend revokes) → Login again → No duplicate ✅
```

---

## ✅ Success Criteria

All of these must be true:
1. ✅ Logout removes session from other browsers' lists
2. ✅ Re-login shows only 1 new session (not duplicate)
3. ✅ Database shows `is_active = false` for revoked sessions
4. ✅ Revoked sessions have `revoke_reason = 'User logged out'`

---

## 📊 Test Results

**Date**: _______________
**Tester**: _______________

- [ ] **Test 1**: Session disappears after logout
- [ ] **Test 2**: No duplicate after re-login
- [ ] **Test 3**: Database shows correct revocation
- [ ] **Test 4**: Cross-browser auto-logout works

**Overall**: ✅ PASS / ❌ FAIL

**Notes**:
_______________________________________________
_______________________________________________
_______________________________________________
