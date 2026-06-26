# Protektor (Shina-EPR) — Coolify deploy qo'llanmasi

> Deploy oqimi **jalyuzi-epr** loyihasi kabi: `master`'ga push → GitHub Actions image quradi →
> **ghcr.io**'ga push → **Coolify webhook** avtomatik deploy qiladi. Kod config-gated — faqat
> bir martalik Coolify sozlash + kreditsiallar qoladi.

## Arxitektura — 3 servis
| Servis | Image / build | Port | Izoh |
|---|---|---|---|
| **PostgreSQL** | `postgres:16-alpine` (Coolify DB) | 5432 | DB `shina_epr_db`. Flyway V1…V25 startup'da. |
| **Backend** | `ghcr.io/shavkatbegmatov/shina-epr-api` | 8183 | Spring Boot, prod profil, context-path `/api`. |
| **Frontend** | `ghcr.io/shavkatbegmatov/shina-epr-front` | 80 | nginx; `/api`ni `shina-magazin-api:8183`ga proxy qiladi. |

Frontend nginx `/api` → backend (Docker DNS resolver bilan). Brauzer bitta domendan ko'radi → **CORS shart emas**.

---

## 1. GitHub sozlash (avtomatik deploy uchun)
Repo → **Settings → Secrets and variables → Actions**:

**Secrets:**
| Secret | Qiymat |
|---|---|
| `COOLIFY_WEBHOOK_URL` | Coolify backend app deploy webhook URL |
| `COOLIFY_FRONTEND_WEBHOOK_URL` | Coolify frontend app deploy webhook URL |
| `COOLIFY_API_TOKEN` | Coolify API token (Bearer) |

**Variables:**
| Variable | Qiymat |
|---|---|
| `DEPLOY_ENABLED` | `true` (deploy job'ni yoqadi; bo'lmasa skip — CI yashil qoladi) |
| `VITE_SITE_URL` | `https://<domen>` (OG/sitemap absolyut URL; bo'sh = relativ) |

> `GITHUB_TOKEN` (avtomatik) ghcr'ga push uchun yetarli. `build-and-push` job har `master` push'da
> image quradi+push qiladi (Dockerfile'larni ham validatsiya qiladi). `deploy` esa yuqoridagilar bilan ishlaydi.

## 2. Coolify — bir martalik setup
1. **Project** yarating (masalan "Protektor").
2. **PostgreSQL** (+ New → Database): DB `shina_epr_db`, user/parol. Ichki host'ni eslab qoling.
3. **Backend** (+ New → Application → **Docker Image** `ghcr.io/shavkatbegmatov/shina-epr-api:latest`):
   - Env (quyidagi jadval). **🔴 Persistent volume → `/data/uploads`** (rasm storage).
   - Health: `/api/actuator/health` (port 8183).
   - **Deploy webhook** URL'ini oling → GitHub secret `COOLIFY_WEBHOOK_URL`.
   - Servis/konteyner nomi **`shina-magazin-api`** bo'lsin (nginx shunga proxy qiladi) yoki `nginx.conf`'dagi `$backend_host`ni moslang.
4. **Frontend** (+ New → Application → Docker Image `ghcr.io/shavkatbegmatov/shina-epr-front:latest`):
   - **Domen** ulang (Coolify avtomatik SSL).
   - **Deploy webhook** → GitHub secret `COOLIFY_FRONTEND_WEBHOOK_URL`.
5. GitHub'da secrets/vars (1-bo'lim) + `DEPLOY_ENABLED=true` qo'ying.

> **Muqobil:** `docker-compose.yml` (repo ildizida) bilan ham — Coolify "Docker Compose" resursi sifatida
> (bitta resurs, ichki tarmoq, `backend` servisi). Lokal to'liq test: `docker compose -f docker-compose.dev.yml up`.

## 3. Backend env (Coolify)
**Majburiy:**
| Env | Qiymat |
|---|---|
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USERNAME` / `DB_PASSWORD` | PostgreSQL ulanishi |
| `JWT_SECRET` | kuchli base64 (default'ni ALMASHTIRING) |
| `SHOP_STORAGE_DIR` | `/data/uploads` _(Dockerfile default; volume shu yerda)_ |

`SPRING_PROFILES_ACTIVE=prod` Dockerfile ENTRYPOINT'da o'rnatilgan (override shart emas).

**To'lov (jonli) / Xabarnoma (jonli) — ixtiyoriy:** `PAYME_*`, `CLICK_*`, `SHOP_RETURN_URL`,
`SHOP_NOTIFY_SMS/EMAIL`, `SHOP_NOTIFY_EMAIL_FROM`, `SPRING_MAIL_*` — `docker-compose.yml` izohlariga qarang.
Webhooklar: Payme `https://<domen>/api/v1/payments/payme`; Click `.../click/prepare` + `.../complete`.
⚠️ SMS faqat stub (`LogSmsSender`) — jonli SMS uchun provider impl (Eskiz.uz) KOD yozilishi kerak.

## 4. Avtomatik deploy
`master`'ga push → CI/CD: frontend (lint/test/build) + backend (compile) + image build/push (ghcr) +
Coolify webhook (DEPLOY_ENABLED=true bo'lsa). Coolify yangi image'ni tortib qayta deploy qiladi.
Relizlar: `git tag vX.Y.Z && git push origin vX.Y.Z` → `release.yml` GitHub Release yaratadi (CHANGELOG.md'dan).

## Post-deploy checklist
- [ ] GitHub Actions: frontend/backend CI + build-and-push yashil; deploy job ishladi.
- [ ] Backend log: Flyway `V25` + `Started`.
- [ ] `https://<domen>`: do'kon `/`, ERP `/admin`, kabinet `/hisob`, login `/kirish`.
- [ ] ERP'da rasm yuklash → storefront'da ko'rinadi (volume ishlayapti).
- [ ] Telegram'da `<domen>` ulashish → OG karta (`VITE_SITE_URL`).
- [ ] (Jonli to'lov) Payme/Click sandbox → webhook → `paymentStatus=PAID`.

## Eslatma
- **CORS:** prod same-origin (nginx proxy) → shart emas. Frontend ALOHIDA domenda bo'lsa, `WebConfig`
  CORS origin'lari (hozir localhost) prod domenni o'z ichiga olishi kerak (env-driven CORS qo'shing).
- Batafsil bajarilgan ishlar: `QOLGAN-ISHLAR.md`.
