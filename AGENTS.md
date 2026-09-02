# Repository Guidelines

This repository contains a React/Vite frontend and a Spring Boot API. Keep changes scoped to the module you are working in and document any cross-module impacts.

## Project Structure & Module Organization
- `shina-magazin-front/`: Vite + React app. Source lives in `src/`. Shared plumbing: `api/`, `store/`, `router/`, `hooks/`, `types/`, `config/`, `i18n/`, `utils/`. Three user-facing surfaces: `pages/` (ERP admin), `shop/` (public storefront), `portal/` (customer cabinet). `ui/` is the design-token/primitive layer and `components/` the shared components; `test/` holds the Vitest setup. Entry HTML is `index.html`.
- `shina-magazin-api/`: Spring Boot API. Code is under `src/main/java/uz/shinamagazin/api/` with `controller/`, `service/`, `repository/`, `entity/`, `dto/`, `config/`, `security/`, and `exception/`. Config and migrations are in `src/main/resources/` (Flyway in `db/migration/`). Build output goes to `target/`.

## Build, Test, and Development Commands
Frontend (run in `shina-magazin-front/`):
- `npm run dev` to start the Vite dev server.
- `npm run build` to type-check and bundle for production.
- `npm run lint` to run ESLint.
- `npm test` to run the Vitest suite once; `npm run test:watch` while iterating.
- `npm run preview` to preview the production build.

Backend (run in `shina-magazin-api/`) — use the checked-in wrapper, not a system Maven; CI does the same:
- `./mvnw spring-boot:run` to run the API locally (`mvnw.cmd` on Windows shells).
- `./mvnw test` to run JUnit/Spring tests.
- `./mvnw package` to build the jar.

Git hooks — enabled automatically by `npm install` in `shina-magazin-front/` (the `prepare` script sets `core.hooksPath`); manual fallback from the repo root: `git config core.hooksPath .githooks`.
- `pre-commit` lints only the staged frontend files (backend/docs commits are untouched).
- `commit-msg` enforces Conventional Commits (`type(scope): subject`; types: feat fix docs style refactor perf test build ci chore revert security).
- `pre-push` runs the full `eslint .` and the frontend test suite (`vitest run`), the same commands CI runs, and stays silent unless something fails. `SKIP_TESTS=1 git push` skips the tests once.
- Lint blocks on ESLint **errors** only; warnings pass, matching CI (jsx-a11y rules are warnings for now). Bypass with `--no-verify`.
- Why this matters: a lint or test failure makes CI red, and a red CI **skips** `build-and-push` and `deploy`. Nothing turns off — the last good image just keeps serving, so pushed work silently never reaches production. That went unnoticed for seven commits in August 2026. CI now posts to Telegram on failure and warns when deploy is skipped (see `DEPLOY.md`).

Other frontend scripts: `npm run typecheck`, `npm run test:coverage`, `npm run analyze` (bundle map in `dist/stats.html`), `npm run check:permissions` (frontend `PermissionCode` vs backend enum — CI runs it too), `npm run format` (Prettier; config exists, the codebase has **not** been bulk-formatted yet, so format only files you touch).

## Coding Style & Naming Conventions
- Indentation: TypeScript/TSX uses 2 spaces; Java uses 4 spaces.
- React components/pages use PascalCase (`ProductsPage.tsx`, `MainLayout.tsx`); store files use camelCase (`cartStore.ts`).
- Java types use PascalCase with suffixes (`*Controller`, `*Service`, `*Repository`); DTOs in `dto/request` and `dto/response` use `*Request`/`*Response`.
- Linting is via ESLint in the frontend; no formatter config is checked in.

