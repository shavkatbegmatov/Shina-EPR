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

## 3. 🟡 B) Qaror talab qiladi (avval tanlang, keyin Claude qiladi)

- [ ] **Karta-acquiring:** hozir `CARD → Payme`ga yo'naltirilgan (`ShopPaymentService.initiate`). Alohida karta provayderi (Uzcard/Humo acquiring) kerakmi yoki Payme/Click yetarlimi?
- [ ] **Magazin manzili:** `/magazin`da qoladimi yoki **domen ildizida** (`/`)? (ERP'ni `/admin`ga ko'chirish kerak bo'ladi — `src/router/index.tsx`). SEO uchun muhim.
- [ ] **SEO/SSR:** ommaviy katalog SPA — qidiruv tizimlari uchun SSR/prerender kerakmi (masalan Vite SSR yoki statik prerender)?
- [ ] **Mahsulot rasmlari saqlash joyi:** server diski / S3 / CDN? Qaror bersangiz — yuklash oqimi quriladi (pastda #C4).

---

## 4. 🟢 C) Hoziroq qilinadigan (qaror shart emas, to'liq tekshiriladigan)

> Tavsiya: shulardan boshlash. Hammasi `npm test`/`npm run build`/preview bilan tekshiriladi.

- [ ] **C1 — Test qamrovi.** Yangi do'kon kodi uchun unit testlar (hozir faqat `src/shop/components/ProductCard.test.tsx` bor):
  - `src/shop/store/`: `cartStore`, `wishlistStore`, `compareStore` (COMPARE_MAX), `orderStore` (`generateOrderNo`, `calcDeliveryFee`), `recentStore` (MAX 8).
  - `src/shop/data/useCatalog.ts` (seam + fallback), `CheckoutPage` validatsiya logikasi.
  - `src/pages/shop-orders/ShopOrdersPage.tsx` (status filtri + mutation) — react-query'ni mock qilib.
  - Eslatma: testlar `pool: 'threads'` da ishlaydi (`vite.config.ts`) — Windows AV fork-timeout'i uchun.
- [ ] **C2 — Yangi buyurtma → xodimga bildirishnoma.** Storefront buyurtma kelganda mavjud ERP notification tizimiga ulash:
  - Backend: `ShopOrderService.createOrder` da `StaffNotification` yaratish (mavjud notification servisi/entity — V7 migratsiya, `staff_notifications`). Websocket orqali xodimga push.
  - Frontend: ERP `notificationsStore` allaqachon bor — yangi tur (`SHOP_ORDER`) qo'shilsa, header bell'da ko'rinadi.
- [ ] **C3 — Storefront SEO meta.** `ShopRouteEffects` (`src/shop/components/ShopRouteEffects.tsx`) sarlavhani o'rnatadi; `description` + `og:title/og:image` meta teglarni ham qo'shing (har route uchun). Katalog/PDP uchun mahsulotga mos meta.
- [ ] **C4 — Buyurtma tasdiq sahifasi: real to'lov holati.** `OrderConfirmationPage` hozir client-side buyurtmani ko'rsatadi (PENDING). To'lovdan qaytgach `GET /v1/orders/{orderNo}` (yoki yangi public status endpoint) bilan real `paymentStatus`ni ko'rsatish (PAID/PENDING). Eslatma: GET hozir himoyalangan — guest uchun **public status-only endpoint** kerak (faqat orderNo+paymentStatus qaytaradi, shaxsiy ma'lumotsiz).
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

1. **AV istisno** qo'shing (yuqorida) → lokal muhit barqaror bo'ladi.
2. **C guruhi** (C1 test → C2 bildirishnoma → C3 SEO → C4 to'lov holati) — qaror shart emas, tekshiriladigan.
3. **B guruhi** qarorlarini bering → tegishli ishlar (rasm yuklash, root routing, SSR).
4. **A guruhi** — kreditsiallar bilan to'lovni jonli qiling + DB'da verify.

> Har bosqichda: build + test yashil → commit → push (avvalgi uslub).
