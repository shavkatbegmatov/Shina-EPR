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
| `JWT_SECRET` | (kuchli base64) | **majburiy** — default'ni ALMASHTIRING |
| `DB_NAME` / `DB_USERNAME` | `shina_epr_db` / `shina_epr_user` | default'lar bor |
| `PAYME_*`, `CLICK_*`, `SHOP_RETURN_URL` | — | jonli to'lov yoqilganda |
| `SHOP_NOTIFY_SMS/EMAIL`, `SPRING_MAIL_*` | — | jonli xabarnoma yoqilganda |

4. **Domen** (Coolify UI'da): `frontend` servisiga `https://<domen>` (port 80) — SSL avtomatik
   (Traefik + Let's Encrypt). Backend'ga domen ULANMAYDI.
5. **Auto Deploy'ni O'CHIRING** (resurs sozlamalarida) — deploy'ni GitHub Actions webhook
   boshqaradi (image tayyor bo'lgandan keyin). **Deploy webhook** URL'ini oling → GitHub secret
   `COOLIFY_WEBHOOK_URL`; API token → `COOLIFY_API_TOKEN`.
6. GitHub'da `DEPLOY_ENABLED=true` variable qo'ying → keyingi `master` push to'liq avtomatik.

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
- [ ] `https://<domen>`: do'kon `/`, ERP `/admin`, kabinet `/hisob`, login `/kirish`.
- [ ] ERP'da rasm yuklash → storefront'da ko'rinadi (`uploads_data` volume ishlayapti).
- [ ] Telegram'da `<domen>` ulashish → OG karta (`VITE_SITE_URL`).
- [ ] (Jonli to'lov) Payme/Click sandbox → webhook → `paymentStatus=PAID`.

## Eslatma
- **CORS:** prod same-origin (nginx proxy) → shart emas. Frontend ALOHIDA domenda bo'lsa, `WebConfig`
  CORS origin'lari (hozir localhost) prod domenni o'z ichiga olishi kerak (env-driven CORS qo'shing).
- To'lov webhook'lari: Payme `https://<domen>/api/v1/payments/payme`; Click `.../click/prepare` +
  `.../complete`. SMS hozircha stub (`LogSmsSender`) — jonli SMS uchun provider impl kerak.
- Batafsil bajarilgan ishlar: `QOLGAN-ISHLAR.md`.
