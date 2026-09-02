# Protektor (Shina-EPR)

Shina do'koni uchun ERP + internet-magazin. Bitta monorepo, uchta sirt:

| Sirt | Manzil | Kod |
|---|---|---|
| Ommaviy vitrina (do'kon) | `/` | `shina-magazin-front/src/shop/` |
| ERP (xodimlar: kassa, ombor, qarzlar, hisobotlar) | `/admin` | `shina-magazin-front/src/pages/` |
| Mijoz kabineti | `/hisob` (login `/kirish`) | `shina-magazin-front/src/portal/` |

Prod: **https://protektor.uz** (Coolify; `master`'ga push → CI → GHCR image → deploy).

## Texnologiyalar

- **Frontend** — React 18, TypeScript, Vite 7, Tailwind 3 + DaisyUI 4, Zustand, TanStack Query, react-router v6, i18next (uz/ru), Vitest.
- **Backend** — Spring Boot 3.5 (Java 17), Spring Security (JWT + sessiyalar), JPA/Hibernate, Flyway, PostgreSQL 16.
- **Infra** — Docker, nginx (frontend + `/api` proxy), GitHub Actions, Coolify.

## Tez boshlash

Talablar: Node 20+, JDK 17+, PostgreSQL 16 (DB `shina_epr_db`, user `shina_epr_user`).

```bash
# Backend (PostgreSQL ishga tushgan bo'lsin). DB paroli: shina-magazin-api/.env (gitignore) ichida
#   DB_PASSWORD=...   — yoki muhit o'zgaruvchisi sifatida bering.
cd shina-magazin-api
./mvnw spring-boot:run          # http://localhost:8183/api

# Frontend
cd shina-magazin-front
npm install                     # git hook'larni ham yoqadi (prepare)
npm run dev                     # http://localhost:5183  (/ do'kon, /admin ERP, /hisob kabinet)
```

Tekshiruvlar: `npm run lint`, `npm test`, `npm run build`, `npm run typecheck`, `npm run check:permissions`
(frontend); `./mvnw test` (backend; Docker bo'lsa migratsiyalar haqiqiy Postgres'da ham sinaladi).

## Hujjatlar

| Fayl | Nima uchun |
|---|---|
| [AGENTS.md](AGENTS.md) | Kod qoidalari, brend tokenlari, commit konvensiyasi, git hook'lar |
| [shina-magazin-front/AGENTS.md](shina-magazin-front/AGENTS.md) | Frontend'ga xos qoidalar (React Query, testlar) |
| [shina-magazin-front/src/shop/README.md](shina-magazin-front/src/shop/README.md) | Vitrina arxitekturasi |
| [DEPLOY.md](DEPLOY.md) | Coolify deploy, env o'zgaruvchilar, backup/tiklash, rollback, post-deploy checklist |
| [CHANGELOG.md](CHANGELOG.md) | O'zgarishlar tarixi (reliz izohlari shu yerdan olinadi) |
| [AUDIT.md](AUDIT.md) | Mantiqiy audit topilmalari va ularning holati |
| [QOLGAN-ISHLAR.md](QOLGAN-ISHLAR.md) | Reja tarixi va hali ochiq ishlar |
| [DEMO.md](DEMO.md) | Demo ma'lumotlarni yaratish/o'chirish |
| [KASSIRLAR-UCHUN.md](KASSIRLAR-UCHUN.md) / [ДЛЯ-КАССИРОВ.md](ДЛЯ-КАССИРОВ.md) | Kassirlar uchun eslatma |

## Ishlab chiqish qoidalari (qisqacha)

- Commit: Conventional Commits, o'zbek tilida, sabab bilan (`fix(sales): ...`). Hook'lar lint va testlarni push'dan oldin tekshiradi.
- Yangi i18n kalit ikkala tilga (`uz.json`, `ru.json`) qo'shiladi — `locale-parity` testi buni majburlaydi.
- Zaxira faqat Ombor/Xarid/Savdo orqali o'zgaradi; hujjat raqamlari `document_sequences` orqali.
- Sirlar repoga tushmaydi: `JWT_SECRET` majburiy, DB paroli `.env`/env'da.
