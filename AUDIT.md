# Mantiqiy xatolar auditi

**Holat: YAKUNLANGAN** — uch bosqichda topilgan **45 ta tasdiqlangan mantiqiy xato tuzatildi**
(1-bosqich **5** + 2-bosqich **17** + 3-bosqich **23**), ochiq qolgani yo'q.
Tuzatishlar **17.08.2026 da prodga chiqdi**.

| | 1-bosqich | 2-bosqich | 3-bosqich (qayta audit) |
|---|---|---|---|
| Sana | 2026-08-05 | 2026-08-05 | 2026-08-15/16 |
| Qidiruvchi agentlar | 6 | (o'sha topilmalar) | 6 |
| Tasdiqlangan | 5 klaster (HIGH) | 3 HIGH, 6 MEDIUM, 6 LOW, 2 qisman | 1 HIGH, 9 MEDIUM, 13 LOW |
| Rad etilgan | 0 | 1 | 3 |
| Holat | ✅ yopilgan | ✅ yopilgan | ✅ yopilgan |

**Metodika (uchala bosqichda ham bir xil):** sohalar bo'yicha parallel qidiruv (auth-security, money-stock, telegram-demo, db-consistency, front-data, front-ui), so'ng har bir topilmani **mustaqil adversarial agent rad etishga harakat qiladi** — noaniqlikda REFUTED tomonga xato qilish sharti bilan. Faqat rad etib bo'lmaganlari tuzatiladi. Bu jarayon 4 ta yolg'on-ijobiy topilmani filtrladi va 9 tasining jiddiyligini pasaytirdi, ya'ni asossiz refaktoring qilinmadi.

**Migratsiyalar:** V39 (`payments.shift_id`), **V40** (fantom qarzlarni tozalash — dastlab `e217939` da
V38 raqami bilan yozilgan, parallel sessiya bilan to'qnashgani uchun qayta raqamlangan),
V41 (`sessions` refresh-token rotatsiyasi). Repodagi haqiqiy fayl nomlari — shu uchtasi.

**Testlar:** backend **295 → 365**, frontend **335 → 341**.

## Foydalanuvchi sezadigan o'zgarishlar — ✅ 17.08.2026 dan kuchda

> Bular endi **jonli** (`https://protektor.uz`). Kassirlar uchun qisqa eslatma:
> `KASSIRLAR-UCHUN.md` / `ДЛЯ-КАССИРОВ.md`.

| O'zgarish | Ta'siri |
|---|---|
| Majburiy parol almashtirish (R13) | `mustChangePassword` tirik foydalanuvchilar parolni almashtirmaguncha boshqa endpointlarga kira olmaydi |
| Refresh token rotatsiyasi (Q1) | Eski refresh tokenlar rad etiladi — barcha xodimlar bir marta qayta kiradi |
| Pul olingan sotuvni bekor qilish taqiqlandi (**R2-qoldiq** — R2'ning asosiy da'vosi RAD ETILGAN, quyiga qarang) | Kassirlar endi qaytarish rasmiylashtiradi ("Hammasini tanlash" yorlig'i bilan) — ish jarayoni o'zgaradi, ogohlantirish kerak |
| Excel import zaxirani o'zgartirmaydi (R4) | Import faqat narx/nom yangilaydi; zaxira Ombor orqali |
| `PATCH /products/{id}/stock` olib tashlandi (R-STOCK1) | Tashqi integratsiya bo'lsa `warehouse/adjustment` ga o'tkazish kerak |

---

# 1-BOSQICH — TASDIQLANGAN XATOLAR (severity: HIGH)

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

# 2-BOSQICH — QOLGAN TOPILMALAR (adversarial tekshiruvdan keyin) ✅

Birinchi bosqichda sig'im chegarasi tufayli tekshiruvsiz qolgan 19 topilma (18 noyob — purchase-return ikki finder tomonidan topilgan edi) har biri alohida tekshirildi: agent kodni, chaqiruvchilarni, guard'larni va testlarni o'qib rad etishga harakat qildi. Natija: **15 TASDIQLANDI, 2 QISMAN TUZATILGAN, 1 RAD ETILDI** — barchasi yopilgan (qoldiqlar Q1/Q2 sifatida alohida tuzatilgan).

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

## TASDIQLANGAN — LOW (6) — ✅ barchasi tuzatildi

| # | Joy | Muammo |
|---|---|---|
| L1 ✅ | `StaffNotificationService.java:131` | WS bildirishnoma tranzaksiya ichida yuboriladi — rollback'da "sharpa" bildirishnoma (Telegram kanali AFTER_COMMIT bilan to'g'ri qilingan, WS esa yo'q; `notifyLowStock` keyin `InsufficientStockException` bilan real rollback oynasi bor). Tuzatish: WS'ni ham AFTER_COMMIT'ga ko'chirish |
| L2 ✅ | `SimpleRateLimiter.java:120-135` | Eviction cutoff (30 min) 60-daqiqalik oynalardan (Telegram contact, staff registration) qisqa — "1 soatlik" blok ~30-35 daqiqada ochiladi, byudjet ikki baravar. Tuzatish: `MAX_WINDOW_MS` ≥ 60 min yoki per-entry cutoff |
| L3 ✅ | `demo-cleanup.sql:161-188` (medium'dan tushirildi) | Legacy prefikslar (`+9989099000%`, `+9989300100%`) real Beeline/Ucell bloklariga mos kelishi mumkin; xodimlar uchun external-reference guard umuman yo'q. Ehtimollik past (~100 raqamlik bloklar), lekin o'chirish jim. Tuzatish: qo'shimcha marker yoki xodimlarni guard'ga qo'shish |
| L4 ✅ | `demo-seed.sql:36-111,172-179` | Demo sotuvlar seeded zaxiradan ko'p (3 talikdan 4 sotilgan), OUT movement'lar yo'q — demo ombor ledgeri ichki ziddiyatli (faqat demo ko'rinishiga ta'sir qiladi) |
| L5 ✅ | `SalesPage.tsx:472-478` | Mobil kartada cancel tugmasi SALES_REFUND ortida, desktop/backend esa SALES_UPDATE — faqat maxsus rollarda seziladi (seed rollar ajratmaydi). Tuzatish: mobil gate'ni SALES_UPDATE ga almashtirish |
| L6 ✅ | `ExpensesPage.tsx:257,266` | `erp.reports.startDate/endDate` kalitlari ikkala lokalda ham yo'q — xom kalit label bo'lib chiqadi. Locale-parity testi buni tutmaydi (faqat uz↔ru tenglikni tekshiradi). Tuzatish: kalitlarni qo'shish |

## QISMAN TUZATILGAN — qoldiq ishlar (2)

| # | Joy | Yopilgani / Qolgani |
|---|---|---|
| Q1 (medium) ✅ | Refresh token revocation | TUZATILDI (V41 migratsiya): sessiya qatori endi refresh token hashini ham saqlaydi (`refresh_token_hash` + `previous_refresh_token_hash`). Refresh faqat TIRIK sessiya bilan ishlaydi — logout, admin revoke, parol almashtirish, deaktivatsiya refresh tokenni ham avtomatik o'ldiradi. Har refresh'da ikkala token AYNI sessiya qatorida ROTATSIYA qilinadi (yangi qator ochilmaydi — sessiyalar ro'yxati ham toza); rotatsiyadan chiqqan eski refresh qayta kelsa BUTUN sessiya yopiladi (o'g'irlangan token belgisi); sessiyaning mutlaq muddati bor (`createdAt + refresh-expiration`) — kunda bir yangilab turgan qurilma abadiy kirishda qolmaydi, 7 kunda to'liq qayta login. Cheklov: bir nechta tab bir vaqtda refresh qilsa, yutqazgan tab reuse-detection tufayli qayta login qiladi (xavfsiz tomonga xato). Testlar: `AuthServiceRefreshTest` 9 ta (rotatsiya, revocation, reuse, mutlaq muddat) |
| Q2 (low) ✅ | `CustomerAuthService.refreshToken:135-156`, `JwtChannelInterceptor:42-52` | TUZATILDI: mijoz refresh endpointi endi `isRefreshToken` (access token refresh vazifasini bajara olmaydi) va `customer.getActive()` (deaktiv mijoz token yangilay olmaydi) tekshiradi; WS interceptor refresh tokenlarni rad etadi va mijoz tokenlari uchun `active && portalEnabled` tekshiradi (REST filtridagi `isEnabled` ekvivalenti). Eslatma: eski (claim'siz) mijoz refresh tokenlari rad etiladi — mijoz bir marta qayta login qiladi |

## RAD ETILGAN (1)

- ~~`DebtsPage.tsx:201` — qarz to'lovi faqat debts cache'ni invalidatsiya qiladi~~ — fakt to'g'ri, lekin eskirish real oqimda yuz bermaydi: xuddi shu `makePayment` staff-notification yuboradi, WS orqali `useInvalidateOnNotification` mijozlar/dashboard/hisobotlar sahifalarida cache'ni yangilaydi; qolgan xavf 30-60s staleTime bilan cheklangan. Ixtiyoriy mustahkamlash: aniq `invalidateAfter.debtPayment` ro'yxati

---

# 3-BOSQICH — QAYTA AUDIT (2026-08-15/16, `224430a` holatida) ✅

Birinchi ikki bosqich tuzatilgach, butun loyiha qayta tekshirildi (6 parallel qidiruvchi agent, har biri AUDIT.md'dagi ma'lum topilmalarni chiqarib tashlab, faqat YANGI xatolarni qidirdi). Topilgan 26 da'vo keyin **6 ta adversarial tekshiruvchi** tomonidan rad etishga urinildi (noaniqlikda REFUTED tomonga xato qilish sharti bilan).

**Tekshiruv natijasi: 3 RAD ETILDI, 23 tasdiqlandi — 1 HIGH, 9 MEDIUM, 13 LOW.** Dastlab HIGH deb belgilangan 5 da'vodan faqat bittasi HIGH bo'lib qoldi.

## R-HIGH — tasdiqlangan (1)

| # | Joy | Muammo va tuzatish |
|---|---|---|
| R3 | `PurchaseService.createReturn:342` | Bitta qaytarish so'rovi ichidagi TAKRORIY mahsulot qatorlari kvota guard'ini chetlab o'tadi (H2 fix faqat so'rovlar ORASIni qamragan): `outstanding` map tsikldan oldin bir marta olinadi va ichida yangilanmaydi, `completeReturn` re-validatsiyasi ham butun tsikldan OLDIN tugaydi. **Shart:** boshqa partiyadan ortiqcha zaxira bo'lishi kerak (aks holda `newStock < 0` guard'i to'sadi). Natija: `receivedQuantity` −10, supplier 2× kreditlanadi, `totalAmount` manfiy bo'lib ham PAID. **Tuzatish:** `request.getItems()`ni productId bo'yicha yig'ish + `completeReturn`da validatsiya va dekrementni bitta tsiklga birlashtirish |

## R-MEDIUM — tasdiqlangan (9)

| # | Joy | Muammo va tuzatish |
|---|---|---|
| R1 ⬇high | `front/src/api/axios.ts:34` | **Q1 REGRESSIYASI:** single-flight yo'q (`isRefreshing\|refreshPromise\|failedQueue` — nol natija), dashboard 2+ parallel so'rov yuboradi. Ikkinchi refresh reuse-detection'ni ishga tushiradi (yoki `@Version` konflikti beradi) — ikkala holatda ham majburiy re-login. Fail-closed, ruxsatsiz kirish yo'q → medium. **Tuzatish:** modul darajasidagi `refreshPromise` + backend'da bir necha soniyalik grace oynasi (eski token kelsa joriy juftlikni qaytarish) |
| R5 ⬇high | `POSPage.tsx:250` + `SaleService` | `paidAmount` hech qayerda clamp qilinmaydi (xaridlarda bunday guard BOR — `PurchaseService:87-90`), Z-hisobot, sotuv hisoboti va chekka o'tadi. **Qayta ramkalandi:** modal aniq jamiga oldindan to'ldirilgan (test bilan qulflangan), tugmalar +1K/+10K qo'shuvchilar — ya'ni kassir qiymatni qo'lda oshirgan holat, "har sotuv" emas. **Tuzatish:** `max={total}` + backend `paidAmount <= totalAmount` |
| R6 | `CashShiftService.buildReport:191` | Boshqa ochiq smenada qilingan qaytarim SOTUV smenasining naqdini kompensatsiyasiz qoldiradi (refund qiluvchi menejer/admin bo'lishi kerak — SELLER'da `SALES_REFUND` yo'q). **Nafis tuzatish:** `sumCashRefundedNettedInPaid`dan `AND r.shift.id` ni olib tashlab, SOTUV smenasi bo'yicha kalitlash — same-shift o'zgarmaydi, cross-shift avtomatik to'g'rilanadi |
| R8 | `SaleReturnService.createReturn:96` | Takroriy `saleItemId` zaxirani ikki marta tiklaydi. **Da'vodan yomonroq:** ko'p qatorli sotuvda pul ham cheklanmaydi (`maxRefundable` butun sotuv summasi), qatorlar soni ham chegaralanmagan. **Tuzatish:** `saleItemId` bo'yicha yig'ish |
| R9 | `ReportService.sumPaidByMethod:230` | Yanvar CASH sotuvining martdagi CARD to'lovi yanvar `cashTotal`ini oshiradi va `debtTotal`ini kamaytiradi; `totalRevenue` barqaror qolgani uchun drift jimgina o'tadi. **Tuzatish:** `Payment` qatorlaridan (`method` + `paymentDate`) hisoblash |
| R10 | `TelegramNotifier:117` | Bot TOKENI toast'da va WARN loglarda sizib chiqadi (token URL yo'lida; Spring `ResourceAccessException` xabari URI'ni o'z ichiga oladi — jar'dan tasdiqlangan; mavjud test aynan shu satrni ko'rsatadi; logbackda maskalash yo'q). **Tuzatish:** tokenni maskalovchi helper + barcha uch chiqish nuqtasini shundan o'tkazish |
| R13 | `PasswordChangeModal.tsx:90` | **Da'vodan kuchliroq:** modalda "majburiy" varianti umuman yo'q (X + alohida "o'tkazib yuborish" tugmasi), backend `mustChangePassword`ni hech qayerda tekshirmaydi — Telegram orqali parol yuborishni oqlaydigan yagona asos mavjud emas. **Tuzatish:** server tomonda gate (faqat me/change-password/logout) + `forced` prop |
| R4 ⬇high | `ProductImportService.applyRow:195` | Mavjud mahsulot zaxirasini movement'siz ustidan yozadi; `purchasePrice` nullashi da'vodan kengroq (ustun yo'q bo'lsa ham). **Pasaytirildi:** `dryRun=true` default va ikki bosqichli UI bor, lekin preview maydon-darajasidagi farqni ko'rsatmaydi. **Tuzatish:** Miqdorni faqat `isNew`da qo'llash yoki ADJUSTMENT movement yozish |
| R-STOCK2 | `ProductService.deleteProduct:131` | To'rttala qism ham tasdiqlandi + qo'shimcha: SKU abadiy band qoladi (`existsBySku` flagni tekshirmaydi). Zaxira stats'dan yo'qoladi, tiklash yo'li yo'q, `createSale` `active`ni tekshirmaydi. **Tuzatish:** `quantity > 0` da bloklash + `createSale`da active tekshiruvi |

## R-LOW — tasdiqlangan (13)

| # | Joy | Qisqacha |
|---|---|---|
| R7 ⬇med | `PaymentRepository:77` | `sale.status <> CANCELLED` filtri yo'q. Uchta shart kerak; same-shift naqdda `+cashDebtPayments` buni aynan nolga kompensatsiya qiladi |
| R16 | `SessionRepository.deleteExpiredSessions` | **Q1 REGRESSIYASI:** tozalash access-muddati bo'yicha o'chiradi. Kunlik foydalanuvchilar zarar ko'rmaydi — faqat dam olish tanaffusi (juma 17:00 → yakshanba 02:00 → dushanba re-login) |
| R2-qoldiq | `SaleService.cancelSale` | Asosiy da'vo RAD ETILDI (pastga qarang), lekin qoldiq bor: bekor qilish naqd chiqimni qayd etmaydi — pul keyingi smenada qaytarilsa kassa hisobsiz kamayadi |
| R11 ⬇med | `StaffRegistrationService` | Xabar commit'dan oldin yuboriladi, lekin **trigger rad etildi**: ikkala tranzaksiya ham avval `createEmployee` chaqiradi, `username` UNIQUE ikkinchisini yuborishga yetkazmaydi. Qoldiq oyna tor |
| R12 ⬇med | `StaffRegistrationService:206` | Eskalatsiya sifatida **rad etildi** (`approve` = `EMPLOYEES_CREATE` = faqat ADMIN; u baribir `roleCode: ADMIN` yubora olardi). Least-privilege default nuqsoni |
| R18 | `linkTelegram:151` | Token bir martalik emas, chatni qayta bog'lash guard'i yo'q (mijoz oqimida BOR). Link sizib ketishi kerak (18 random bayt) |
| R19 | `DebtService:86` | Qarz to'lovlari tarixi mijozning barcha to'lovlarini ko'rsatadi — sarlavha "To'lovlar tarixi", ustidagi raqamlarga zid |
| R20 | `StaffRequestsPage:201` | Rad sababi oldingi arizachidan qoladi (Telegram orqali yetkaziladi); tasdiqlashdan oldin ko'rinadi |
| R-RPT | `ReportService:670` | "Davr ichida to'langan" davrni e'tiborsiz qoldiradi va `originalAmount` yig'adi. **Tayyor yechim:** M3 uchun yozilgan `sumDebtPaymentsBetween` |
| R-PWD | `passwordPolicy.ts:82` | Front ASCII / back Unicode — ikki tomonlama nomuvofiqlik. "Generate" faqat ASCII chiqargani uchun bu yo'l xavfsiz |
| R-DEBTUI | `DebtsPage:348` | To'lov xatosi jim yutiladi (toast yo'q); modal ochiq qolishi yagona signal |
| R-SHOPCART | `shop/cartStore.ts:26` | Zaxira clamp'i yo'q (POS'da BOR); xato faqat oxirgi qadamda chiqadi |
| R14, R15, R-STOCK1, R-RET | — | Telefon validatsiyasi prefiksni sanaydi (+ `normalize` uni `+998998901234` ga aylantiradi); savat narx snapshot'i (haqiqiy summa to'lov shlyuzida ko'rinadi); `adjustStock` — frontend wrapper'i o'lik kod; APPROVED qaytarish "abadiy" emas (zaxira to'ldirilsa yakunlanadi) |

## RAD ETILDI (3)

- **R2** (HIGH da'vo qilingan) — mexanika to'g'ri, **arifmetika xato**: `createSale` balansga faqat qarzni yozadi, ya'ni −300k→0 to'g'ri obligatsiya ledgeri; do'kon 300k emas, to'liq 700k qarzdor va buni hech qanday kod o'zlashtirmaydi. "Iz yo'q" ham noto'g'ri — Payment qatori, qarz izohi, `sale.paidAmount`, audit_log saqlanadi
- **R17** — portal sahifasi marshruti `xaridlar/:id`, React Router v6 dinamik segmenti bo'sh qiymat bilan mos kelmaydi; ERP egizlarida hang faqat sun'iy id'siz marshrut bilan qayta tiklangan. Konvensiya uchun ixtiyoriy
- **R-POS** — mexanizm bor, lekin ishlamaydi: 245 005 butun-foizli va 33 326 ikki-kasrli holat **to'liq** tekshirildi, float va BigDecimal jami AYNAN mos keldi (narxlar 100 ga karrali bo'lgani uchun). Chang-qarz faqat sun'iy kirishlarda

## Qayta-audit — CLEAN deb tasdiqlangan (regressiya YO'Q)
- Same-shift va closed-cross-shift'dagi yettala `expectedCash` termi kombinatsiyalari (raqamli tekshirildi); `closeShift` saqlashi; `makeFullPayment` (3df36cc); parallel qisman to'lovlar (`@Version` himoyalaydi); `OVERDUE` o'lik enum; M1 lockout matematikasi; L2 rate-limiter per-entry; webhook secret; cleanupRejected scheduler; SessionsTab rotatsiya bilan; ERP 6 tafsilot sahifasi (faqat portal PurchaseDetail qolgan); i18n kalitlari (o'zgargan sahifalarda ikkala lokal to'liq)

## Tuzatish holati (uchinchi bosqich) — ✅ 23/23

| Commit | Topilmalar |
|---|---|
| `2e76531` | R3 (HIGH — takroriy xarid qatorlari), R8 (takroriy sotuv qatorlari), R1 (axios single-flight) |
| `55a3833` | R6 (netting savdo smenasi bo'yicha), R7 (CANCELLED filtri), R10 (bot tokeni maskalash), R13 (majburiy parol — server gate + forced modal), R12 (least-privilege default), R18 (chat qayta bog'lanmaydi), R20 (rad sababi tozalanadi) |
| `fa02057` | R5 (POS qaytimi clamp), R16 (sessiya oilasi muddati), R19 (qarz to'lovlari filtri), R-RPT (davr + haqiqiy to'lovlar), R-PWD (Unicode siyosat), R-DEBTUI (toast), R-SHOPCART (zaxira clamp), R14 (telefon validatsiyasi) |
| `00e3c3a` | R4 (import zaxirani ustidan yozmaydi), R-STOCK2 (zaxirali mahsulot arxivlanmaydi + arxivlangan sotilmaydi), R-STOCK1 (ledgersiz endpoint olib tashlandi) |
| `147548a` | R11 (qaror xabari AFTER_COMMIT'ga ko'chirildi) |
| `4c9f192` | R9 (davriy hisobot ustunlari keyingi qarz to'lovlaridan tozalandi) |
| `534446d` | R15 (checkout narxlarni qayta oladi, farq bo'lsa mijozdan tasdiq so'raydi) |
| `a8f7e56` | R-RET (`rejectReturn` o'tishi — PENDING/APPROVED → REJECTED, kvotani bo'shatadi) |
| `b8e161d` | R2-qoldiq (pul olingan sotuv bekor qilinmaydi — qaytarish oqimiga yo'naltiriladi) |

R2-qoldiq uchun tanlangan yechim — *bekor qilishda chiqim yozuvi yaratish* emas, *pul olingan sotuvni bekor qilishni taqiqlash*:

- "Bekor qilish" = sotuv umuman bo'lmagan; pul qo'ldan-qo'lga o'tgach bu yolg'on bo'ladi va kassadan chiqqan pul iz qoldirishi shart
- Ikkinchi pul yo'li qo'shish — aynan shu auditning eng og'ir xatolar sinfi (`№4`, `H3`, `R6`, `R7` — bitta pulni ikki kod yo'li turlicha hisoblardi). `SaleReturn` kassadan pul chiqishining yagona manbai bo'lib qoladi
- Qaytarish oqimi buni allaqachon to'g'ri qiladi: pulni qarz/naqd bo'yicha taqsimlaydi, `cashRefunded` ni qaytarayotgan smenaga bog'laydi, chegirma ulushini hisoblaydi, raqamlangan hujjat qoldiradi
- Bitta predikat (`paidAmount > 0`) ikkala holatni qamraydi — dastlabki to'lov ham, keyingi qarz to'lovlari ham (`makePayment` uni oshiradi)
- UX yo'qotilmadi: qaytarish modalida "Hammasini tanlash" yorlig'i bir bosishda barcha qatorlarni to'ldiradi

---

## Eslatmalar

- **Qator raqamlari** topilma qayd etilgan paytdagi holatga tegishli: 1-bosqich — `c576d5d`, 2-bosqich — `e217939`, 3-bosqich — `224430a`. Tuzatishlardan keyin ular siljigan.
- **1-bosqich commitlari:** `1fdaa48` (№3), `5895e93` (№4), `aad43a0` (№2), `732fdf1` (№1), `673b779` (№5). Tozalash migratsiyasi `e217939` dastlab V38 sifatida qo'shilib, raqam band bo'lgani uchun keyin **V40** ga ko'chirilgan.
- **Testlar nuqsonli xatti-harakatni qulflab qo'yishi mumkin.** Uch marta shunday bo'ldi: `CashShiftReportTest.cashRefundReducesExpectedCash` (qaytarimni servis oqimisiz qurib, ikki marta ayirishni yashirgan), `approveCreatesEmployeeWithAccount` (arizachining o'z rolini olishini "to'g'ri" deb tasdiqlagan), `TelegramNotifierTest` (token sizib chiqadigan satrni ko'rsatib turgan). Tuzatishda bunday testlarni ham yangilash kerak bo'ldi.
- **Adversarial tekshiruv o'zini oqladi:** 3-bosqichda 26 da'vodan 3 tasi rad etildi (jumladan bitta HIGH — arifmetikasi xato edi), 6 tasining jiddiyligi pasaytirildi. Ya'ni asossiz refaktoring qilinmadi.
- **Parallel sessiyalar** bir vaqtda ishlaganda migratsiya raqamlari to'qnashdi (ikkita V40) — buni `FlywayMigrationNamingTest` ushladi. Yangi migratsiya qo'shishdan oldin `git pull` qilish kerak.

---

# QAYTA AUDIT — parallel sessiyaning raqamlashi (arxiv)

Xuddi shu `224430a` holatida **parallel sessiya** ham qayta audit o'tkazgan va
topilmalarni O'Z raqamlashi bilan yozgan edi. Topilmalar to'plami ustidagi
"3-bosqich" bo'limi bilan bir xil — faqat identifikatorlar boshqacha. Ikki
xil raqamlash chalkashtirmasligi uchun asl ro'yxat quyidagi moslik jadvaliga
qisqartirildi; barcha tafsilotlar (dalillar, ssenariylar, tuzatish
tavsiflari) yuqoridagi **3-BOSQICH** bo'limida turibdi.

| Parallel sessiya | Ushbu hujjatda | Holat |
|---|---|---|
| R1 — axios single-flight yo'q | R1 | ✅ `2e76531` |
| R2 — `cancelSale` to'lovni o'zlashtiradi | R2 | ⚠️ asosiy da'vo RAD ETILDI (arifmetika xato); qoldiq — pul olingan sotuv bekor qilinmaydi ✅ `b8e161d` |
| R3 — ikki ochiq smena orasidagi qaytarim | R6 | ✅ `55a3833` |
| R4 — bitta so'rovdagi takroriy qatorlar (purchase + sale) | R3 va R8 | ✅ `2e76531` |
| R5 — Excel import zaxirani ustidan yozadi | R4 | ✅ `00e3c3a` |
| R6 — POS qaytim puli `paidAmount`da | R5 | ✅ `fa02057` |
| R7 — sessiya tozalash `expiresAt` bo'yicha | R16 | ✅ `fa02057` |
| R8 — `sale.status <> CANCELLED` filtri yo'q | R7 | ✅ `55a3833` |
| R9 — davr hisoboti keyingi to'lovlarni singdiradi | R9 | ✅ `4c9f192` |
| R10+ — xodim ro'yxatga olish, Telegram, parol siyosati, do'kon savati va boshqalar | R10–R20, R-* | ✅ hammasi yopilgan |

**Muhim farq:** parallel sessiya topilmalarni adversarial tekshiruvsiz
ro'yxatlagan va ularning uchtasini HIGH deb baholagan. Tekshiruvdan keyin
ulardan bittasi butunlay rad etildi (R2 — arifmetikasi xato edi), yana
oltitasining jiddiyligi pasaytirildi. Yakuniy tasnif — 3-bosqich bo'limida.
