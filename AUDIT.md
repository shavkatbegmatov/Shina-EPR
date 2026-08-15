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

- [x] Tuzatildi — `refreshToken` endi yangi access token uchun `sessionService.createSession` chaqiradi (controller IP/User-Agent uzatadi), yaroqsiz token 500 emas 401 qaytaradi. Bonus: refresh tokenlarga `refresh: true` claim qo'shildi — refresh endpoint endi faqat haqiqiy STAFF refresh tokenini qabul qiladi (access/mijoz tokenlari rad), filtr esa refresh tokenni access sifatida o'tkazmaydi (mijoz refresh tokenining 7 kunlik access bo'lib yurishi yopildi). Eski (claim'siz) refresh tokenlar rad etiladi — refresh baribir ishlamagan, regressiya yo'q. Testlar: `AuthServiceRefreshTest` (sessiya invarianti real `SessionService` bilan), `JwtRefreshTokenClaimTest`, filter testi +1.

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

- [x] Tuzatildi — `deactivateUser` endi `revokeSessions` chaqiradi (kirish darhol to'xtaydi); `JwtAuthenticationFilter` har so'rovda `userDetails.isEnabled()` ni tekshiradi (xodim: `user.active`, mijoz: `customer.active && portalEnabled` — tekshirilmagan №4-topilmani ham yopadi); `refreshToken` deaktiv hisobga token bermaydi; `JwtChannelInterceptor` xodim tokenlari uchun WebSocket'da ham sessiya tekshiradi (sessiyasiz refresh tokenlar ham ulana olmaydi). Testlar: `UserDeactivationSessionTest`, `AuthServiceRefreshTest`, `JwtAuthenticationFilterTest`, `JwtChannelInterceptorTest` (10 yangi).

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

- [x] Tuzatildi — `DebtStatus.CANCELLED` qo'shildi; qaytarishda qarz yozuvi mos summaga kamayadi (`SaleReturnService.reduceDebtRecords`), bekor qilishda yopiladi (`SaleService.cancelOpenDebtRecords`); `DebtService.makePayment` CANCELLED qarzni va REFUNDED/CANCELLED sotuvning eski fantom qarzini rad etadi. Testlar: `SaleReturnServiceTest` (+2), `SaleCancelServiceTest` (yangi), `DebtServiceTest` (yangi).

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

- [x] Tuzatildi — yangi `SaleReturnRepository.sumCashRefundedNettedInPaid` so'rovi NAQD + shu smenadagi savdolarning qaytarimini (ular `paidAmount` orqali `cashReceived`da allaqachon aks etgan) aniqlaydi va `buildReport` uni `expectedCash`ga qaytarib qo'shadi; `cashRefunded` hisobotda to'liq ko'rsatilaveradi. Maskalovchi test real `createReturn` oqimiga o'tkazildi, +3 yangi ssenariy (same-shift to'liq qaytarim, KARTA savdo naqd qaytarimi, cross-shift). `CashShiftReportTest` 19/19.

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

