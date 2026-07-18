# Protektor Storefront (`/`)

Ommaviy internet-magazin (auth talab qilmaydi). ERP (`/admin`) va B2B portal (`/hisob`)
yonida uchinchi mustaqil sirt. Dizayn-tizim ustida qurilgan (`@/ui` primitivlar,
`surface-card`/token CSS, DaisyUI `shina`/`shina-dark` mavzular), to'liq uz/ru i18n,
responsiv (mobil hamburger → desktop nav), `data-app="shop"`.

## Marshrutlar (`src/router/index.tsx`, lazy)

| Path | Sahifa | Izoh |
|------|--------|------|
| `/` | `ShopHomePage` | hero, o'lcham qidiruvchi, kategoriya, tanlangan, why-us, CTA |
| `/katalog` | `CatalogPage` | qidiruv + brend/mavsum/saralash + o'lcham filtri; `?q= &brand= &season= &width= &profile= &diameter=` |
| `/mahsulot/:id` | `ProductDetailPage` | xususiyatlar, savatga, o'xshash mahsulotlar |
| `/checkout` | `CheckoutPage` | 4-bosqich: aloqa → yetkazish → to'lov → tasdiq |
| `/buyurtma/:orderNo` | `OrderConfirmationPage` | muvaffaqiyat + buyurtma tafsiloti |
| `/buyurtmalarim` | `OrdersPage` | login qilgan mijoz uchun serverdagi buyurtmalar tarixi |
| `/saqlanganlar` · `/solishtirish` | `WishlistPage` · `ComparePage` | saqlangan / solishtirish |
| `/*` | `ShopNotFound` | do'kon ichidagi 404 |

`ShopLayout` = `ShopHeader` + `<Outlet/>` + `ShopFooter` + `CartDrawer` + `ShopRouteEffects`
(skroll-yuqoriga + `document.title`).

## Holat (client-side, `zustand` + `persist`)

- `store/cartStore.ts` — savat (`shop-cart`). `selectCartCount`, `selectCartSubtotal`.
- `store/orderStore.ts` — server tasdiqlagan buyurtmalarning lokal keshi (`shop-orders`) +
  `calcDeliveryFee()` (1 000 000+ bepul / 30 000; olib ketish bepul).

## ⚠️ Data seam — backendga ulanishning YAGONA nuqtasi: `data/useCatalog.ts`

Hozir katalog `data/demoProducts.ts` (12 namuna shina) dan o'qiladi. Iste'molchi
sahifalar (Home/Catalog/PDP) `DEMO_PRODUCTS`'ni **to'g'ridan import qilmaydi** —
faqat shu hooklarni ishlatadi:

```ts
useCatalogProducts()           // { products, isLoading }
useProduct(id)                 // { product, isLoading }
useRelatedProducts(product)    // Product[]
useCatalogBrands()             // string[]
```

Backend tayyor bo'lganda **faqat `useCatalog.ts`** React Query'ga o'tadi; sahifalar tegmaydi:

```ts
export function useCatalogProducts() {
  const { data, isLoading } = useQuery({ queryKey: ['catalog'], queryFn: catalogApi.list });
  return { products: data ?? [], isLoading };
}
```

## Backend shartnomasi

`Product` shakli ERP bilan **bir xil** (`src/types`), shuning uchun katalog DTO o'sha.

1. **Ommaviy katalog (read-only)** — ✅ **BAJARILDI** (d3758e8, faqat kompilatsiya-verify):
   - `GET /v1/catalog?brandId=&categoryId=&season=&search=&page=&size=` → `PagedResponse<CatalogProductResponse>` (faqat `active=true`)
   - `GET /v1/catalog/{id}` → `CatalogProductResponse` (faqat faol)
   - Backend: `CatalogController`/`CatalogService`/`CatalogProductResponse` (tannarx YASHIRIN), `SecurityConfig` permitAll GET. Frontend: `catalogApi.ts` + `useCatalog` React Query, backend yo'q bo'lsa demo'ga tushadi.
   - ⏳ Qoldi: jonli DB bilan endpoint javobini ISHGA TUSHIRIB tekshirish.
2. **Buyurtma (Order domeni)** — ⏳ KERAK, `POST /v1/orders`:
   - body: `{ items:[{productId, qty}], contact:{name,phone,email?}, delivery:{method,address?,note?}, payment }`
   - → `{ orderNo, status, total, ... }` (server `orderNo` va narxni HISOBLAYDI — mijoz narxiga ishonilmaydi)
   - stok rezervatsiyasi/konkurensiya, holat oqimi, yangi jadvallar (Flyway migratsiya — jonli DB'da verify shart)

## 🔑 Mahsulot egasi qaror qabul qilishi kerak (backend fazasidan oldin)

- **To'lov provayderi**: Payme / Click / karta-acquiring — qaysi(lar)i? (UI'da 4 usul tayyor turibdi)
- **UZ fiskalizatsiya** (soliq cheki) integratsiyasi
- **SEO/SSR**: SPA katalog qidiruv tizimlari uchun yetarli emas — SSR/prerender kerakmi?
- ~~**Ildiz marshrut**: magazin `/magazin`da qoladimi yoki domen ildizi (`/`) bo'ladimi?~~ ✅ **HAL QILINDI (26.06.2026): do'kon ildizda (`/`), ERP `/admin`da (B2).**
- **Ommaviy katalog xavfsizligi**: narx/zaxira ommaviy ko'rinsinmi (B2C ha, lekin tasdiqlang)

## i18n

Barcha matn `shop.*` namespace (`src/i18n/locales/{uz,ru}.json`), `locale-parity.test.ts`
uz/ru sinxronligini majburlaydi.

## Tekshirilgan (preview, backend'siz)

Home/katalog/PDP/savat/checkout(4 bosqich)/tasdiq/tarix/404 oqimlari; o'lcham qidiruvchi;
mobil+desktop; dark mode; uz↔ru. Build + lint(0) + 44 vitest yashil.
Demo ma'lumot bo'lgani uchun jonli backend talab qilinmaydi.