## Brand & Design Tokens (Protektor)
- **Brand name:** "Protektor" (tire/tread motif). Use the shared `<Logo>` (`src/components/brand/Logo.tsx`, variants `mark`/`lockup`/`wordmark`, `tone="shop"|"erp"`) — never re-create letter/emoji placeholders.
- **Colors:** primary teal `#0f766e`, secondary orange `#ea580c` (**FILL only** — for orange *text* use `#c2410c` / dark `#fb923c`; `#ea580c` fails WCAG-AA as text), accent lime `#84cc16`. Driven by the DaisyUI `shina` / `shina-dark` themes in `tailwind.config.js`.
- **Token source of truth:** `src/ui/tokens/` (`colors.ts`, `scales.mjs`) + CSS vars in `src/index.css` (`--chart-*`, `--shadow-*`). `scales.mjs` feeds `tailwind.config.js` (new utilities only: `shadow-soft/strong/pop`, `z-modal/drawer/...`, `text-display/heading/...`, `rounded-field/card/sheet/pill`, `max-w-shell`).
- **Charts:** use `useChartColors()` (`src/ui/charts/useChartColors.ts`) — theme-aware, reads `--chart-*`. Never hardcode chart hex.
- **No raw hex in `src/pages/**` and `src/portal/**`:** ESLint blocks off-brand / FILL-only hex (`#6366f1`, `#8b5cf6`, `#ea580c`). Use semantic DaisyUI tokens (`text-primary`, `bg-secondary`) or the token layer.
- **Fonts:** Manrope (body), Sora (display — via `var(--font-display)`, applied to `h1–h5`).

## Testing Guidelines
- Backend uses Spring Boot Starter Test (JUnit 5). Place tests in `shina-magazin-api/src/test/java/...` and name them `*Test.java`. `@DataJpaTest` slices run against in-memory H2, so the suite needs no external database.
- Frontend uses Vitest + jsdom + Testing Library. Tests sit next to the code they cover as `*.test.ts` / `*.test.tsx` (matched by `src/**/*.{test,spec}.{ts,tsx}`); shared setup is `src/test/setup.ts`.
- CI runs both suites on every push and blocks the Docker image build if either fails — see `.github/workflows/ci.yml`.

## Commit & Pull Request Guidelines
- History follows Conventional Commits: `type(scope): summary`, e.g. `fix(sales): ...`, `feat(purchases): ...`, `test(db): ...`, `chore(dev): ...`, `docs: ...`. Recent subjects and bodies are written in Uzbek; match the surrounding history.
- Bodies are expected to explain *why*, not restate the diff — the failure mode being fixed, and what breaks if it regresses.
- Keep commit messages focused on the product change. Do not mention AI, Codex, ChatGPT, automated generation, or assistant attribution in commit subjects or bodies.
- PRs should describe affected areas (frontend/API), include screenshots for UI changes, and call out any DB migration or config updates.

## Configuration & Security Notes
- API defaults: `server.port=8183`, context path `/api`, PostgreSQL dev DB in `application-dev.yml`. The dev DB password is **not** in the repo: put `DB_PASSWORD=...` into `shina-magazin-api/.env` (gitignored, read via `spring.config.import`) or export it as an environment variable. The password that used to live in `application-dev.yml` is still in git history — rotate it on the local DB.
- Backend request paths inside filters must strip the context path (`JwtAuthenticationFilter.pathWithinApp`): `getRequestURI()` returns `/api/v1/...` in prod but `/v1/...` in tests.
- `/actuator/**` is `denyAll` except `/actuator/health`; springdoc is disabled in the `prod` profile. Do not loosen either without a reason.
- Scheduled jobs that write data run through `SchedulerLockService.runExclusively` (table `scheduler_locks`) and must be idempotent per run.
- `JWT_SECRET` is **required in every environment** — `application.yml` has `jwt.secret: ${JWT_SECRET}` with no fallback, so the app refuses to start without it. This is deliberate: a working base64 key used to sit in the repo, and anyone who read it could forge tokens. Do not reintroduce a default. Generate one with `openssl rand -base64 32`; rotating it invalidates every active session.
- Deployment, required env vars and the post-deploy checklist live in `DEPLOY.md`.
