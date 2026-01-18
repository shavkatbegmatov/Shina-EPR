# Real-Time Logout Notification Test Plan

## 🎯 Test Maqsadi

WebSocket orqali real-time session notification ishlashini tekshirish:
- Bir qurilmadan logout qilganda
- Boshqa qurilmalarda **bir zumda** sessiya yo'qolishi kerak
- 60 soniya kutmaslik kerak!

---

## 🚀 Tayyorgarlik

### 1. Serverlarni Tekshirish

**Backend:**
```bash
# Terminal 1
cd shina-magazin-api
mvn spring-boot:run
```

**Frontend:**
```bash
# Terminal 2
cd shina-magazin-front
npm run dev
```

**URLs:**
- Frontend: http://localhost:5173
- Backend: http://localhost:8080

### 2. Ikkita Brauzer Tayyorlash

**Variant 1:** Chrome + Firefox
**Variant 2:** Chrome + Chrome Incognito
**Variant 3:** Firefox + Firefox Private Window

---

## 📋 Test Scenario 1: Basic Real-Time Logout

### Step 1: Browser A - Chrome

1. **Ochish:** http://localhost:5173
2. **Login:** `admin` / `admin`
3. **Console ochish:** F12 → Console
4. **Kuzatish:**
   ```
   [WebSocket] Connected
   ```
5. **Navigate:** Profile → Sessiyalar

**Expected:**
- 1 ta sessiya ko'rinadi (Chrome - current)
- Badge: "Hozirgi session" (yashil)

### Step 2: Browser B - Firefox

1. **Ochish:** http://localhost:5173
2. **Login:** `admin` / `admin`
3. **Console ochish:** F12 → Console
4. **Kuzatish:**
   ```
   [WebSocket] Connected
   ```
5. **Navigate:** Profile → Sessiyalar

**Expected:**
- 2 ta sessiya ko'rinadi:
  - Firefox (current) - yashil badge
  - Chrome (other) - badge yo'q

### Step 3: Real-Time Test - Chrome'da Logout

**Browser A (Chrome):**

1. **Logout qilish:** User dropdown → Chiqish
2. **Console kuzatish:**
   ```
   [WebSocket] Session update received: SESSION_REVOKED
   ```

**Browser B (Firefox) - DARHOL KUZATING:**

1. **Console kuzatish (1-2 soniya ichida):**
   ```
   [WebSocket] Session update received: SESSION_REVOKED
   [SessionsTab] Session update received: SESSION_REVOKED
   ```

2. **Toast notification paydo bo'ladi:**
   ```
   🔄 Sessiya yangilandi
   ```

3. **Sessiyalar ro'yxati avtomatik yangilanadi:**
   - Chrome sessiyasi **darhol yo'qoladi**
   - Faqat Firefox sessiyasi qoladi

**✅ PASS Criteria:**
- Chrome logout qilganda 1-3 soniya ichida Firefox'da yangilanish
- Toast notification paydo bo'lishi
- Qo'lda "Yangilash" bosmaslik kerak

**❌ FAIL Criteria:**
- 60 soniya kutish kerak bo'lsa
- Qo'lda yangilash kerak bo'lsa
- WebSocket notification kelmasa

---

## 📋 Test Scenario 2: Multiple Sessions Revocation

### Setup: 3 Brauzerdan Login

1. **Chrome:** Login
2. **Firefox:** Login
3. **Edge/Opera:** Login

**Firefox'da:** Profile → Sessiyalar
- 3 ta sessiya ko'rinishi kerak

### Test: "Barchasidan chiqish" Tugmasi

**Firefox'da:**

1. **Bosish:** "Barchasidan chiqish" tugmasi
2. **Tasdiqlash:** "Boshqa barcha qurilmalardan chiqmoqchimisiz?"
3. **Kuzatish:** Toast - "2 ta session tugatildi"

**Chrome va Edge/Opera - DARHOL:**

1. **Console:**
   ```
   [WebSocket] Session update received: SESSION_REVOKED
   ```

2. **Toast:**
   ```
   🔄 Sessiya yangilandi
   ```

3. **Sessiyalar sahifasi:** Avtomatik yangilangan
   - Faqat 1 sessiya qoladi (Firefox - hozirgi)

**✅ PASS:** Barcha boshqa brauzerlar darhol yangilandi

---

## 📋 Test Scenario 3: WebSocket Reconnection

### Test: Network Disconnect/Reconnect

**Browser (Chrome):**

1. **Login** va Profile → Sessiyalar
2. **DevTools:** Network tab → Offline rejim
3. **Kuzatish console:**
   ```
   [WebSocket] Disconnected
   ```
4. **Online rejimga qaytarish**
5. **Kuzatish (5 soniya ichida):**
   ```
   [WebSocket] Connected
   ```

**✅ PASS:** WebSocket avtomatik qayta ulanadi

---

## 📋 Test Scenario 4: Session List Auto-Refresh

### Test: New Login Detection

**Browser A (Chrome):** Profile → Sessiyalar (ochiq tursin)

