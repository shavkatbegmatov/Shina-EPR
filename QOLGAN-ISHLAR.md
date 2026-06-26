# Protektor (Shina-EPR) — Qolgan ishlar va davom ettirish rejasi

> Bu fayl ishni boshqa joyda (uyda Claude Code) **noldan kontekst bilan** davom ettirish uchun.
> Hammasi shu yerda yozilgan — alohida xotira shart emas.

---

## 0. Loyiha konteksti

**Protektor** — `Shina Magazin` ERP'ning rebrendi + internet-magazin (storefront). Monorepo:

| Papka | Texnologiya | Port |
|---|---|---|
| `shina-magazin-front` | React 18 + TS + Vite 7 + Tailwind 3 + DaisyUI 4; Zustand; React Query; react-router v6; i18next (uz/ru) | dev: **5183** |
| `shina-magazin-api` | Spring Boot 3.3 (JDK **21**), JPA, Flyway, Spring Security (JWT), PostgreSQL | **8183**, context-path `/api` |

**Baza:** PostgreSQL `localhost:5432`, DB **`shina_epr_db`**, user `shina_epr_user` (`application-dev.yml`).
**GitHub:** `github.com/shavkatbegmatov/Shina-EPR`, branch `master`.

**3 sirt (surface):**
- ERP (xodim): `/` ostida (`MainLayout`, himoyalangan) — `src/pages/*`
- B2B portal (mijoz kabineti): `/kabinet` ostida — `src/portal/*`
- **Storefront (ommaviy magazin): `/magazin` ostida** — `src/shop/*` (arxitektura: `src/shop/README.md`)

---

## 1. ✅ Bajarilgan (Faza 0–5q)

- **F0–F4:** Protektor rebrend; dizayn tokenlari + yagona `themeStore`; `@/ui` primitivlar (Button/Card/Modal/DataTable...); responsive (tablet + icon-rail sidebar); **to'liq ERP i18n (uz/ru)** + `enumLabel` + `locale-parity` test.
- **F5 Storefront (5a–5k):** Home (hero/o'lcham-qidiruvchi/kategoriya/brend/tanlangan), Catalog (filtr + deep-link), PDP (xususiyat+o'xshash+yaqinda ko'rilgan), Savat (drawer), **Checkout (4-bosqich)**, Buyurtma tasdiq + tarix, **Wishlist**, **Compare**, **jonli qidiruv**, **Quick-view**, Kabinet ulanishi.
- **Order backend (5n–5o):** `POST /v1/orders` (guest, narx SERVERDA), `ShopOrder/ShopOrderItem`, Flyway **V23**; xodim API (GET ro'yxat + PATCH holat, `SALES_VIEW`).
- **ERP buyurtma sahifasi (5p):** `/shop-orders` — DataTable + holat filtri + qatordan holat o'zgartirish + to'lov holati badge.
- **To'lov — barcha usul (5q):** `paymentStatus` + Flyway **V24**; `PaymentProperties` (`shop.payment.*`); checkout URL (Payme base64 / Click query); **PaymeWebhookController** (JSON-RPC) + **ClickWebhookController** (Prepare/Complete, MD5); `POST /v1/orders/{orderNo}/pay`; frontend onlayn→provayder redirect. **Stok** rezervatsiya (Product `@Version`). **Rate-limit** (`SimpleRateLimiter`, POST /v1/orders 10/daq/IP).

**Tekshiruv holati:** frontend `npm run build`+`npm test` (44/44) yashil; backend `mvnw compile` EXIT=0. ⚠️ Backend **jonli DB'da ishga tushirib tekshirilmagan** (sandbox/DB yo'q edi).

**Faza 6 / C guruhi (C1–C4, 18.06.2026, uy mashinasi):** ✅ bajarildi va `master`'ga push qilindi (batafsil — 4-bo'lim). Test **44 → 91/91** yashil, frontend build + backend `compile` EXIT=0. C5 hali ochiq (B4 qarorini kutadi).

