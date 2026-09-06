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

4. **Domen** (Coolify UI'da): `frontend` servisiga `https://<domen>` — SSL avtomatik
   (Traefik + Let's Encrypt). Backend'ga domen ULANMAYDI.
   ⚠️ Traefik qaysi konteyner portiga ulanishini compose'dagi `expose: ["80"]` aytadi.
   U bo'lmasa Coolify standart `3000` ni oladi va sayt konteynerlar sog'lom bo'lsa ham
   502 beradi (06.09.2026, Coolify 4.3.17 yangilanishidan keyin ~2,5 soat). Domenni
   `https://<domen>:80` ko'rinishida yozish ham ishlaydi, lekin compose'dagi e'lon
   UI'dan mustaqil.
5. **Auto Deploy'ni O'CHIRING** (resurs sozlamalarida) — deploy'ni GitHub Actions webhook
   boshqaradi (image tayyor bo'lgandan keyin). **Deploy webhook** URL'ini oling → GitHub secret
   `COOLIFY_WEBHOOK_URL`; API token → `COOLIFY_API_TOKEN`.
6. GitHub'da `DEPLOY_ENABLED=true` variable qo'ying → keyingi `master` push to'liq avtomatik.

### 3a. Raw compose rejimi — server repozitoriyni klon qilmaydi (07.09.2026 dan)

Prod resurs endi Coolify **Service** (`Docker Compose Empty`, uuid `hi3x8b45gvbqslhrcqh6eggu`):
compose Coolify'ning o'zida saqlanadi, **manba esa repo** — deploy skripti trigger'dan
oldin `infra/coolify/docker-compose.yml` ni API orqali yuboradi (`COOLIFY_SYNC_COMPOSE=true`,
`PATCH /api/v1/services/{uuid}`, base64). Serverda faqat image tortish va konteynerlarni
ko'tarish qoladi. Eski git'dan o'qiydigan Application (`mnb0ofon9mrdcxdgrjluiw9o`)
to'xtatilgan holda bir necha kun turadi, keyin o'chiriladi.

Migratsiyada aniqlangan qoidalar (keyingi safar bilib qo'yish uchun):

- **Servis nomlari noyob bo'lishi shart** (`shina-db`, `shina-backend`): Coolify'ning umumiy
  tarmog'ida boshqa loyihalarda ham `db`/`backend` nomli servislar bor, Docker DNS nomni
  ulardan biriga hal qilib nginx 502 berardi. `frontend` nomi domen bog'langani uchun qoladi.
- **Volume'lar:** Service turi compose'dagi `external`/`name` ni **e'tiborsiz qoldiradi** va
  o'z volume'larini yaratadi (`<service-uuid>_postgres-data`). Ma'lumot eski volume'dan
  qo'lda ko'chirildi (ikkala Postgres to'xtatilgan holda, `docker run --rm -v old:/from:ro
  -v new:/to alpine cp -a`). Compose'dagi `external` e'lonlar zararsiz, lekin Service'da
  ishlamaydi.
- **Domen** API orqali ko'chmaydi (application: `docker_compose_domains` massiv talab qiladi,
  service sub-app: `fqdn`/`domains` ruxsat etilmagan) — UI'da: Domains → Add → service
  `frontend`, `https://protektor.uz`, **Port 80**, Direction "Allow www & non-www".
- **Token:** `COOLIFY_WRITE_TOKEN` (read + read:sensitive + write + deploy) — yozish va env
  qiymatlarini o'qish uchun; deploy quvurining `COOLIFY_API_TOKEN` (read + deploy) qoladi.
- **Tarmoq:** Service'da "Connect to the predefined Coolify network" yoqiq (API:
  `connect_to_docker_network: true`), aks holda Traefik konteynerga yetmaydi.
- Yordamchi workflow'lar: `coolify-migrate.yml` (probe / prepare / redeploy / cutover /
  rollback), `coolify-recover.yml` (restart / recreate / stop / start — resurs turini o'zi
  aniqlaydi), `coolify-diagnose.yml` (faqat o'qiydi).

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
