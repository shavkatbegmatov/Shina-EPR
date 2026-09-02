# Frontend Guidelines (shina-magazin-front)

Umumiy qoidalar (tuzilma, buyruqlar, brend tokenlari, commit konvensiyasi, git hook'lar)
ildizdagi [AGENTS.md](../AGENTS.md) da. Bu fayl faqat frontend'ga xos narsalarni qamraydi.

## Data fetching (React Query)
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
  disabled case explicitly (`const loading = !!id && query.isPending`). All six detail
  pages had this; each now has a test that renders the route *without* an id and expects
  the not-found state. Copy that test when adding a detail page.
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

## HTTP klientlar
- Uchala autentifikatsiyali klient (`api/axios.ts` — ERP, `portal/api/portalAxios.ts`,
  `shop/data/shopAccountAxios.ts`) bitta `api/createAuthClient.ts` fabrikasidan yasaladi:
  Bearer token, 401 da **single-flight** refresh (server refresh tokenni rotatsiya qiladi
  va eskisi qayta kelsa sessiyani yopadi — dedup'siz parallel so'rovlar foydalanuvchini
  chiqarib yuboradi). Refresh token JSON body'da ketadi.
- Ommaviy vitrina so'rovlari (`shop/data/catalogApi.ts`) `publicAxios` orqali — xodim
  tokeni qo'shilmaydi, 401 xaridorni ERP login'iga uloqtirmaydi.

## i18n
- Kalitlar `src/i18n/locales/{uz,ru}.json`; ikkalasiga ham qo'shing (`locale-parity` testi).
- Enum labellar (`config/constants.ts` xaritalari) getter orqali `erp.enum.*` dan o'qiladi —
  matnni xaritaga qo'lda yozmang. Sahifa sarlavhalari router'da `handle.titleKey`.
- `ru` lug'ati lazy yuklanadi: tilni `switchLanguage()` (`src/i18n`) bilan almashtiring,
  to'g'ridan-to'g'ri `i18n.changeLanguage` emas.

## Bundle
- Vendor chunk'lar `vite.config.ts` da FUNKSIYA shaklida; og'ir kutubxonalar (xlsx, jsPDF)
  faqat dynamic import (`await import('../../utils/exportUtils')`). `npm run analyze`
  → `dist/stats.html`.
- `lucide-react` dan `icons` obyektini import qilmang (butun to'plam bundle'ga kiradi);
  kerakli ikonkalarni nomma-nom import qiling.

## Testing
- Vitest + Testing Library (`npm test`). Co-locate tests with the code as `*.test.ts(x)`;
  jsdom and setup are wired in `vite.config.ts` / `src/test/setup.ts`.
- Mock the API module (`vi.mock('../../api/x.api')`), not axios, and wrap page renders in
  `QueryClientProvider` with `retry: false` so error-path tests don't wait on retries.
- `npm run test:coverage` — qamrov hisoboti (`coverage/`).
- `npm run check:permissions` — `PermissionCode` xaritasi backend enum bilan mosligini
  tekshiradi (CI ham ishlatadi).
