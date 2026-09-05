# Protektor (Shina-EPR) — Coolify deploy qo'llanmasi

> Deploy oqimi **faktoring-servis** loyihasi kabi: `master`'ga push → **GitHub Actions** testlar +
> Docker image'larni quradi (og'ir ish GitHub'da) → **ghcr.io**'ga push → **Coolify webhook** bitta
> Compose stack'ni qayta deploy qiladi. Server faqat tayyor image'ni tortadi — **serverda build YO'Q**.

## Arxitektura — bitta Compose resurs (`infra/coolify/docker-compose.yml`)
| Servis | Image | Port | Izoh |
|---|---|---|---|
| **db** | `postgres:16-alpine` | 5432 | DB `shina_epr_db`. Flyway migratsiyalar startup'da. |
| **backend** | `ghcr.io/shavkatbegmatov/shina-epr-api:latest` | 8183 | Spring Boot, prod profil, context-path `/api`. |
| **frontend** | `ghcr.io/shavkatbegmatov/shina-epr-front:latest` | 80 | nginx; `/api`ni `BACKEND_HOST` (=`backend`) servisiga proxy qiladi. |

Frontend nginx `/api` → backend (Docker DNS, `BACKEND_HOST`/`BACKEND_PORT` env). Brauzer bitta
domendan ko'radi → **CORS shart emas**. Domen faqat frontend'ga ulanadi; backend tashqariga ochilmaydi.

---

## 1. GitHub sozlash (avtomatik deploy uchun)
Repo → **Settings → Secrets and variables → Actions**:

**Secrets:**
| Secret | Qiymat |
|---|---|
| `COOLIFY_WEBHOOK_URL` | Coolify **Compose resurs** deploy webhook URL |
| `COOLIFY_API_TOKEN` | Coolify API token (Bearer) |

> ℹ️ `JWT_SECRET` qiymatidagi bo'shliq va satr belgilari (masalan `openssl rand -base64 64`
> ning 64 ustunli bo'linishi) ilova tomonidan olib tashlanadi — aks holda jjwt dekoderi
> ichki satr belgisini rad etib, backend umuman ishga tushmaydi. Baribir sirni
> **bir qatorda** saqlang: `openssl rand -base64 32` bo'linmasdan chiqadi.

> ⚠️ Deploy endpointi **POST** talab qiladi. Coolify uni GET'dan POST'ga o'zgartirgan
> (`405 {"message":"This endpoint has changed to a POST request."}`), shuning uchun
> qo'lda sinaganda ham `-X POST` bering:
> ```
> curl -X POST -d '' -H "Authorization: Bearer $COOLIFY_API_TOKEN" "$COOLIFY_WEBHOOK_URL"
> ```

