# Mantiqiy xatolar auditi

**Sana:** 2026-08-05
**Metodika:** 6 ta soha bo'yicha parallel qidiruv (auth-security, money-stock, telegram-demo, db-consistency, front-data, front-ui) + eng jiddiy topilmalarni adversarial tekshirish (har bir topilmani mustaqil agent rad etishga harakat qildi, faqat rad etib bo'lmaganlari "tasdiqlangan" deb belgilandi).
**Natija:** 28 topilma. 9 tasi tekshiruvga yuborildi — **9 tasi ham tasdiqlandi, birortasi rad etilmadi**. Takrorlarni birlashtirganda 5 ta mustaqil bug klasteri.

---

## Tavsiya etilgan tuzatish tartibi

| # | Klaster | Sabab |
|---|---|---|
| 1 | [№3 — Fantom qarz](#3-qaytarishbekor-qilishda-debt-yozuvi-yangilanmaydi--fantom-qarz-va-ikki-marta-pul-undirish) | Bevosita pul yo'qotish: mijozdan qaytarilgan tovar uchun pul undiriladi |
| 2 | [№4 — Z-hisobot](#4-z-hisobot-naqd-qaytarimni-ikki-marta-ayiradi--kassa-nazorati-ishlamaydi) | Kassadan o'g'irlik aniqlanmaydigan bo'lib qoladi |
| 3 | [№2 — Deaktivatsiya](#2-ishdan-bo'shatilgan-xodim-24-soatgacha-to'liq-erp-kirishini-saqlab-qoladi) | Xavfsizlik: bo'shatilgan xodim kirishda davom etadi |
| 4 | [№1 — Refresh token](#1-refresh-token-mexanizmi-butunlay-ishlamaydi--xodimlar-har-24-soatda-tizimdan-qulflanadi) | Har kuni har bir xodimga ta'sir qiladi (UX + o'lik kod) |
| 5 | [№5 — Ikki marta ombor tiklash](#5-qaytarimdan-keyin-sotuvni-bekor-qilish-omborni-ikki-marta-to'ldiradi) | Ombor hisobining buzilishi |

---

# TASDIQLANGAN XATOLAR (severity: HIGH)

## 1. Refresh-token mexanizmi butunlay ishlamaydi — xodimlar har 24 soatda tizimdan "qulflanadi"

- [ ] Tuzatildi

**Fayllar:**
- `shina-magazin-api/src/main/java/uz/shinamagazin/api/service/AuthService.java:139-164` (`refreshToken`)
- `shina-magazin-api/src/main/java/uz/shinamagazin/api/security/JwtAuthenticationFilter.java:47-54`
- `shina-magazin-api/src/main/java/uz/shinamagazin/api/service/SessionService.java:152-157` (`isSessionValid`)
- `shina-magazin-front/src/api/axios.ts:34-51` (401 interceptor)

**Muammo:** `AuthService.refreshToken()` yangi access token yaratadi, lekin `sessionService.createSession` ni hech qachon chaqirmaydi — u butun API bo'ylab faqat `AuthService.login:85` da chaqiriladi. `JwtAuthenticationFilter` esa har bir staff (non-CUSTOMER) token uchun SHA-256 hash bo'yicha faol session qatorini talab qiladi. Demak `/v1/auth/refresh-token` bergan **har bir token filter tomonidan avtomatik rad etiladi** ("JWT is valid but session has been revoked"). `application.yml` dagi 7 kunlik `refresh-expiration: 604800000` — o'lik kod.

**Ssenariy:** kassir dushanba 09:00 da kiradi (jwt.expiration = 24h). Seshanba 09:01 da istalgan amal 401 qaytaradi → frontend refresh qiladi (200 OK, endpoint stateless) → retry yana 401. Tekshiruvchi aniqlagan qo'shimcha detal: retry `_retry=true` bilan ketadi va `api(originalRequest)` await'siz qaytarilgani uchun logout/redirect **ham ishlamaydi** — ilova "kirgan" ko'rinishda qotib qoladi, har bir amal yana bitta foydasiz token juftini yaratadi (o'z-o'zini yangilaydigan 7 kunlik refresh token). Foydalanuvchi qo'lda logout/login qilmaguncha ilova ishlamaydi.

**Tekshiruvchi xulosasi:** TASDIQLANDI. Hech qanday guard yo'q, staff refresh uchun birorta test yo'q. Customer portal ta'sirlanmaydi (customer tokenlar session tekshiruvini chetlab o'tadi).

**Tuzatish yo'nalishi:** `refreshToken` ichida eski sessionni bekor qilib, yangi access token uchun `createSession` chaqirish; refresh tokenda `user.getActive()` tekshiruvini ham qo'shish (№2 bilan bog'liq).

---

## 2. Ishdan bo'shatilgan xodim 24 soatgacha to'liq ERP kirishini saqlab qoladi

- [ ] Tuzatildi

**Fayllar:**
- `shina-magazin-api/src/main/java/uz/shinamagazin/api/service/UserService.java:322-341` (`deactivateUser`)
- `shina-magazin-api/src/main/java/uz/shinamagazin/api/security/JwtAuthenticationFilter.java:47-78`
- `shina-magazin-api/src/main/java/uz/shinamagazin/api/security/CustomUserDetails.java:89-101`

**Muammo:** `deactivateUser` faqat `user.active=false` qiladi va audit log yozadi — `revokeSessions` ni chaqirmaydi (solishtiring: `changePassword:261` va `resetPassword:294` chaqiradi). Filter esa `user.active` ni umuman tekshirmaydi: `CustomUserDetails.isEnabled()/isAccountNonLocked()` login'dagi `DaoAuthenticationProvider` dan tashqarida hech qayerda chaqirilmaydi. `UserRepository.findByUsernameWithRolesAndPermissions` da active filtri yo'q, `PermissionRepository.findByUserId` faqat `role.isActive` ni filtrlaydi — deaktivatsiya qilingan foydalanuvchi `PermissionAspect` orqali ham barcha ruxsatlarini saqlab qoladi.

**Ssenariy:** xodim 10:00 da bo'shatiladi, admin darhol deaktivatsiya qiladi. Xodim 09:30 da login qilgan edi — tokeni ertasi kuni 09:30 gacha barcha rollari bilan ishlashda davom etadi (sotuvlar, qarzlar, mijozlar ma'lumoti). Boshqa foydalanuvchi sessiyasini bekor qiladigan admin endpoint yo'q (`SessionController` faqat self-service) — yagona vosita parolni reset qilish.

**Tekshiruvchi xulosasi:** TASDIQLANDI. Bir kichik aniqlik: refresh qilingan token session qatori yo'qligi uchun (№1) REST kirishni 7 kunga uzaytirmaydi, lekin session tekshirmaydigan WebSocket `JwtChannelInterceptor` dan o'tadi va refresh javobi user/permission ma'lumotini oshkor qiladi.

**Tuzatish yo'nalishi:** `deactivateUser` ichida `sessionService.revokeSessions(userId)` chaqirish; filterda (yoki `isSessionValid` da) `user.active` tekshiruvi; `refreshToken` da ham active tekshiruvi.

---

## 3. Qaytarish/bekor qilishda Debt yozuvi yangilanmaydi — fantom qarz va ikki marta pul undirish

- [ ] Tuzatildi

**Fayllar:**
- `shina-magazin-api/src/main/java/uz/shinamagazin/api/service/SaleReturnService.java:132-150` (`createReturn`)
- `shina-magazin-api/src/main/java/uz/shinamagazin/api/service/SaleService.java:283-288` (`cancelSale`, `// Cancel related debts` kommenti)
- `shina-magazin-api/src/main/java/uz/shinamagazin/api/service/SaleService.java:226-245` (`createSale` — Debt yaratadi)
- `shina-magazin-api/src/main/java/uz/shinamagazin/api/service/DebtService.java:102-163` (`makePayment`)

**Muammo:** nasiya sotuv qaytarilganda `createReturn` `sale.debtAmount` ni kamaytiradi va `customer.balance` ni tiklaydi, lekin `createSale` yaratgan **`debts` qatoriga tegmaydi** — `SaleReturnService` da `DebtRepository` umuman inject qilinmagan. `cancelSale` dagi "Cancel related debts" kommenti ostida esa faqat `customer.setBalance(...)` bor; `debtRepository` inject qilingan, lekin ishlatilmagan. Grep butun API bo'ylab tasdiqladi: Debt yozuvlari faqat `createSale:240` va `DebtService.makePayment:163` da o'zgartiriladi. `DebtStatus` da CANCELLED qiymati ham yo'q (faqat ACTIVE/PAID/OVERDUE).

**Ssenariy:** mijoz 2 000 000 so'mlik shinani to'liq nasiyaga oladi (Debt ACTIVE, remaining 2 000 000). Hammasini qaytaradi: `sale.debtAmount=0`, balans tiklandi — mijoz hech narsa qarz emas. Lekin:
- Qarzdorlar ro'yxati, dashboard (`getTotalActiveDebt`), `DebtsReport` — 2 mln "faol qarz" ko'rsatishda davom etadi;
- `DebtReminderScheduler:45/82` mijozga eslatma yuborishda davom etadi;
- Kassir bu "qarz"ni qabul qilsa — `makePayment` faqat `debt.remainingAmount` va `status != PAID` ni tekshiradi, **sale statusini tekshirmaydi** — to'lov o'tadi: Debt PAID bo'ladi, `customer.balance` +2 mln fantom kredit, `sale.debtAmount` −2 mln, REFUNDED sotuvning `paidAmount/paymentStatus` PAID ga o'zgaradi. Do'kon qaytarib olingan tovar uchun naqd pul oladi.

Xuddi shu holat bekor qilingan (CANCELLED) sotuv uchun ham: 1 500 000 nasiya sotuv bekor qilinadi, ombor tiklanadi, balans nolga qaytadi — lekin Debt ACTIVE 1 500 000 bilan qoladi va "undirish" mumkin. `DebtResponse` sale statusini ko'rsatmaydi — xodim bu qarzlarni farqlay olmaydi.

**Tekshiruvchi xulosasi:** ikkala yo'l (return va cancel) alohida-alohida TASDIQLANDI. `SaleReturnServiceTest` faqat `sale.debtAmount` ni tekshiradi, Debt qatorini emas. DB constraint ham yo'q.

**Tuzatish yo'nalishi:** return/cancel'da tegishli Debt(lar)ni topib `remainingAmount` ni kamaytirish yoki bekor qilish (ehtimol `DebtStatus.CANCELLED` qo'shish); `makePayment` da bog'liq sale statusini tekshirish.

---

## 4. Z-hisobot naqd qaytarimni IKKI MARTA ayiradi — kassa nazorati ishlamaydi

- [ ] Tuzatildi

**Fayllar:**
- `shina-magazin-api/src/main/java/uz/shinamagazin/api/service/CashShiftService.java:149-172` (`buildReport`)
- `shina-magazin-api/src/main/java/uz/shinamagazin/api/service/SaleReturnService.java:148-150` (`sale.setPaidAmount(paidAmount - cashRefunded)`)
- `shina-magazin-api/src/main/resources/...` `CashShiftRepository.summarizeByPaymentMethod`, `SaleReturnRepository.sumCashRefundedByShift`
- `shina-magazin-api/src/main/java/uz/shinamagazin/api/service/ReportService.java:92-93` (paidAmount "already clean of returns" kommenti)

**Muammo:** `buildReport` `cashReceived` ni CASH sotuvlar bo'yicha `SUM(sale.paidAmount)` sifatida hisoblaydi, keyin ustiga yana `sumCashRefundedByShift` ni ayiradi. Lekin `createReturn` allaqachon `sale.paidAmount` dan qaytarimni ayirgan. Bir smenada naqd sotuv + naqd qaytarim bo'lsa, qaytarim `expectedCash` dan **ikki marta** ayiriladi. (`ReportService:92-93` mutatsiya atayin ekanini hujjatlaydi — cross-shift to'g'rilik uchun — shu sabab same-shift holati e'tibordan chetda qolgan.)

**Ssenariy:** smena 0 float bilan ochiladi. 500 000 naqd sotuv, bir soatdan keyin to'liq qaytarim — kassadan 500 000 qaytarildi. Fizik kassa = 0. Z-hisobot: `cashReceived = 0` (allaqachon kamaygan paidAmount), minus `cashRefunded 500 000` → `expectedCash = −500 000`. Halol sanoq 0 → "+500 000 ortiqcha" ko'rinadi; **insofsiz kassir 500 000 o'zlashtirib, farqni ideal nolga keltiradi** — smena-kamomad nazorati aynan u tekshirishi kerak bo'lgan shaxs tomonidan aylanib o'tiladi.

**Tekshiruvchi xulosasi:** TASDIQLANDI. `summarizeByPaymentMethod` faqat CANCELLED'ni chiqarib tashlaydi — REFUNDED sotuv kamaygan paidAmount bilan qoladi. Return normal POS oqimida o'sha smenaga bog'lanadi (`findOpenShift(userId)`). Mavjud `CashShiftReportTest.cashRefundReducesExpectedCash` testi bugni **yashiradi**: u SaleReturn'ni service'siz, repository orqali paidAmount mutatsiyasisiz quradi (testda 100k+500k−150k=450k o'tadi; real service orqali 100k+350k−150k=300k bo'lardi). Debt-only refund va CARD-sotuvdan naqd qaytarim to'g'ri (bir marta) hisoblanadi — bug faqat CASH/same-shift holatiga xos.

**Tuzatish yo'nalishi:** yo `paidAmount` mutatsiyasini bekor qilib hisob-kitobni har doim qaytarimlar bilan qilish, yoki Z-hisobotda `cashRefunded` ni faqat boshqa smenadagi sotuvlarning qaytarimlari uchun ayirish. Testni real service oqimi orqali qayta yozish.

---

## 5. Qaytarimdan keyin sotuvni bekor qilish omborni IKKI MARTA to'ldiradi

- [ ] Tuzatildi

**Fayllar:**
- `shina-magazin-api/src/main/java/uz/shinamagazin/api/service/SaleService.java:250-292` (`cancelSale`, guard faqat 255-qatorda)
- `shina-magazin-api/src/main/java/uz/shinamagazin/api/service/SaleReturnService.java:205-221` (`restoreStock`)
- `shina-magazin-front/src/pages/sales/SalesPage.tsx:266-271, 472-477` (cancel tugmasi COMPLETED da ko'rinadi)

**Muammo:** `cancelSale` ning yagona holat tekshiruvi — `sale.getStatus() == SaleStatus.CANCELLED`. Qisman qaytarilgan sotuv COMPLETED bo'lib qoladi, to'liq qaytarilgani REFUNDED — ikkalasi ham guard'dan o'tadi. Keyin 262-281 qatorlar **to'liq asl miqdorni** qayta omborga qo'shadi, `SaleReturnRepository.returnedQuantitiesBySale` bilan solishtirmaydi (return oqimi over-return'ni oldini olish uchun aynan shu so'rovni ishlatadi!). Teskari guard bor (`createReturn` CANCELLED'ni rad etadi, testi ham bor) — lekin cancel tomoni himoyasiz.

**Ssenariy:** 4 shina sotildi (ombor 10→6). Mijoz 2 tasini qaytardi (6→8, naqd kassadan qaytarildi). Menejer sotuvni bekor qiladi — UI ruxsat beradi (status COMPLETED): ombor 8→12. Faqat 10 dona mavjud edi, 2 tasi hali mijozda — **ombor 2 donaga doimiy oshirib ko'rsatiladi**, fantom tovar sotuvlari muvaffaqiyatli o'tadi, `stock_movements` ikkala tiklanishni ham fakt sifatida yozadi. Qo'shimcha hisobot buzilishi: REFUNDED→CANCELLED o'tishda `ReportService:68-70` sotuvni revenue'dan chiqaradi, lekin uning SaleReturn qatorlari `returnsTotal` da qoladi (`findByReturnDateBetweenWithItems` da sale-status filtri yo'q) — net revenue ikki marta jazolanadi.

**Tekshiruvchi xulosasi:** TASDIQLANDI. Controller faqat SALES_UPDATE permission tekshiradi, DB constraint yo'q, `cancelSale` uchun birorta test yo'q. Asosiy ssenariy oddiy UI orqali erishiladi.

**Tuzatish yo'nalishi:** `cancelSale` da (a) REFUNDED statusni bloklash, (b) qisman qaytarilgan bo'lsa `returnedQuantitiesBySale` ni ayirib tiklash yoki umuman bloklash; cancel-after-return testini qo'shish.

---

# TEKSHIRUVSIZ QOLGAN EHTIMOLIY TOPILMALAR (19)

Bular qidiruvchi agentlar tomonidan topilgan, lekin adversarial tekshiruvdan o'tkazilmagan (sig'im chegarasi). Har birini tuzatishdan oldin tasdiqlash kerak.

## HIGH (1)

| Fayl | Muammo |
|---|---|
| `shina-magazin-front/src/pages/sales/POSPage.tsx:532` | Savat darajasidagi summa-chegirma faqat kiritish paytida clamp qilinadi (`Math.min(subtotal, ...)` onChange ichida) — keyin tovar olib tashlansa chegirma subtotal'dan katta bo'lib qoladi va **manfiy jami summa** bilan sotuv o'tkazish mumkin |

## MEDIUM (13)

| Fayl | Muammo |
|---|---|
| `...api/service/LoginAttemptService.java:104` | Lockout paytidagi urinishlar ham yangi xato sifatida sanaladi — 30 daqiqalik bloklash **cheksiz o'z-o'zini uzaytiradi**, to'g'ri parol bilan ham |
| `...api/service/AuthService.java:140` | Refresh endpoint HAR QANDAY imzolangan JWT'ni qabul qiladi (access token, customer token, sessiyasi bekor qilingan token) — session-tekshirmaydigan WebSocket interceptor bilan birga session revocation'ni chetlab o'tadi |
| `...api/security/CustomerUserDetailsService.java:21` | Deaktivatsiya qilingan mijozlar (active=false) portalga kirishda davom etadi: faqat login active flag'ni tekshiradi, customer access tokenlar refresh token vazifasini ham bajaradi |
| `...api/service/PurchaseService.java:318` | Ustma-ust purchase return'lar aniqlanmaydi: miqdor faqat yaratishda tekshiriladi — ikkitasini complete qilish `receivedQuantity`, `totalAmount`, `paidAmount` ni manfiyga tushiradi va supplier balansini ikki marta kreditlaydi (ikki finder mustaqil topdi) |
| `...api/service/CashShiftService.java:131` | CLOSED smena uchun Z-hisobot `expectedCash` ni jonli ma'lumotdan qayta hisoblaydi — yonida ko'rsatilgan saqlangan `difference` bilan zid kelishi mumkin |
| `...api/service/TelegramRegistrationService.java:194` | Telegram chat allaqachon boshqa mijozga bog'langan bo'lsa, contact-registratsiya jimgina crash bo'ladi |
| `...api/resources/db/demo/demo-cleanup.sql:187` | Demo-cleanup eski demo-prefiksga mos telefonli **real xodimlar va hujjatsiz mijozlarni** o'chirib yuborishi mumkin |
| `...api/service/CashShiftService.java:169` | Z-hisobot `expectedCash` naqd qarz to'lovlarini hisobga olmaydi — kassa solishtirish tizimli noto'g'ri |
| `shina-magazin-front/src/shop/data/useCatalog.ts:107` | Storefront tovar sahifasi katalogning birinchi 200 tasidan tashqaridagi har qanday real tovar uchun "topilmadi" ko'rsatadi |
| `shina-magazin-front/src/pages/debts/DebtsPage.tsx:201` | Qarz to'lovi faqat debts cache'ni invalidatsiya qiladi — mijoz balansi, dashboard va hisobotlar eskirgan qoladi |
| `shina-magazin-front/src/pages/suppliers/PurchaseFormModal.tsx:306` | "To'langan summa" maydoni jami summadan katta (yoki manfiy) qiymatni yuborishga ruxsat beradi, backend tekshirmasdan saqlaydi |
| `shina-magazin-front/src/pages/debts/DebtsPage.tsx:267` | "Bugun/hafta/oy to'landi" statistikasi haqiqiy to'lovlardan emas, qarzning yaratilgan sanasi va asl summasidan hisoblanadi |

## LOW (5)

| Fayl | Muammo |
|---|---|
| `...api/service/StaffNotificationService.java:131` | WebSocket bildirishnoma tranzaksiya ichida yuboriladi — rollback bo'lsa "sharpa" bildirishnomalar |
| `...api/security/SimpleRateLimiter.java:135` | Rate-limiter eviction (30 min) Telegram contact oynasidan (60 min) qisqa — e'lon qilingan 1 soatlik blok ~30 daqiqada ochiladi |
| `...api/resources/db/demo/demo-seed.sql:109` | Demo-seed mavjud zaxiradan ko'p sotuvlar yaratadi va product quantity'ni to'g'irlamaydi — demo ombor ledgeri ichki ziddiyatli |
| `shina-magazin-front/src/pages/sales/SalesPage.tsx:473` | Mobil kartada cancel tugmasi SALES_REFUND ortida, desktop va amal esa SALES_UPDATE talab qiladi |
| `shina-magazin-front/src/pages/expenses/ExpensesPage.tsx:257` | `erp.reports.startDate` / `erp.reports.endDate` i18n kalitlari ikkala lokalda ham yo'q — xom kalitlar label sifatida ko'rinadi |

---

## Eslatmalar

- Barcha qator raqamlari 2026-08-05 dagi `master` (`c576d5d`) holatiga tegishli.
- Tasdiqlangan har bir topilma uchun tekshiruvchi agent kodni, chaqiruvchilarni, DB constraint'larni va mavjud testlarni o'qib chiqib rad etishga harakat qilgan — muvaffaqiyatsiz.
- №4 dagi mavjud test (`CashShiftReportTest.cashRefundReducesExpectedCash`) bugni yashiradi — tuzatishda testni real service oqimi orqali qayta yozish shart.
- №1 va №2 bir-biri bilan bog'liq: refresh oqimini tuzatishda `user.getActive()` tekshiruvini ham qo'shish kerak, aks holda №2 ning refresh-varianti ochilib qoladi.