- [x] Tuzatildi — `cancelSale` endi REFUNDED sotuvni ("to'liq qaytarilgan") va birorta qaytarishi bor sotuvni (`saleReturnRepository.existsBySaleId`) rad etadi; state-machine bir tomonlama yakunlandi (`createReturn` CANCELLED'ni avvaldan rad etardi). Qisman qaytarilgan sotuv faqat qolgan tovarlarni qaytarish orqali yopiladi — bu pul taqsimotini ham to'g'ri saqlaydi. REFUNDED blok hisobotdagi ikki marta jazolashni (revenue'dan chiqib, returnsTotal'da qolish) ham yopadi. Testlar: `SaleCancelServiceTest` +2 — audit ssenariysi real qaytarish oqimi bilan (10→6→8, bekor rad → 8 qoladi, 12 emas).

**Fayllar:**
- `shina-magazin-api/src/main/java/uz/shinamagazin/api/service/SaleService.java:250-292` (`cancelSale`, guard faqat 255-qatorda)
- `shina-magazin-api/src/main/java/uz/shinamagazin/api/service/SaleReturnService.java:205-221` (`restoreStock`)
- `shina-magazin-front/src/pages/sales/SalesPage.tsx:266-271, 472-477` (cancel tugmasi COMPLETED da ko'rinadi)

**Muammo:** `cancelSale` ning yagona holat tekshiruvi — `sale.getStatus() == SaleStatus.CANCELLED`. Qisman qaytarilgan sotuv COMPLETED bo'lib qoladi, to'liq qaytarilgani REFUNDED — ikkalasi ham guard'dan o'tadi. Keyin 262-281 qatorlar **to'liq asl miqdorni** qayta omborga qo'shadi, `SaleReturnRepository.returnedQuantitiesBySale` bilan solishtirmaydi (return oqimi over-return'ni oldini olish uchun aynan shu so'rovni ishlatadi!). Teskari guard bor (`createReturn` CANCELLED'ni rad etadi, testi ham bor) — lekin cancel tomoni himoyasiz.

**Ssenariy:** 4 shina sotildi (ombor 10→6). Mijoz 2 tasini qaytardi (6→8, naqd kassadan qaytarildi). Menejer sotuvni bekor qiladi — UI ruxsat beradi (status COMPLETED): ombor 8→12. Faqat 10 dona mavjud edi, 2 tasi hali mijozda — **ombor 2 donaga doimiy oshirib ko'rsatiladi**, fantom tovar sotuvlari muvaffaqiyatli o'tadi, `stock_movements` ikkala tiklanishni ham fakt sifatida yozadi. Qo'shimcha hisobot buzilishi: REFUNDED→CANCELLED o'tishda `ReportService:68-70` sotuvni revenue'dan chiqaradi, lekin uning SaleReturn qatorlari `returnsTotal` da qoladi (`findByReturnDateBetweenWithItems` da sale-status filtri yo'q) — net revenue ikki marta jazolanadi.

**Tekshiruvchi xulosasi:** TASDIQLANDI. Controller faqat SALES_UPDATE permission tekshiradi, DB constraint yo'q, `cancelSale` uchun birorta test yo'q. Asosiy ssenariy oddiy UI orqali erishiladi.

**Tuzatish yo'nalishi:** `cancelSale` da (a) REFUNDED statusni bloklash, (b) qisman qaytarilgan bo'lsa `returnedQuantitiesBySale` ni ayirib tiklash yoki umuman bloklash; cancel-after-return testini qo'shish.

---

# QOLGAN TOPILMALAR — ADVERSARIAL TEKSHIRUV NATIJALARI

Dastlab tekshiruvsiz qolgan 19 topilma (18 noyob — purchase-return ikki finder tomonidan topilgan edi) ikkinchi bosqichda har biri alohida tekshirildi: agent kodni, chaqiruvchilarni, guard'larni va testlarni o'qib rad etishga harakat qildi. Natija: **15 TASDIQLANDI, 2 QISMAN TUZATILGAN (qoldiq bor), 1 RAD ETILDI.**

## TASDIQLANGAN — HIGH (3)

### H1. POS: manfiy jami summa bilan sotuv o'tkazish mumkin
- [x] Tuzatildi — `cartStore` endi tovar olib tashlanganda/miqdor kamayganda/qator chegirmasi oshganda savat chegirmasini yangi subtotal bilan qayta clamp qiladi; `handleCompleteSale`da manfiy jami guard; backend'da ikki validatsiya: qator chegirmasi ≤ qator summasi, savdo chegirmasi ≤ subtotal (`SaleService.createSale`, `BadRequestException`). Testlar: `cartStore.test.ts` (5), `SaleCreateValidationTest` (4).

`shina-magazin-front/src/pages/sales/POSPage.tsx:532`, `store/cartStore.ts:56-112`, `...api/service/SaleService.java:173-205`. Chegirma faqat onChange'da clamp qilinadi; `removeItem/updateQuantity` chegirmaga tegmaydi, `getTotal()` da floor yo'q, submit'da guard yo'q. Backend ham himoyasiz: `SaleRequest.discountAmount` faqat `@DecimalMin("0")`, `SaleService` da `discount ≤ subtotal` / `totalAmount ≥ 0` tekshiruvi yo'q — manfiy jami bilan COMPLETED/PAID sotuv saqlanadi, revenue/Z-hisobot/dashboard buziladi. **Tuzatish:** savat o'zgarganda chegirmani qayta clamp qilish + submit'da manfiy jami blok + backend'da `discountAmount ≤ subtotal` validatsiya.

### H2. Ustma-ust purchase return'lar — supplier ikki marta kreditlanadi (medium'dan ko'tarildi)
- [x] Tuzatildi — `createReturn` endi boshqa yakunlanmagan (PENDING/APPROVED) qaytarishlarda band qilingan miqdorlarni ayirib tekshiradi (`PurchaseReturnRepository.outstandingReturnQuantities` — sale-return guard'ining ekvivalenti; COMPLETED sanalmaydi, chunki u `receivedQuantity`ni allaqachon kamaytirgan); `completeReturn` yakunlashdan oldin barcha qatorlarni `receivedQuantity`ga qarshi qayta tekshiradi (guard'dan oldingi eski ustma-ust APPROVED qaytarishlardan himoya). Testlar: `PurchaseReturnOverlapTest` (5) — parallel yaratish rad, kvota taqsimoti, COMPLETED ikki marta sanalmasligi, o'chirish kvotani bo'shatishi, eski qaytarish yakunlashda rad + balans bir marta kreditlanishi.

`...api/service/PurchaseService.java:318,362,384,404,436-448`. Yangi return faqat `receivedQuantity` ga qarab tekshiriladi, u esa faqat COMPLETE paytida kamayadi; PENDING/APPROVED return'lar yig'indisi hisobga olinmaydi (`SaleReturnRepository.returnedQuantitiesBySale` ekvivalenti yo'q). To'liq miqdorga ikkita PENDING return yaratib, ikkalasini complete qilish mumkin: `receivedQuantity`/`totalAmount` manfiyga tushadi (DB CHECK yo'q), `SupplierService.updateBalance` ikki marta debetlanadi. Yagona to'siq — GLOBAL product stock ≥ 0, boshqa partiyalardan zaxira bo'lsa u ham o'tadi. Purchase return uchun birorta test yo'q. **Tuzatish:** createReturn'da mavjud return'lar yig'indisini ayirish + completeReturn'da qayta validatsiya (sale-return guard'iga o'xshash).

### H3. Naqd qarz to'lovlari Z-hisobotga umuman tushmaydi (medium'dan ko'tarildi)
- [x] Tuzatildi — V39: `payments.shift_id` (nullable, sale_returns/expenses kabi); `makePayment` to'lovni qabul qilgan kassirning ochiq smenasiga bog'laydi; `expectedCash`ga ikki yangi term: shu smenada qabul qilingan NAQD qarz to'lovlari QO'SHILADI, shu smena savdolariga keyin qilingan to'lovlar (paidAmount orqali kirgan fantom tushum) AYIRILADI — bir pul ikki smenada sanalmaydi, KARTA to'lovlar kassaga kirmaydi. Z-hisobot chekida yangi "Qarz to'lovlari (naqd)" qatori (uz/ru). Eski to'lovlar shift NULL (qaysi smenada qabul qilingani noma'lum — hisobga kirmaydi). Testlar: `CashShiftReportTest` +3 (same-shift, cross-shift fantom tushum yo'qligi, KARTA), `DebtServiceTest` +2 (smena bog'lanishi).

`...api/entity/Payment.java` (shift maydoni YO'Q), `...api/service/DebtService.java:174`, `CashShiftService.buildReport`. `makePayment` naqd to'lovni hech qanday smenaga bog'lamaydi — kassaga tushgan qarz puli `expectedCash`da ko'rinmaydi (o'zlashtirish aniqlanmaydi). Yagona iz — `sale.paidAmount` oshishi, u esa noto'g'ri smenani (sotuv qilingan, ehtimol yopilgan smenani) kreditlaydi va KARTA to'lovlarda ham ishlab fantom kamomad yasaydi. **Tuzatish:** `Payment`ga nullable `shift_id` qo'shish (sale_returns/expenses kabi), `expectedCash`ga `sumCashDebtPaymentsByShift` qo'shish, reconciliation uchun sotuv smenasini `paidAmount` orqali kreditlashni to'xtatish.

## TASDIQLANGAN — MEDIUM (6) — ✅ barchasi tuzatildi

| # | Joy | Muammo va tuzatish yo'nalishi |
|---|---|---|
| M1 ✅ `af4bc3a` | `LoginAttemptService.java:85-126`, `LoginAttemptRepository.java:44-50` | Lockout paytidagi urinishlar (ACCOUNT_LOCKED sababi bilan ham) FAILED deb yoziladi va hisobga kiradi — blok cheksiz o'z-o'zini uzaytiradi; hujumchi ~6 daqiqada 1 so'rov bilan istalgan hisobni abadiy qulflab tura oladi. **Tuzatish:** ACCOUNT_LOCKED qatorlarini `countRecentFailedAttempts`dan chiqarish |
| M2 ✅ `31b7f89` | `PurchaseService.createPurchase:67-137` + `PurchaseFormModal.tsx:306` | Yaratishda `paidAmount > totalAmount` tekshirilmaydi (manfiy `@DecimalMin` bilan yopiq; `addPayment`da chegara bor, create'da yo'q) — ortiqcha to'lov PAID deb saqlanadi, `debtAmount` manfiy. **Tuzatish:** create'da `paidAmount ≤ totalAmount` + frontend clamp |
| M3 ✅ `2fda7f6` | `DebtsPage.tsx:268-274` | "Bugun/hafta/oy to'landi" statistikasi to'lovlardan emas, PAID qarzlarning `createdAt`/`originalAmount`idan — real oqimlarda raqamlar noto'g'ri (bugun undirilgan eski qarz 0 ko'rinadi, qisman to'lovlar umuman sanalmaydi). **Tuzatish:** haqiqiy `Payment` yozuvlaridan agregat |
| M4 ✅ `ea32eaf` | `CashShiftService.getReport:127-132` | CLOSED smena hisoboti `expectedCash`ni jonli qayta hisoblaydi, yonida saqlangan `difference` — bitta javobda ikki qarama-qarshi qiymat (bekor qilish, cross-shift qaytarim, qarz to'lovi keyin o'zgartiradi). **Tuzatish:** CLOSED uchun saqlangan qiymatlarni ko'rsatish |
| M5 ✅ `78b1ef5` | `TelegramRegistrationService.onContact:173-256` | Chat boshqa mijozga bog'langan holatda kontakt yuborilsa unique index buziladi, catch-all faqat log qiladi — foydalanuvchiga jimlik, xodim eski linkni tozalamaguncha qotib qoladi (oqim "Yangi PIN olish" tugmasi bilan chaqiriladi). **Tuzatish:** `findByTelegramChatId` tekshiruvi + aniq javob xabari |
| M6 ✅ `62f177e` | `catalogApi.ts:51` (`size=200`), `useCatalog.ts:107`, `ProductDetailPage.tsx:25-37` | Tovar sahifasi faqat birinchi 200 talik ro'yxatdan qidiradi; `getById` so'rovi `enabled: Boolean(product)` bilan bog'langan — ro'yxatda yo'q tovarni hech qachon qutqara olmaydi. Katalog 200 dan oshsa filtrlangan ro'yxat/to'g'ridan-to'g'ri URL'lar "topilmadi" beradi. **Tuzatish:** ro'yxatda topilmasa `getById` fallback |

## TASDIQLANGAN — LOW (6)

| # | Joy | Muammo |
|---|---|---|
| L1 | `StaffNotificationService.java:131` | WS bildirishnoma tranzaksiya ichida yuboriladi — rollback'da "sharpa" bildirishnoma (Telegram kanali AFTER_COMMIT bilan to'g'ri qilingan, WS esa yo'q; `notifyLowStock` keyin `InsufficientStockException` bilan real rollback oynasi bor). Tuzatish: WS'ni ham AFTER_COMMIT'ga ko'chirish |
| L2 | `SimpleRateLimiter.java:120-135` | Eviction cutoff (30 min) 60-daqiqalik oynalardan (Telegram contact, staff registration) qisqa — "1 soatlik" blok ~30-35 daqiqada ochiladi, byudjet ikki baravar. Tuzatish: `MAX_WINDOW_MS` ≥ 60 min yoki per-entry cutoff |
| L3 | `demo-cleanup.sql:161-188` (medium'dan tushirildi) | Legacy prefikslar (`+9989099000%`, `+9989300100%`) real Beeline/Ucell bloklariga mos kelishi mumkin; xodimlar uchun external-reference guard umuman yo'q. Ehtimollik past (~100 raqamlik bloklar), lekin o'chirish jim. Tuzatish: qo'shimcha marker yoki xodimlarni guard'ga qo'shish |
| L4 | `demo-seed.sql:36-111,172-179` | Demo sotuvlar seeded zaxiradan ko'p (3 talikdan 4 sotilgan), OUT movement'lar yo'q — demo ombor ledgeri ichki ziddiyatli (faqat demo ko'rinishiga ta'sir qiladi) |
| L5 | `SalesPage.tsx:472-478` | Mobil kartada cancel tugmasi SALES_REFUND ortida, desktop/backend esa SALES_UPDATE — faqat maxsus rollarda seziladi (seed rollar ajratmaydi). Tuzatish: mobil gate'ni SALES_UPDATE ga almashtirish |
| L6 | `ExpensesPage.tsx:257,266` | `erp.reports.startDate/endDate` kalitlari ikkala lokalda ham yo'q — xom kalit label bo'lib chiqadi. Locale-parity testi buni tutmaydi (faqat uz↔ru tenglikni tekshiradi). Tuzatish: kalitlarni qo'shish |

## QISMAN TUZATILGAN — qoldiq ishlar (2)

| # | Joy | Yopilgani / Qolgani |
|---|---|---|
| Q1 (medium) | Refresh token revocation | 732fdf1 asosini yopdi (refresh claim, mijoz/access rad, WS sessiya). **Qoldiq:** refresh tokenlar server tomonida hech qayerda saqlanmaydi/bekor qilinmaydi — logout, admin revoke, hatto parol almashtirish ham qo'ldagi 7 kunlik refresh tokenni o'ldirmaydi, har refresh yangi 7 kunlik beradi (faqat `active=false` uzadi). Tuzatish: refresh tokenlarni (yoki session-id claim'ni) persist qilib, refresh'da revocation holatini tekshirish; logout/parol almashtirishda bekor qilish; rotation + qayta ishlatishni aniqlash |
| Q2 (low) | `CustomerAuthService.refreshToken:135-156`, `JwtChannelInterceptor:42-52` | aad43a0 filtrni yopdi (har so'rovda `isEnabled`). **Qoldiq:** mijoz refresh endpointi `isRefreshToken`ni ham, `active`ni ham tekshirmaydi (access token refresh vazifasini bajaradi, deaktiv mijoz token yangilay oladi); WS interceptor mijoz tokenlariga enabled tekshiruvi qo'llamaydi. Tuzatish: mijoz refresh'ida ikkala tekshiruv + WS'da mijoz enabled tekshiruvi |

## RAD ETILGAN (1)

- ~~`DebtsPage.tsx:201` — qarz to'lovi faqat debts cache'ni invalidatsiya qiladi~~ — fakt to'g'ri, lekin eskirish real oqimda yuz bermaydi: xuddi shu `makePayment` staff-notification yuboradi, WS orqali `useInvalidateOnNotification` mijozlar/dashboard/hisobotlar sahifalarida cache'ni yangilaydi; qolgan xavf 30-60s staleTime bilan cheklangan. Ixtiyoriy mustahkamlash: aniq `invalidateAfter.debtPayment` ro'yxati

---

## Eslatmalar

- Asosiy 5 klaster qator raqamlari `c576d5d`, ikkinchi bosqich tekshiruvi `e217939` holatiga tegishli.
- Har ikkala bosqichda ham tekshiruvchi agent kodni, chaqiruvchilarni, DB constraint'larni va mavjud testlarni o'qib chiqib topilmani RAD ETISHGA harakat qilgan.
- Tasdiqlangan 5 asosiy klaster tuzatilgan: 1fdaa48 (№3), 5895e93 (№4), aad43a0 (№2), 732fdf1 (№1), 673b779 (№5); tozalash migratsiyasi — e217939 (dastlab V38 sifatida qo'shilib, V38 raqami band bo'lgani uchun keyin V40 ga ko'chirilgan).
- Ikkinchi bosqich uchun tavsiya etilgan tartib: H1 (POS manfiy summa — pul), H3 (qarz to'lovlari Z-hisobotda — o'g'irlik niqobi), H2 (purchase return — supplier ikki kredit), keyin M1 (lockout DoS) va qolgan MEDIUM'lar.
