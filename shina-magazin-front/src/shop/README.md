# Protektor Storefront (`/magazin`)

Ommaviy internet-magazin (auth talab qilmaydi). ERP (`/`) va B2B portal (`/kabinet`)
yonida uchinchi mustaqil sirt. Dizayn-tizim ustida qurilgan (`@/ui` primitivlar,
`surface-card`/token CSS, DaisyUI `shina`/`shina-dark` mavzular), to'liq uz/ru i18n,
responsiv (mobil hamburger → desktop nav), `data-app="shop"`.

## Marshrutlar (`src/router/index.tsx`, lazy)

| Path | Sahifa | Izoh |
|------|--------|------|
| `/magazin` | `ShopHomePage` | hero, o'lcham qidiruvchi, kategoriya, tanlangan, why-us, CTA |
| `/magazin/katalog` | `CatalogPage` | qidiruv + brend/mavsum/saralash + o'lcham filtri; `?q= &brand= &season= &width= &profile= &diameter=` |
| `/magazin/mahsulot/:id` | `ProductDetailPage` | xususiyatlar, savatga, o'xshash mahsulotlar |
| `/magazin/checkout` | `CheckoutPage` | 4-bosqich: aloqa → yetkazish → to'lov → tasdiq |
| `/magazin/buyurtma/:orderNo` | `OrderConfirmationPage` | muvaffaqiyat + buyurtma tafsiloti |
| `/magazin/buyurtmalarim` | `OrdersPage` | client-side buyurtma tarixi |
| `/magazin/*` | `ShopNotFound` | do'kon ichidagi 404 (ERP'ga sakramaydi) |

`ShopLayout` = `ShopHeader` + `<Outlet/>` + `ShopFooter` + `CartDrawer` + `ShopRouteEffects`
(skroll-yuqoriga + `document.title`).

## Holat (client-side, `zustand` + `persist`)

- `store/cartStore.ts` — savat (`shop-cart`). `selectCartCount`, `selectCartSubtotal`.
- `store/orderStore.ts` — buyurtmalar tarixi (`shop-orders`) + `generateOrderNo()` +
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

## Backenddan kerak bo'lgan shartnoma (kelajakdagi faza)

`Product` shakli ERP bilan **bir xil** (`src/types`), shuning uchun katalog DTO o'sha.

1. **Ommaviy katalog (read-only)** — auth'siz, Spring Security'da `permitAll`:
   - `GET /v1/catalog?search=&brandId=&categoryId=&season=&width=&profile=&diameter=&page=&size=`
     → `PagedResponse<Product>` (faqat `active=true`)
   - `GET /v1/catalog/{id}` → `Product`
   - (mavjud `ProductService`'ni qayta ishlatadi; faqat `active` va kerakli maydonlar)
2. **Buyurtma (Order domeni)** — `POST /v1/orders`:
   - body: `{ items:[{productId, qty}], contact:{name,phone,email?}, delivery:{method,address?,note?}, payment }`
   - → `{ orderNo, status, total, ... }` (server `orderNo` va narxni HISOBLAYDI — mijoz narxiga ishonilmaydi)
   - stok rezervatsiyasi/konkurensiya, holat oqimi

## 🔑 Mahsulot egasi qaror qabul qilishi kerak (backend fazasidan oldin)

- **To'lov provayderi**: Payme / Click / karta-acquiring — qaysi(lar)i? (UI'da 4 usul tayyor turibdi)
- **UZ fiskalizatsiya** (soliq cheki) integratsiyasi
- **SEO/SSR**: SPA katalog qidiruv tizimlari uchun yetarli emas — SSR/prerender kerakmi?
- **Ildiz marshrut**: magazin `/magazin`da qoladimi yoki domen ildizi (`/`) bo'ladimi? (ERP'ni ko'chirish kerak bo'ladi)
- **Ommaviy katalog xavfsizligi**: narx/zaxira ommaviy ko'rinsinmi (B2C ha, lekin tasdiqlang)

## i18n

Barcha matn `shop.*` namespace (`src/i18n/locales/{uz,ru}.json`), `locale-parity.test.ts`
uz/ru sinxronligini majburlaydi.

## Tekshirilgan (preview, backend'siz)

Home/katalog/PDP/savat/checkout(4 bosqich)/tasdiq/tarix/404 oqimlari; o'lcham qidiruvchi;
mobil+desktop; dark mode; uz↔ru. Build + lint(0) + 44 vitest yashil.
Demo ma'lumot bo'lgani uchun jonli backend talab qilinmaydi.