---

## 2. 🔴 A) Faqat foydalanuvchi qila oladi (kod tayyor, bloklovchi)

- [ ] **To'lovni jonli qilish:** Payme/Click merchant kreditsiallarini `shina-magazin-api/src/main/resources/application.yml` (`shop.payment.*`) yoki env'ga qo'shing:
  ```
  PAYME_ENABLED=true  PAYME_MERCHANT_ID=...  PAYME_KEY=...
  CLICK_ENABLED=true  CLICK_MERCHANT_ID=...  CLICK_SERVICE_ID=...  CLICK_SECRET_KEY=...
  ```
- [ ] **Webhook URL'larini provayder kabinetida ro'yxatdan o'tkazing:**
  - Payme: `https://<domen>/api/v1/payments/payme`
  - Click: `https://<domen>/api/v1/payments/click/prepare` va `.../complete`
- [ ] **Sandbox'da** Payme/Click protokollarini tasdiqlang (kod spec bo'yicha, lekin sandbox'siz sinaб bo'lmadi). Payme uchun to'liq muvofiqlik uchun alohida `payme_transactions` jadvali kerak bo'lishi mumkin.
- [ ] **Jonli DB verify:** `shina_epr_db` bilan backendni ishga tushirib **V23/V24 migratsiya** muammosiz o'tishini + barcha `/v1/catalog`, `/v1/orders`, `/v1/payments/*` endpointlarini sinab ko'ring.
- [ ] **CI** (GitHub Actions) yashilligini tekshiring.

---

## 3. 🟡 B) Qaror talab qiladi → ✅ QAROR QILINDI (18.06.2026)

- [x] **B1 — Karta-acquiring:** ✅ **Payme/Click yetarli** — karta to'lovi Payme/Click orqali (hozirgi `CARD → Payme` yo'naltirish to'g'ri). Alohida Uzcard/Humo acquiring shart emas. Kod o'zgarmaydi.
- [x] **B2 — Magazin manzili:** ✅ **Do'kon domen ildizida (`/`)**, ERP `/admin/...` ga ko'chiriladi. SEO/ulashish uchun. → `src/router/index.tsx` + barcha ERP ichki havolalari + storefront `/magazin` → `/`.
- [x] **B3 — SEO/SSR:** ✅ **Prerender (SSG)** kerak — storefront havolalari ijtimoiy tarmoqlarda (Telegram/Instagram) ulashiladi, link-preview (og:image/title) crawler'ga to'liq HTML kerak. To'liq SSR EMAS (Node server qimmat); Vite statik prerender (`vite-plugin-ssg`/`react-snap` kabi).
- [x] **B4 — Mahsulot rasmlari:** ✅ **S3 / MinIO** (obyekt-saqlash). Rasm upload backend (presigned URL yoki proxy) + `Product.imageUrl` to'liq URL. og:image va C5 shunga tayanadi.

**B-implement tartibi (bog'liqlik bo'yicha):**
1. **B2 routing** — do'kon ildizga, ERP `/admin` (asos; prerender shunga tayanadi). Eng katta/xavfli — alohida bosqich, diqqat bilan.
2. **B4 rasm (S3/MinIO) + C5 upload** — mahsulot rasmlari (og:image uchun ham kerak).
3. **B3 prerender** — routing + rasm tayyor bo'lgach, `/` (do'kon) sahifalarini statik HTML'ga.
4. **B1** — kod o'zgarmaydi (Payme/Click).

---

## 4. 🟢 C) Hoziroq qilinadigan (qaror shart emas, to'liq tekshiriladigan)

> ✅ **C1–C4 bajarildi** (18.06.2026, uy mashinasi). Har biri build+test yashil → alohida commit → push.
> Yakuniy tekshiruv: frontend `npm test` **91/91** + `npm run build` yashil; backend `mvnw compile` EXIT=0.

