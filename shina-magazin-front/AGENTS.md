# Repository Guidelines

This repository contains a React/Vite frontend and a Spring Boot API. Keep changes scoped to the module you are working in and document any cross-module impacts.

## Project Structure & Module Organization
- `shina-magazin-front/`: Vite + React app. Source is in `src/` with `components/`, `pages/`, `router/`, `store/`, `api/`, `types/`, and `config/`. Entry HTML is `index.html`.
- `shina-magazin-api/`: Spring Boot API. Java code lives in `src/main/java/uz/shinamagazin/api/` with `controller/`, `service/`, `repository/`, `entity/`, `dto/`, `config/`, `security/`, and `exception/`.
- API resources and migrations are in `shina-magazin-api/src/main/resources/` (Flyway scripts under `db/migration/`). Backend build output goes to `target/`.

## Build, Test, and Development Commands
Frontend (run in `shina-magazin-front/`):
- `npm run dev` starts the Vite dev server.
- `npm run build` type-checks and bundles for production.
- `npm run lint` runs ESLint.
- `npm run preview` serves the production build locally.

Backend (run in `shina-magazin-api/`):
- `mvn spring-boot:run` starts the API locally.
- `mvn test` runs JUnit/Spring tests.
- `mvn package` builds the jar.

## Coding Style & Naming Conventions
- Indentation: TypeScript/TSX uses 2 spaces; Java uses 4 spaces.
- React components/pages use PascalCase (`ProductsPage.tsx`, `MainLayout.tsx`); store files use camelCase (`cartStore.ts`).
- Java types use PascalCase with suffixes (`*Controller`, `*Service`, `*Repository`); DTOs in `dto/request` and `dto/response` use `*Request`/`*Response`.
- Frontend linting is via ESLint; no formatter config is checked in.

### Data fetching (React Query)
Server data goes through TanStack Query — not `useState` + `useEffect` loaders.
The manual pattern silently drifts: every page re-implements loading/error/refresh
flags, and a "reload after save" chain has to name each loader by hand, so adding
a new query means remembering to add it in three places.

- Query keys live in `src/lib/queryKeys.ts`. Never inline a key string — a typo
  (`'supplier'` vs `'suppliers'`) makes invalidation miss silently and the screen
  keeps showing stale data with no error.
- Invalidate by prefix (`queryKeys.suppliers.all`) so list + stats + detail refresh together.
- In the ERP, `staleTime` is **not** set per call site. `src/lib/queryConfig.ts`
  registers it once per domain prefix via `setQueryDefaults`, so a new query inherits
  the right tier automatically. Tiers: `reference` 10 min (brands, categories,
  attributes, roles, permissions, settings), `reports` 1 min, `transactional` 30 s,
  `stock` **0** — anything reflecting on-hand quantity must never be cached, or a
  cashier tries to sell what isn't there. Adding a domain to `queryKeys` without a
  tier is a compile error, not a silent 0. A page may still pass its own `staleTime`
  to override.
- `src/shop/` (the public storefront) is deliberately outside that registry and tunes
  `staleTime` per call — it has its own keys, its own traffic profile, and no cashier.
- Search inputs that feed a query are debounced with `useDebouncedValue(…, 300)`, and
  the page's "refreshing" flag includes the debounce window
  (`search.trim() !== debouncedSearch || (isFetching && !isPending)`). Without that
  second half the table looks settled while it is still showing results for the
  *previous* text. `AuditLogsPage` is exempt: it searches on an explicit button.
- Because reference data now lives in the cache for minutes, **every mutation must
  invalidate**. Before this was optional (`staleTime: 0` masked a missing call);
  now a forgotten `invalidateQueries` shows the user their own edit not taking effect.
- Paginated lists: `placeholderData: keepPreviousData`, then map
  `isPending` → initial skeleton and `isFetching && !isPending` → "refreshing" overlay
  (plus the debounce window above, when the list has a search box).
- Data that only a hidden tab needs: gate it with `enabled`, not an `if` inside an effect.
- Careful with `enabled: false` — the query stays `isPending` **forever**, so a detail
  page that renders a skeleton on `isPending` spins with nothing loading. Guard the
  disabled case explicitly (`const loading = !!id && query.isPending`).
- Mutations invalidate in `onSuccess`; the page should not pass `onSaved` reload callbacks.
- For domain events that touch stock or money (sale, return, purchase, stock movement,
  expense), call `invalidateAfter.<event>` from `src/lib/invalidation.ts` instead of
  listing keys inline. Written per page, those lists drift: a purchase made from the
  Suppliers modal used to leave stock stale while the same purchase from the Purchases
  page refreshed it. Extend the event's list there and every call site gets it.
- WebSocket-driven refresh: `useInvalidateOnNotification([...keys])`, not a
  `notifications.length` effect.

`pages/suppliers/` is the reference implementation. Every ERP page now follows
this pattern with one deliberate exception: `pages/profile/SessionsTab.tsx` stays
on manual loading because it logs the user out when their session is revoked and
is driven by a WebSocket event — the migration upside there is small and a subtle
bug would sign people out unexpectedly.

## Testing Guidelines
- Backend uses Spring Boot Starter Test (JUnit 5). Place tests in `shina-magazin-api/src/test/java/...` and name them `*Test.java`.
- Frontend uses Vitest + Testing Library (`npm test -- --run`). Co-locate tests with the
  code as `*.test.ts(x)`; jsdom and setup are wired in `vite.config.ts`.
- Mock the API module (`vi.mock('../../api/x.api')`), not axios, and wrap page renders in
  `QueryClientProvider` with `retry: false` so error-path tests don't wait on retries.

## Commit & Pull Request Guidelines
- Git history currently shows a single `init` commit, so no convention is established. Use short, imperative summaries (optionally scoped), e.g. `api: add stock adjustment endpoint`.
- PRs should describe affected areas (frontend/API), include screenshots for UI changes, and call out any DB migration or config updates.

## Configuration & Security Notes
- API defaults: `server.port=8183`, context path `/api`, PostgreSQL dev DB in `application-dev.yml`.
- Set `JWT_SECRET` for production; the dev default is defined in `application.yml`.
