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
| `SHOP_NOTIFY_SMS/EMAIL`, `SPRING_MAIL_*` | — | jonli xabarnoma yoqilganda |
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

> Volume'lar compose'da: `postgres_data` (DB) va `uploads_data` (`/data/uploads` — mahsulot
> rasmlari). Coolify UI'da `postgres_data` uchun scheduled backup yoqish tavsiya etiladi.
>
> **Muqobil (Coolify'siz oddiy VPS):** repo ildizidagi `docker-compose.yml` (port 80 ochadi):
> `docker compose pull && docker compose up -d`. Lokal to'liq test: `docker compose -f docker-compose.dev.yml up`.

## 4. Avtomatik deploy oqimi
`master`'ga push → CI: frontend (lint/test/build) + backend (compile) → image build/push (ghcr,
`latest`+`sha` teglar) → Coolify webhook (DEPLOY_ENABLED=true bo'lsa) → Coolify `pull_policy: always`
bilan yangi image'larni tortib stack'ni qayta ko'taradi. Migratsiyalar Flyway orqali avtomatik.

Relizlar: `git tag vX.Y.Z && git push origin vX.Y.Z` → `release.yml` GitHub Release yaratadi
(CHANGELOG.md'dan).

## Post-deploy checklist
- [ ] GitHub Actions: frontend/backend CI + build-and-push yashil; deploy job ishladi.
- [ ] Backend log: Flyway migratsiyalar + `Started`.
- [ ] **Proksi sarlavhalari** (`forward-headers-strategy: native` ga o'tildi): storefront'ni
      Telegram'da ulashib OG kartani tekshiring (absolyut URL `https://<domen>` bo'lishi kerak,
      ichki host emas), va login logida IP haqiqiy mijoz manzili ekanini ko'ring
      (Traefik konteyner IP'si `172.x` EMAS). Ikkalasi ham RemoteIpValve orqali ishlaydi.
- [ ] **Xavfsizlik:** logdagi `XAVFSIZLIK: 'admin' akkaunti ...` qatorini toping → shu parol bilan
      kiring → darhol almashtiring. `admin123` bilan kirish ishlamasligini tasdiqlang.
- [ ] `https://<domen>`: do'kon `/`, ERP `/admin`, kabinet `/hisob`, login `/kirish`.
- [ ] ERP'da rasm yuklash → storefront'da ko'rinadi (`uploads_data` volume ishlayapti).
- [ ] Telegram'da `<domen>` ulashish → OG karta (`VITE_SITE_URL`).
- [ ] (Jonli to'lov) Payme/Click sandbox → webhook → `paymentStatus=PAID`.

## Eslatma
- **CORS:** env-driven — `CORS_ALLOWED_ORIGINS` (compose default: `https://protektor.uz`). Brauzer har
  POST'ga Origin yuboradi, shuning uchun same-origin bo'lsa ham prod domen ro'yxatda bo'lishi shart.
  Yangi domen qo'shilsa — vergul bilan shu env'ga qo'shiladi.
- To'lov webhook'lari: Payme `https://<domen>/api/v1/payments/payme`; Click `.../click/prepare` +
  `.../complete`. SMS hozircha stub (`LogSmsSender`) — jonli SMS uchun provider impl kerak.
- Batafsil bajarilgan ishlar: `QOLGAN-ISHLAR.md`.