**Browser B (Firefox):** Yangi login qilish

**Browser A - Kuzatish:**

1. **Console:**
   ```
   [WebSocket] Session update received: SESSION_CREATED
   ```

2. **Toast:**
   ```
   ✨ Yangi sessiya yaratildi
   ```

3. **Ro'yxat:** Avtomatik yangilanadi, yangi Firefox sessiyasi paydo bo'ladi

**✅ PASS:** Yangi login darhol ko'rinadi

---

## 🔍 Debug Checklist

Agar ishlamasa, quyidagilarni tekshiring:

### 1. WebSocket Connection

**Browser Console:**
```javascript
// Check WebSocket status
console.log('WebSocket connected:', window.WebSocket !== undefined);

// Check notification store
const { wsConnected } = useNotificationsStore.getState();
console.log('Notification store WS:', wsConnected);
```

**Expected:** `true`

### 2. Backend Logs

**Terminal (Backend):**
```
# Logout qilganda ko'rinishi kerak:
[WebSocket] Notifying user {userId} of session update: SESSION_REVOKED
Session update notification sent to user {userId}: SESSION_REVOKED
```

### 3. Frontend Event Listeners

**Browser Console:**
```javascript
// Check if session update listener registered
window.dispatchEvent(new CustomEvent('session-update', {
  detail: { type: 'SESSION_REVOKED', sessionId: 1, userId: 1, reason: 'test' }
}));
```

**Expected:** Toast notification va console log

### 4. Network Tab

**DevTools → Network → WS (WebSocket):**
- Connection: ws://localhost:5173/api/v1/ws
- Status: 101 Switching Protocols
- Messages: Ko'rish mumkin (Session update messages)

---

## 📊 Test Results Template

### Test Date: _______________
### Tester: _______________

| Test Scenario | Result | Notes |
|--------------|--------|-------|
| Basic Real-Time Logout | ☐ PASS ☐ FAIL | Delay: _____ seconds |
| Multiple Sessions Revocation | ☐ PASS ☐ FAIL | |
| WebSocket Reconnection | ☐ PASS ☐ FAIL | |
| New Login Detection | ☐ PASS ☐ FAIL | |

### WebSocket Status:
- Connection established: ☐ Yes ☐ No
- Messages received: ☐ Yes ☐ No
- Auto-reconnect works: ☐ Yes ☐ No

### Performance:
- Logout → Notification delay: _____ seconds
- Expected: < 3 seconds
- Actual: _____ seconds

### Issues Found:
```
_________________________________________________
_________________________________________________
_________________________________________________
```

---

## ✅ Success Criteria

All of these must be true:

1. ✅ WebSocket connects on page load
2. ✅ Logout notification arrives within 3 seconds
3. ✅ Toast shows "Sessiya yangilandi"
4. ✅ Sessions list auto-refreshes
5. ✅ No manual refresh needed
6. ✅ Works across multiple browsers
7. ✅ WebSocket auto-reconnects after network loss

---

## 🐛 Common Issues

### Issue 1: WebSocket Not Connecting

**Symptoms:** No "[WebSocket] Connected" in console

**Solutions:**
1. Check backend running on port 8080
2. Check CORS settings
3. Restart backend and frontend

### Issue 2: No Notification Received

**Symptoms:** Logout happens, no toast in other browser

**Solutions:**
1. Check backend logs for "Session update notification sent"
2. Verify userId matches in both sessions
3. Check browser console for errors

### Issue 3: Delayed Notification (>10 seconds)

**Symptoms:** Notification arrives but slowly

**Solutions:**
1. Check network latency
2. Verify WebSocket connection stable
3. Check backend not overloaded

---

## 🎬 Quick Test (30 Seconds)

**Fastest way to verify it works:**

1. Open 2 browsers (Chrome + Firefox)
2. Login both as `admin`
3. In Firefox: Profile → Sessiyalar
4. In Chrome: Logout
5. **Watch Firefox:** Toast + list update within 3 seconds

**✅ If works:** Real-time notification is working!
**❌ If doesn't:** Follow debug checklist above

---

## 📸 Expected Behavior

### Before Logout:
```
Firefox - Profile → Sessiyalar:
┌─────────────────────────────────┐
│ Faol sessiyalar (2)             │
├─────────────────────────────────┤
│ [✓] Firefox - Windows           │
│     Hozirgi session             │
├─────────────────────────────────┤
│ [•] Chrome - Windows            │
│     IP: 127.0.0.1               │
└─────────────────────────────────┘
```

### After Chrome Logout (1-3 seconds):
```
Firefox - Profile → Sessiyalar:
┌─────────────────────────────────┐
│ 🔄 Sessiya yangilandi (toast)  │
├─────────────────────────────────┤
│ Faol sessiyalar (1)             │
├─────────────────────────────────┤
│ [✓] Firefox - Windows           │
│     Hozirgi session             │
└─────────────────────────────────┘
Chrome session automatically removed!
```

---

**Good luck testing! 🚀**