**Variables:**
| Variable | Qiymat |
|---|---|
| `DEPLOY_ENABLED` | `true` (deploy job'ni yoqadi; bo'lmasa skip — CI yashil qoladi) |
| `VITE_SITE_URL` | `https://<domen>` (OG/sitemap absolyut URL; bo'sh = relativ) |

> `GITHUB_TOKEN` (avtomatik) ghcr'ga push uchun yetarli. `build-and-push` job har `master` push'da
> image quradi+push qiladi (GHA layer cache bilan). Webhook image'lar push bo'lgandan **keyin**
> chaqiriladi — eski image tortilib qolish poygasi yo'q.

## 2. Server — bir martalik tayyorgarlik
GHCR image'lari private bo'lgani uchun serverda **bir marta** login qilinadi (Coolify → Terminal):

```bash
docker login ghcr.io -u shavkatbegmatov -p <GITHUB_PAT>
```

PAT olish: GitHub → Settings → Developer settings → Personal access tokens (classic) → faqat
**read:packages** ruxsati bilan.

## 3. Coolify — bir martalik setup
1. **Project** yarating (masalan "Protektor") → **+ New Resource** → **Docker Compose** →
   repo `https://github.com/shavkatbegmatov/Shina-EPR`, branch `master`.
2. **Docker Compose location**: `infra/coolify/docker-compose.yml`
3. **Environment Variables** (Coolify UI'da):

| ENV | Qiymat | Izoh |
|---|---|---|
| `DB_PASSWORD` | (kuchli parol) | **majburiy** |
| `JWT_SECRET` | (kuchli base64) | **majburiy** — o'rnatilmasa ilova ishga TUSHMAYDI |
| `ADMIN_INITIAL_PASSWORD` | (kuchli parol) | tavsiya etiladi — pastdagi izohga qarang |
| `DB_NAME` / `DB_USERNAME` | `shina_epr_db` / `shina_epr_user` | default'lar bor |
| `PAYME_*`, `CLICK_*`, `SHOP_RETURN_URL` | — | jonli to'lov yoqilganda |
| `SHOP_NOTIFY_SMS/EMAIL` | — | jonli xabarnoma yoqilganda |
| `SPRING_MAIL_*` | — | ⚠️ **hozircha yetmaydi** — pastdagi izohga qarang |
| `TELEGRAM_BOT_TOKEN` | (@BotFather tokeni) | Telegram xabarnomalari uchun — pastdagi izohga qarang |
| `TELEGRAM_MODE` | `webhook` | mijozlar bot orqali ro'yxatdan o'tishi uchun — pastdagi izohga qarang |
| `TELEGRAM_WEBHOOK_URL` | `https://<domen>/api/v1/telegram/webhook` | `TELEGRAM_MODE=webhook` bo'lsa **majburiy** |
| `TELEGRAM_WEBHOOK_SECRET` | `openssl rand -hex 32` | `TELEGRAM_MODE=webhook` bo'lsa **majburiy** |
| `SHOP_PUBLIC_BASE_URL` | `https://<domen>` | bot xabaridagi "kabinetga kirish" havolasi |

4. **Domen** (Coolify UI'da): `frontend` servisiga `https://<domen>` (port 80) — SSL avtomatik
   (Traefik + Let's Encrypt). Backend'ga domen ULANMAYDI.
5. **Auto Deploy'ni O'CHIRING** (resurs sozlamalarida) — deploy'ni GitHub Actions webhook
   boshqaradi (image tayyor bo'lgandan keyin). **Deploy webhook** URL'ini oling → GitHub secret
   `COOLIFY_WEBHOOK_URL`; API token → `COOLIFY_API_TOKEN`.
6. GitHub'da `DEPLOY_ENABLED=true` variable qo'ying → keyingi `master` push to'liq avtomatik.

> **`JWT_SECRET`** — default qiymat YO'Q. O'rnatilmasa Spring ishga tushishda xato beradi
> (bu ataylab: ilgari repoda ochiq turgan default kalit bilan token soxtalashtirish mumkin edi).
> Generatsiya: `openssl rand -base64 32`. Kalitni almashtirish barcha joriy sessiyalarni bekor qiladi.
>
> **`ADMIN_INITIAL_PASSWORD`** — `admin` akkauntining boshlang'ich paroli. Seed migratsiyalari
> (`V2`/`V3`) `admin/admin123` yaratadi va bu hash'lar repoda ochiq, shuning uchun ishga tushishda
> `DefaultCredentialGuard` parolni **majburan almashtiradi**. Bu env o'rnatilgan bo'lsa — o'sha parol
> qo'yiladi; **bo'sh bo'lsa tasodifiy parol generatsiya qilinib backend logiga WARN darajasida
> bir marta yoziladi** (`docker logs` orqali oling). Har ikki holatda ham birinchi kirishda parolni
> almashtirish talab qilinadi. `seller` namuna akkaunti har doim tasodifiy parolga o'tkaziladi.
>
> **`SPRING_MAIL_*` (email xabarnomasi) — Coolify UI'ga yozish YETARLI EMAS.** Compose'da
> konteynerga faqat `backend.environment:` da e'lon qilingan o'zgaruvchilar uzatiladi; u yerda esa
> hech qanday `SPRING_MAIL_*` yo'q. Ya'ni ularni Coolify'da qo'ysangiz ham backend ko'rmaydi va
> email **xatosiz, jimgina** o'chiq qolaveradi (`JavaMailSender` bo'lmasa `OrderNotificationService`
> email qadamini tashlab ketadi). Yoqish uchun `infra/coolify/docker-compose.yml` ga ham qo'shish kerak.
> ⚠️ Qo'shganda `${SPRING_MAIL_HOST:-}` kabi **bo'sh default bermang**: boshqa ixtiyoriy env'lardan
> farqli, `spring.mail.host` Spring'ning avtosozlash SHARTI — bo'sh qiymat ham "mavjud" hisoblanadi va
> JavaMailSender'ni yaroqsiz host bilan ko'taradi. Faqat email kerak bo'lganda qo'shing.
>
> **`TELEGRAM_BOT_TOKEN`** — ixtiyoriy; o'rnatilmasa Telegram xabarnomalari jimgina o'chiq turadi.
> Olish: Telegramda [@BotFather](https://t.me/BotFather) → `/newbot`. Token ATAYLAB faqat env'da
> saqlanadi — u botning to'liq kaliti, `app_settings` esa sozlamalar API'sida ko'rinadi va audit
> jurnaliga tushadi, ya'ni `SETTINGS_VIEW` ruxsati bor har bir xodim uni ko'rib qolardi.
> Chat ID, yoqish/o'chirish va voqea turlari ERP → Sozlamalar → Telegram sahifasidan boshqariladi;
> o'sha yerda "Sinov" tugmasi sozlashni tekshiradi. **Muhim:** bot sizga xabar yubora olishi uchun
> avval siz botga `/start` yozishingiz kerak (guruhga qo'shsangiz — botni guruhga a'zo qiling).
>
> **`TELEGRAM_MODE`** — bot mijozlarning xabarini ham ESHITISHI kerakmi. Yuqoridagi
> xabarnomalar (chiquvchi) bundan mustaqil va `off` da ham ishlayveradi.
> - `off` (default) — mijozlar bot orqali ro'yxatdan o'ta olmaydi.
> - `webhook` — **prod uchun to'g'ri variant**: Telegram o'zi POST qiladi, doimiy so'rov yo'q.
>   `TELEGRAM_WEBHOOK_URL` va `TELEGRAM_WEBHOOK_SECRET` ikkalasi ham majburiy — sirsiz rejim
>   ishga TUSHMAYDI. Sabab: endpoint `permitAll` (Telegram bizning JWT'imizni bilmaydi), ya'ni sir
>   yagona to'siq. Usiz manzilni topgan hujumchi soxta "kontakt" yuborib, istalgan raqamni
>   o'zining Telegramiga bog'lab, mijoz akkauntini bosib olardi.
> - `polling` — ommaviy HTTPS manzil kerak emas, shuning uchun **lokal dev** uchun yagona
>   ishlaydigan variant (ngrok shart emas).
>
> Yoqilgandan keyin ERP → Sozlamalar → Telegram → **"Mijozlar ro'yxatdan o'tishi"** ni yoqing va
> **bot username**ini kiriting — do'kon `/kirish` sahifasida "Telegram orqali ro'yxatdan o'tish"
> tugmasi shundan keyin paydo bo'ladi. Sozlama va username ikkalasi ham bo'lmasa tugma
> ko'rsatilmaydi (ishlamaydigan havola bermaslik uchun).

> Volume'lar compose'da: `postgres_data` (DB), `uploads_data` (`/data/uploads` — mahsulot
> rasmlari) va `backups_data` (kunlik `pg_dump`). Coolify UI'da `postgres_data` uchun
> scheduled backup ham yoqilsa — ikki mustaqil nusxa bo'ladi.
>
> **Muqobil (Coolify'siz oddiy VPS):** repo ildizidagi `docker-compose.yml` (port 80 ochadi):
> `docker compose pull && docker compose up -d`. Lokal to'liq test: `docker compose -f docker-compose.dev.yml up`.

### Backup va tiklash
`db-backup` sidecar'i har kuni 03:00 (Toshkent) da `pg_dump | gzip` ni `backups_data`
volume'iga yozadi va `BACKUP_KEEP_DAYS` (default 14) kundan eskisini o'chiradi. Ilgari backup
faqat "Coolify UI'da yoqish tavsiya etiladi" degan eslatma edi — repodan bor-yo'qligini bilib
bo'lmasdi, Flyway migratsiyalari esa qaytarilmas.

```bash
# Nusxalar ro'yxati (Coolify → Terminal, yoki serverda)
docker compose exec db-backup ls -lh /backups
# Serverga ko'chirib olish
docker compose cp db-backup:/backups/shina_epr_db_2026-09-03_0300.sql.gz ./
# TIKLASH (ehtiyot: mavjud ma'lumot ustidan yoziladi; avval backend'ni to'xtating)
docker compose stop backend
gunzip -c shina_epr_db_2026-09-03_0300.sql.gz | docker compose exec -T db psql -U shina_epr_user -d shina_epr_db
docker compose start backend
```

### Orqaga qaytarish (rollback)
CI har commit'ni `:<sha>` bilan, `release.yml` esa `vX.Y.Z` tegi bilan GHCR'ga push qiladi.
Compose fayllari `IMAGE_TAG` env'ini o'qiydi (default `latest`):

1. Coolify → resurs → Environment Variables → `IMAGE_TAG=<sha yoki vX.Y.Z>` → Redeploy.
2. Muammo bartaraf etilgach `IMAGE_TAG`ni o'chiring (yoki `latest` qiling) → Redeploy.

Migratsiya bilan kelgan versiyadan orqaga qaytishda sxema eski koddan yangi bo'lib qoladi
(`ddl-auto=validate` yangi ustunlarga indamaydi, lekin o'chirilgan/qayta nomlangan ustun bo'lsa
ishga tushmaydi) — bunday holatda backup'dan tiklash kerak.

### CI xabarnomalari va uptime
Repo **Secrets** ga `TELEGRAM_BOT_TOKEN` va `TELEGRAM_ALERT_CHAT_ID` qo'yilsa:
- `ci.yml` — master'da lint/test/build/deploy yiqilsa Telegram'ga yozadi (deploy SKIP bo'lgani
  ko'rinadi — 2026 avgustdagi "yetti commit prodga chiqmadi" holati takrorlanmasin);
- `uptime.yml` — har 15 daqiqada `/`, `/api/actuator/health`, `/api/v1/settings/public` ni
  tekshiradi, tushsa xabar beradi.
`DEPLOY_ENABLED` o'rnatilmagan bo'lsa run sahifasida ogohlantirish (warning annotation) chiqadi.

### Ixtiyoriy env'lar
| ENV | Default | Izoh |
|---|---|---|
| `IMAGE_TAG` | `latest` | Rollback uchun (yuqorida) |
| `BACKEND_MEMORY_LIMIT` | `1024M` | Backend konteyner limiti; JVM heap 75% oladi |
| `BACKUP_KEEP_DAYS` | `14` | Backup nusxalarini saqlash muddati |
| `JWT_ACCESS_EXPIRATION_MS` | `1800000` (30 daqiqa) | Access token muddati; refresh 7 kun |

## 4. Avtomatik deploy oqimi
`master`'ga push → CI: frontend (lint/test/build) + backend (compile) → image build/push (ghcr,
`latest`+`sha` teglar) → Coolify webhook (DEPLOY_ENABLED=true bo'lsa) → Coolify `pull_policy: always`
bilan yangi image'larni tortib stack'ni qayta ko'taradi. Migratsiyalar Flyway orqali avtomatik.

Relizlar: `git tag vX.Y.Z && git push origin vX.Y.Z` → `release.yml` GitHub Release yaratadi
(CHANGELOG.md'dan).

## Deploy'dan OLDIN — ma'lumotga tegadigan migratsiya bo'lsa
- [ ] Yangi backup oling: `docker compose exec db-backup sh -c 'pg_dump | gzip > /backups/manual_$(date +%F_%H%M).sql.gz'`
      (kunlik nusxa 03:00 da; Flyway migratsiyalari **avtomatik va qaytarilmas** ishlaydi;
      ba'zilari mavjud qatorlarni o'zgartiradi, masalan `V40` fantom qarzlarni yopadi).
- [ ] Yangi migratsiyalarni ko'ring:
      `git diff --name-only <oxirgi-deploy-sha>..HEAD -- shina-magazin-api/src/main/resources/db/migration`

## Post-deploy checklist
- [ ] GitHub Actions: frontend/backend CI + build-and-push yashil; deploy job ishladi.
      ⚠️ **CI qizil bo'lsa deploy job SKIP bo'ladi va hech narsa o'chmaydi** — eski image xizmat
      qilaveradi, ya'ni push qilingan ish prodga chiqmagani sezilmasligi mumkin. Har push'dan keyin
      Actions'ni ko'ring (lokalda `.githooks` buni oldindan ushlaydi — `AGENTS.md`).
- [ ] Backend log: Flyway migratsiyalar + `Started`.
- [ ] **Proksi sarlavhalari** (`forward-headers-strategy: native` ga o'tildi): storefront'ni
      Telegram'da ulashib OG kartani tekshiring (absolyut URL `https://<domen>` bo'lishi kerak,
      ichki host emas), va login logida IP haqiqiy mijoz manzili ekanini ko'ring
      (Traefik konteyner IP'si `172.x` EMAS). Ikkalasi ham RemoteIpValve orqali ishlaydi.
- [ ] **Xavfsizlik:** logdagi `XAVFSIZLIK: 'admin' akkaunti ...` qatorini toping → shu parol bilan
      kiring → darhol almashtiring. `admin123` bilan kirish ishlamasligini tasdiqlang.
- [ ] `https://<domen>`: do'kon `/`, ERP `/admin`, kabinet `/hisob`, login `/kirish`.
- [ ] `https://<domen>/api/api-docs` **401/404** qaytarsin (prodda OpenAPI o'chiq), `curl -I` da
      `Content-Security-Policy` va `Strict-Transport-Security` sarlavhalari bo'lsin.
- [ ] ERP'da real-time bildirishnoma keladi (WebSocket origin = `CORS_ALLOWED_ORIGINS`).
- [ ] 1 MB dan katta mahsulot rasmi yuklanadi (nginx `client_max_body_size 8m`).
- [ ] ERP'da rasm yuklash → storefront'da ko'rinadi (`uploads_data` volume ishlayapti).
- [ ] Telegram'da `<domen>` ulashish → OG karta (`VITE_SITE_URL`).
- [ ] (Jonli to'lov) Payme/Click sandbox → webhook → `paymentStatus=PAID`.

**Xodimlarga ta'sir qiladigan o'zgarishlar bo'lsa (17.08.2026 relizidagi kabi):**
- [ ] **Hamma bir marta qayta kiradi** — refresh token rotatsiyasi (`V41`) joriy sessiyalarni
      bekor qiladi. Bu kutilgan holat; xodimlarni oldindan ogohlantiring.
- [ ] **Vaqtinchalik parol berilganlar** birinchi kirishda uni almashtirishga majbur — bu tekshiruv
      endi serverda, oynani yopib ketib bo'lmaydi.
- [ ] **`V40` tozalagan qatorlarni ko'rib chiqing** — migratsiya har biriga izoh qoldiradi:
      `SELECT id, sale_id, remaining_amount, status, notes FROM debts WHERE notes LIKE '%V40 tozalash%';`
- [ ] **Kassirlarga eslatmani tarqating** — `KASSIRLAR-UCHUN.md` / `ДЛЯ-КАССИРОВ.md`
      (asosiysi: pul olingan sotuvni bekor qilish o'rniga **Qaytarish** rasmiylashtiriladi).

## Eslatma
- **CORS:** env-driven — `CORS_ALLOWED_ORIGINS` (compose default: `https://protektor.uz`). Brauzer har
  POST'ga Origin yuboradi, shuning uchun same-origin bo'lsa ham prod domen ro'yxatda bo'lishi shart.
  Yangi domen qo'shilsa — vergul bilan shu env'ga qo'shiladi.
- To'lov webhook'lari: Payme `https://<domen>/api/v1/payments/payme`; Click `.../click/prepare` +
  `.../complete`. SMS hozircha stub (`LogSmsSender`) — jonli SMS uchun provider impl kerak.
- Batafsil bajarilgan ishlar: `QOLGAN-ISHLAR.md`.
