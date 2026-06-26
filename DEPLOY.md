# Protektor (Shina-EPR) — Coolify deploy qo'llanmasi

> Bu hujjat **A-guruhi** (jonli deploy + kreditsiallar) uchun. Kod tayyor va config-gated —
> bu yerda faqat Coolify'da servislarni yaratish, env'larni qo'yish va tekshirish qoladi.

## Arxitektura — 3 servis

| Servis | Manba | Port | Izoh |
|---|---|---|---|
| **PostgreSQL** | Coolify Database (yoki Postgres servis) | 5432 | DB `shina_epr_db`. Backend Flyway migratsiyalarni (V1…V25) startup'da qo'llaydi. |
| **Backend** | `shina-magazin-api/Dockerfile` | 8183 | Spring Boot, context-path `/api`. Prod profil. |
| **Frontend** | `shina-magazin-front/Dockerfile` | 80 | Vite→nginx; `/api`ni backend'ga proxy qiladi (same-origin). |

**Tarmoq:** frontend nginx `/api` → `http://backend:8183/api/` (Coolify ichki tarmoq). Backend Coolify servis nomi **`backend`** bo'lsin (yoki `nginx.conf`dagi `proxy_pass` hostini moslang). Brauzer hamma narsani bitta domendan ko'radi → **CORS shart emas**.

---

## 1. PostgreSQL
- Coolify'da PostgreSQL yarating; DB nomi **`shina_epr_db`**, foydalanuvchi + parol belgilang.
- Backend shu DB'ga ulanadi (quyidagi env). Migratsiyalar avtomatik (Flyway).

## 2. Backend (`shina-magazin-api`)
Coolify'da yangi **Application** → manba: repo, **Build Pack: Dockerfile**, papka `shina-magazin-api`.

**Majburiy env:**
| Env | Qiymat |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` _(Dockerfile'da default bor)_ |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://<db-host>:5432/shina_epr_db` |
| `SPRING_DATASOURCE_USERNAME` | _(PG user)_ |
| `SPRING_DATASOURCE_PASSWORD` | _(PG parol)_ |
| `JWT_SECRET` | base64 maxfiy kalit (kuchli, tasodifiy — default'ni ALMASHTIRING) |

**Rasm storage (B4):**
| Env | Qiymat |
|---|---|
| `SHOP_STORAGE_DIR` | `/data/uploads` _(Dockerfile default)_ |
| `SHOP_STORAGE_PUBLIC_BASE_URL` | `/api/uploads` _(same-origin default; backend alohida domenda bo'lsa to'liq URL)_ |

> 🔴 **PERSISTENT VOLUME:** Coolify'da backend'ga volume qo'shing, mount yo'li **`/data/uploads`**.
> Aks holda har deploy'da yuklangan mahsulot rasmlari **yo'qoladi**.

**To'lov (Payme/Click) — jonli qilganda (B1/B4):**
| Env | Qiymat |
|---|---|
| `SHOP_RETURN_URL` | `https://<domen>/buyurtma` |
| `PAYME_ENABLED` / `PAYME_MERCHANT_ID` / `PAYME_KEY` | `true` + merchant kreditsiallari |
| `CLICK_ENABLED` / `CLICK_MERCHANT_ID` / `CLICK_SERVICE_ID` / `CLICK_SECRET_KEY` | `true` + kreditsiallar |

Webhook URL'larini provayder kabinetida ro'yxatdan o'tkazing:
- Payme: `https://<domen>/api/v1/payments/payme`
- Click: `https://<domen>/api/v1/payments/click/prepare` va `.../complete`

**Xabarnoma (SMS/email) — jonli qilganda (F7):**
| Env | Qiymat |
|---|---|
| `SHOP_NOTIFY_SMS` | `true` |
| `SHOP_NOTIFY_EMAIL` | `true` (mijoz email bersa) |
| `SHOP_NOTIFY_EMAIL_FROM` | `Protektor <no-reply@<domen>>` |
| `SPRING_MAIL_HOST` / `SPRING_MAIL_PORT` / `SPRING_MAIL_USERNAME` / `SPRING_MAIL_PASSWORD` | SMTP kreditsiallari |

> ⚠️ **SMS faqat STUB** (`LogSmsSender` — log yozadi, haqiqiy yubormaydi). Jonli SMS uchun
> provayder (masalan **Eskiz.uz**) `SmsSender` implementatsiyasi yozilishi kerak (KOD), so'ng kreditsial.
> Email esa SMTP kreditsiali bilan ishlaydi (kod tayyor).

## 3. Frontend (`shina-magazin-front`)
Coolify'da yangi **Application** → **Build Pack: Dockerfile**, papka `shina-magazin-front`.

**Build-arg:**
| Build Arg | Qiymat |
|---|---|
| `VITE_SITE_URL` | `https://<domen>` _(OG/Twitter va sitemap absolyut URL uchun; bo'sh = relativ)_ |

Domen (Coolify'da) shu frontend servisiga ulanadi. `nginx.conf` `/api`ni `backend:8183`ga proxy qiladi — backend servis nomi mos bo'lsin.

---

## Deploy tartibi
1. **PostgreSQL** yarating (DB `shina_epr_db` + user/parol).
2. **Backend** application yarating → env'larni qo'ying (DB, JWT_SECRET, storage) → **persistent volume `/data/uploads`** → deploy. Loglarda Flyway `V1…V25` muvaffaqiyatli + `Started ShinaMagazinApiApplication` ni tekshiring.
3. **Frontend** application yarating → build-arg `VITE_SITE_URL` → domen ulang → deploy.
4. (Jonli) to'lov + SMS-provider + SMTP env'larini qo'shing.

## Post-deploy checklist
- [ ] Backend boot toza (Flyway V25, HikariPool ulandi).
- [ ] Frontend ochiladi; do'kon `/`, ERP `/admin`, mijoz kabineti `/hisob`, login `/kirish`.
- [ ] ERP'da mahsulotga rasm yuklash → storefront'da ko'rinadi (volume ishlayapti).
- [ ] Guest buyurtma → ERP `/admin/shop-orders`'da ko'rinadi + (SMS yoqilgan bo'lsa) log/SMS.
- [ ] OG: `<domen>` Telegram'da ulashilganda karta ko'rinadi (`VITE_SITE_URL` to'g'ri).
- [ ] (Jonli to'lov) Payme/Click sandbox → webhook → `paymentStatus=PAID`.
- [ ] CI (GitHub Actions) yashil.

## Eslatmalar
- **CORS:** prod same-origin (nginx proxy) → CORS shart emas. Agar frontend ALOHIDA domenda bo'lsa,
  `WebConfig.corsConfigurationSource` origin'lari (hozir localhost qattiq yozilgan) prod domenni
  o'z ichiga olishi kerak — bu holda env-driven CORS qo'shish kerak bo'ladi.
- **Lokal to'liq test (ixtiyoriy):** `docker compose`/Coolify'siz ham har servisni alohida ishga
  tushirib ko'rsa bo'ladi (backend `mvnw spring-boot:run`, frontend `npm run dev`) — README'ga qarang.
- Batafsil bajarilgan ishlar va qarorlar: `QOLGAN-ISHLAR.md`.