- [x] **C1 — Test qamrovi.** ✅ `a175ee7` — 40 yangi test (8 fayl):
  - `src/shop/store/`: `cartStore`, `wishlistStore`, `compareStore` (COMPARE_MAX), `orderStore` (`generateOrderNo`, `calcDeliveryFee`), `recentStore` (MAX 8).
  - `src/shop/data/useCatalog.ts` (seam + fallback), `CheckoutPage` validatsiya, `ShopOrdersPage` (status filtri + mutation, react-query mock).
  - Testlar `pool: 'threads'` da ishlaydi (`vite.config.ts`).
- [x] **C2 — Yangi buyurtma → xodimga bildirishnoma.** ✅ `957a3dc` — `ShopOrderService.createOrder` endi `StaffNotificationService.notifyNewShopOrder` ni chaqiradi (`StaffNotificationType.ORDER`, `referenceType "SHOP_ORDER"`); global bildirishnoma DB'ga yoziladi + WebSocket `/topic/staff/notifications` push (SaleService.notifyNewOrder bilan bir naqsh). Frontend `ORDER` turini allaqachon qo'llab-quvvatlaydi — o'zgarmadi. ⚠️ Jonli DB'da tekshirilmagan (A guruhi).
- [x] **C3 — Storefront SEO meta.** ✅ `b1738c7` — `useDocumentMeta` hook (`document.title` + `description` + `og:*` upsert, react-helmet'siz); `ShopRouteEffects` route handle'dan default meta o'rnatadi; storefront route'larga `description` qo'shildi; PDP mahsulot yuklanganda nom/narx/rasm bilan override (`og:type=product`). 7 test.
- [x] **C4 — Buyurtma tasdiq: real to'lov holati.** ✅ `1a025a0` — ommaviy `GET /v1/orders/{orderNo}/status` (`ShopOrderStatusResponse` — orderNo+status+paymentStatus, shaxsiy ma'lumotsiz; SecurityConfig permitAll); `OrderConfirmationPage` real `paymentStatus` badge ko'rsatadi va PENDING/PROCESSING bo'lsa 4s'da poll qiladi (webhook PAID qilguncha). i18n `shop.order.payStatus` (uz/ru). ⚠️ Jonli DB'da tekshirilmagan (A guruhi).
- [ ] **C5 — Mahsulot rasm yuklash** (B4 qaror bo'lgach): ERP mahsulot sahifasida rasm upload + `Product.imageUrl` to'ldirish; storefront `ProductImage` real rasmni ko'rsatadi (kod tayyor — `src` bo'lsa rasmni, bo'lmasa SVG).

---

## 5. 📋 D) Asl rejadagi Faza 6 (kattaroq, ixtiyoriy)

- [ ] Portal `/kabinet` → `/hisob` marshrutlarini birlashtirish + B2B/B2C uyg'unligi.
- [ ] Storefront mijoz akkaunti (buyurtma tarixi akkauntga bog'langan) — hozir guest + client-side tarix + Kabinet havolasi bor.
- [ ] Email/SMS xabarnomalar (buyurtma tasdig'i mijozga) — **SMTP/SMS provider kerak** (kreditsial/qaror).

---

## 6. 🛠 Texnik eslatmalar (MUHIM — vaqtni tejaydi)

**Build / test / run:**
```bash
# Frontend (papka: shina-magazin-front)
npm install
npm run build      # tsc -b && vite build  (TS gate)
npm test           # vitest (pool:threads) — 44 test
npm run lint       # eslint
npm run dev        # http://localhost:5183  (/magazin = storefront)

# Backend (papka: shina-magazin-api) — JDK 21 KERAK
$env:JAVA_HOME="C:\Users\Sh.Begmatov\.jdks\ms-21.0.11"   # JBR 25 Lombok'ni buzadi!
.\mvnw.cmd compile          # yoki spring-boot:run (PostgreSQL kerak)
# Backend /api context-path'da: http://localhost:8183/api/v1/...
```

**⚠️ Mashina muhiti (bu kompyuterda kuzatilgan):**
- **Antivirus/xavfsizlik dasturi lokal jarayon va ulanishlarni vaqti-vaqti to'sadi** — vitest fork-timeout, vite dev-server "connection refused", postgres IPv4 (127.0.0.1:5432) timeout — hammasi shundan. **Yechim:** AV istisno qo'shing — `postgres.exe`, `java.exe`, `node.exe`, **port 5432**, papka **`D:\PROJECTS`**. (Uyda boshqa mashinada bu muammo bo'lmasligi mumkin.)
- `vite.config.ts` da `test.pool: 'threads'` aynan shu fork-timeout uchun qo'yilgan — **o'chirmang**.

**i18n pattern:** `src/i18n/locales/{uz,ru}.json`. `locale-parity.test.ts` uz/ru kalit muvozanatini majburlaydi. Yangi kalit qo'shishda **ikkala tilga ham** qo'shing. Ko'p kalit uchun: kichik Node skript yozib JSON'ga merge qilish (avvalgi pattern) — `scripts/` ga vaqtincha .cjs yozib, ishlatib, o'chiring.
- ⚠️ Commit xabarini `Out-File`bilan yozmang (BOM qo'shadi) — Write tool bilan faylga yozib `git commit -F` qiling.

**To'lov sozlamasi:** `application.yml` → `shop:payment:` (Payme/Click, default `enabled: false`). Provayder o'chiq bo'lsa checkout URL `null` → frontend tasdiq sahifasiga (PENDING) o'tadi. `ShopPaymentService` da URL yaratish + `markPaid/markFailed`; webhooklar: `PaymeWebhookController`, `ClickWebhookController`.

**Asosiy fayllar:**
- Storefront: `src/shop/` (README bor), routerda `/magazin/*`
- ERP buyurtma: `src/pages/shop-orders/ShopOrdersPage.tsx` + `src/api/shopOrders.api.ts`, route `/shop-orders` (`SALES_VIEW`)
- Backend order/payment: `shina-magazin-api/.../controller/{ShopOrder,ShopPayment,PaymeWebhook,ClickWebhook}Controller.java`, `service/{ShopOrderService,ShopPaymentService}.java`, `entity/ShopOrder*.java`, migratsiya `V23/V24`
- Security: `config/SecurityConfig.java` (storefront permitAll qoidalari)

---

## 7. Tavsiya etilgan tartib

1. **AV istisno** qo'shing (yuqorida) → lokal muhit barqaror bo'ladi. _(Uy mashinasida muammo kuzatilmadi.)_
2. ✅ **C guruhi** (C1 test → C2 bildirishnoma → C3 SEO → C4 to'lov holati) — **bajarildi** (18.06.2026). C5 qoldi (B4 qarorga bog'liq).
3. ✅ **B guruhi** qarorlari berildi (3-bo'lim). Implement: **B2 routing → B4 rasm/C5 → B3 prerender** (B1 kod o'zgarmaydi). ✅ **B2 routing BAJARILDI (26.06.2026)** — do'kon ildizda (`/`), ERP `/admin`da. ← **keyingi qadam: B4 rasm (S3/MinIO) + C5**
4. **A guruhi** — kreditsiallar bilan to'lovni jonli qiling + DB'da verify (C2/C4'ni ham jonli sinash).

> Har bosqichda: build + test yashil → commit → push (avvalgi uslub).

---

## 8. 🔨 Keyingi implement — B guruhi (batafsil; boshqa mashinada davom uchun)

> **Holat (26.06.2026):** C1–C4 ✅ + **B2 routing ✅** bajarildi va push qilindi; B1–B4 qaror ✅ qilindi (3-bo'lim).
> `master` toza va `origin/master` bilan sinxron. **Keyingi implement: B4 rasm (S3/MinIO) + C5.**
>
> **Boshlashdan oldin (yangi mashinada):**
> 1. `git pull` (eng so'nggi `master`).
> 2. `cd shina-magazin-front && npm install` (yangi paketlar bo'lishi mumkin).
> 3. Baseline: `npm run build` + `npm test` (kutilgan: **91/91** yashil); backend `mvnw compile` (JDK 21).
> 4. So'ng quyidagi tartib: **B2 → B4/C5 → B3**.

### B2 — Routing: do'kon ildizga (`/`), ERP `/admin`ga  ✅ BAJARILDI (26.06.2026)

> ✅ **Bajarildi va push qilindi (26.06.2026, 5 commit):**
> - B2.1 `2d467cd` router strukturasi · B2.2 `4674371` storefront havolalar /magazin→/ ·
>   B2.3 `edf84ff` ERP havolalar /→/admin · B2.4 `5825032` auth redirectlari /admin/login ·
>   B2.3-fix `e677dd2` audit-log-extractors havolalari.
> - Auth route'lar: `/admin/login`, `/admin/register`, `/admin/change-password` (tanlangan variant).
> - **Runtime verify (preview :5183):** `/`=do'kon · `/admin`→`/admin/login` · `/kabinet`→`/kabinet/kirish`
>   (portal o'zgarmagan) · noma'lum yo'l→ShopNotFound. Build + test (**94/94**) yashil.
> - Quyidagi reja tarixiy ma'lumot uchun saqlanadi.

**Maqsad:** `domen/` = do'kon (storefront), `domen/admin/...` = ERP. Portal `/kabinet/*` **o'zgarmaydi**.

**Ko'lam (grep, 18.06.2026):** **92** ta mutlaq havola (`to=` / `navigate(`) **39 faylda**; **55** ta `/magazin` reference **17 faylda** (storefront).

**O'zgarishlar:**
1. **Router** (`src/router/index.tsx`):
   - ERP: `path: '/'` (`MainLayout`) → `path: '/admin'`. `index` route → `dashboard` (yoki `/admin` → `/admin/dashboard` redirect).
   - Storefront: `path: '/magazin'` (`ShopLayout`) → `path: '/'`. Ichki yo'llar (`katalog`, `mahsulot/:id`, `checkout`, `buyurtma/:orderNo`, `buyurtmalarim`, `saqlanganlar`, `solishtirish`) relativ — o'zgarmaydi.
   - Oxirgi catch-all `<Navigate to="/" replace />` ni qayta ko'rib chiqish (endi `/` = do'kon).
   - Auth route'lar (`/login`, `/register`, `/change-password`): tavsiya `/admin/login` ... (ERP auth) — yoki qoldirib, faqat redirect'larni moslash.
   - **C3 route handle'lar** (title/description) shu faylda — storefront yo'llari o'zgarganda saqlanadi.
2. **ERP ichki havolalar** `/...` → `/admin/...`: `components/layout/Sidebar.tsx`, `components/layout/Header.tsx` (5), va barcha `src/pages/**` (`to=` / `navigate()`). Maslahat: `adminPath()` helper yoki ehtiyotkor topib-almashtirish; har birini build bilan tekshirish.
3. **Storefront havolalar** `/magazin/...` → `/...`: `src/shop/**` 17 fayl — `ShopHeader.tsx` (13), `ShopHomePage.tsx` (9), `ShopFooter.tsx`, `CheckoutPage`, `OrderConfirmationPage`, `ProductCard`, `QuickViewModal`, `ShopSearchBox`, `TireSizeFinder`, `CartDrawer`, `ComparePage`, `OrdersPage`, `WishlistPage`, `ShopNotFound`.
4. **Auth oqimi:** `pages/auth/LoginPage.tsx` (kirgach redirect), `components/common/ProtectedRoute`, `hooks/useSessionMonitor.ts` + `useCrossTabSync.ts` (`navigate('/login')`), `AccessDenied.tsx`.
5. **Backend:** o'zgarmaydi (API yo'llari `/v1/...` bir xil; `vite.config.ts` proxy `/api` ham o'sha). Faqat frontend routing.

**Xavf:** bitta havola o'tkazib yuborilsa → 404. **Tekshiruv:** `npm run build` (TS) + `npm test` + qo'lda: do'kon `/`, ERP `/admin` (login→dashboard), portal `/kabinet`, 404.
**Tavsiya bosqichlar:** (a) router struktura → (b) storefront `/magazin`→`/` → (c) ERP havolalar `/admin` → (d) auth redirect → (e) build+test+qo'lda klik. Har bosqich build yashil → commit.

### B4 — Mahsulot rasmlari: S3 / MinIO  +  C5 upload oqimi

**Backend (`shina-magazin-api`):**
- Obyekt-saqlash klienti: AWS S3 SDK yoki MinIO Java client. Config `application.yml` → masalan `shop.storage.{endpoint,bucket,accessKey,secretKey,publicBaseUrl}`. Dev uchun lokal **MinIO** (docker) qulay.
- Upload endpoint: tavsiya **backend proxy** — `POST /v1/products/{id}/image` (`MultipartFile` → S3'ga yuklaydi → `Product.imageUrl` ni to'liq public URL bilan to'ldiradi). Himoya: `PRODUCTS_EDIT`. (Muqobil: presigned PUT URL — frontend to'g'ridan S3'ga; keyinroq.)
- `Product.imageUrl` ustuni **allaqachon bor** (entity + DTO + `ProductRequest`). Faqat to'ldirish kerak.
- Rasm o'qish ommaviy bo'lsin (S3 bucket public-read yoki CDN/`publicBaseUrl`).

**Frontend (`shina-magazin-front`):**
- ERP `src/pages/products/ProductDetailPage.tsx` / `ProductsPage.tsx` ga rasm upload UI (drag-drop yoki tugma → `POST .../image`).
- Storefront `src/shop/components/ProductImage.tsx` — **kod tayyor**: `src` bo'lsa rasm, bo'lmasa SVG placeholder. Real `imageUrl` kelishi bilan ishlaydi.
- Bu C5 ni ham yopadi.

### B3 — Prerender (SSG) — B2 va B4 dan KEYIN

**Maqsad:** do'kon sahifalarini (`/`, `/katalog`, `/mahsulot/:id`...) build vaqtida statik HTML'ga "pishirish" → Google + Telegram/Instagram link-preview boshlang'ich HTML'da to'liq kontent (C3 meta teglari + og:image) ni ko'radi.
- **Vosita:** boshlash uchun **`react-snap`** (build'dan keyin puppeteer snapshot — SPA'ga minimal o'zgarish) yoki kuchliroq `vike`/`vite-plugin-ssg`. Tavsiya: avval `react-snap`.
- **Bog'liqlik:** B2 (qaysi yo'llar — `/`, `/katalog`, ...) + B4 (og:image real S3 rasm).
- **Dinamik `/mahsulot/:id`:** build vaqtida katalog API'dan ID ro'yxatini olib, har mahsulotga statik sahifa kerak (mahsulot ko'p bo'lsa — hammasi yoki top N + qolganlari CSR). Bu qadam alohida rejalashtiriladi.
- **Eslatma:** prerender CSR'ni almashtirmaydi — ustiga qo'shadi (hydration). C3 `useDocumentMeta` mantiqi saqlanadi.

### B1 — Acquiring: kod o'zgarmaydi
Payme/Click yetarli (qaror B1). Karta to'lovi Payme/Click orqali. Jonli sozlash **A guruhida** (kreditsiallar + webhook URL + DB verify).

---

> **Qisqacha keyingi qadam:** `git pull` → `npm install` → baseline yashil → **B2 routing** (router struktura'dan boshlang, bosqichma-bosqich, har qadamda build).
