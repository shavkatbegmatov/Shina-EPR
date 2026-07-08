# Protektor — Demo ma'lumotlar qo'llanmasi

Loyihani buyurtmachiga taqdim etish uchun to'liq demo ma'lumotlar bilan
to'ldirilgan. Quyida — nima bor, qanday kirish va sanalarni yangilash.

> ⚠️ **Faqat DEV.** Demo ma'lumot `dev` profilida (`mvn spring-boot:run`) yuklanadi.
> Production (Coolify) uni **umuman ko'rmaydi** — `application-dev.yml` gina
> `classpath:db/demo` ni Flyway'ga qo'shadi, prod esa `-Dspring.profiles.active=prod`
> bilan ishlaydi. Ya'ni demo hech qachon productionga tushmaydi.

---

## Tarkib (nima ko'rsatiladi)

| Bo'lim | Ma'lumot |
|---|---|
| **Mahsulotlar** | 36 ta shina — har biriga **premium rasm** (brend/o'lcham/mavsum). 13 brend, 6 kategoriya. Bir nechtasi kam qoldiq/tugagan. |
| **Storefront (/)** | To'liq katalog, filtrlar, mahsulot sahifasi, savat, solishtirish — rasmlar bilan. |
| **Sotuvlar** | ~380 sotuv, oxirgi 80 kun (bugungi kun bilan). Naqd/karta/o'tkazma/aralash. |
| **Dashboard** | Bugungi savdo, daromad trendi, top mahsulotlar, to'lov usullari, kategoriyalar, hafta kunlari/soatlar — barcha grafiklar jonli. |
| **Qarzlar** | ~62 qarz: faol / muddati o'tgan / to'langan. Mijoz balanslari mos. |
| **Xaridlar** | 22 ta xarid (turli holatlarda) + to'lovlar + 3 qaytarish. |
| **Ombor** | Har mahsulot bo'yicha kirim/chiqim tarixi (108 harakat). |
| **Onlayn buyurtmalar** | 30 ta storefront buyurtmasi; 9 tasi **yangi** (qo'ng'iroq badge). |
| **Mijozlar** | 22 mijoz (jismoniy/yuridik), ba'zilari portal (kabinet) yoqilgan. |
| **Xodimlar** | 12 xodim (turli bo'lim/lavozim/holat). |
| **Bildirishnomalar** | Xodim qo'ng'irog'i (10) + mijoz portali (6, uz/ru). |

---

## Kirish ma'lumotlari

**Admin panel** (`/admin/login`):

| Login | Parol | Rol |
|---|---|---|
| `admin` | `admin123` | Administrator (to'liq) |
| `menejer` | `seller123` | Menejer |
| `seller` | `seller123` | Sotuvchi |
| `kassir` | `seller123` | Sotuvchi (kassa) |

**Mijoz portali** (`/hisob`, storefrontdan "Kirish") — PIN: **`1234`**

| Telefon | Kim |
|---|---|
| `+998901234567` | Test Mijoz |
| `+998930010001` | Sherzod Mirzaev |
| `+998930010009` | Toshkent Taksi MCHJ (yuridik) |

---

## Ishga tushirish

```bash
# 1) Baza (Postgres) — lokal yoki docker
docker compose -f docker-compose.dev.yml up -d db   # DB_PASSWORD kerak

# 2) Backend (dev profil — demo shu yerda avtomatik yuklanadi)
cd shina-magazin-api && ./mvnw spring-boot:run       # http://localhost:8183

# 3) Frontend
cd shina-magazin-front && npm run dev                # http://localhost:5183
```

Storefront: <http://localhost:5183/> · Admin: <http://localhost:5183/admin/login>

---

## Sanalarni yangilash (prezentatsiyadan oldin)

Sotuvlar/xaridlar `CURRENT_DATE` ga nisbatan generatsiya qilinadi, shuning uchun
demo har doim "bugungi" ko'rinishi kerak.

- **Bo'sh bazada birinchi marta** — backend `dev` profilda ishga tushganda Flyway
  `R__demo_data.sql` ni avtomatik qo'llaydi (qo'shimcha amal shart emas).
- **Sanalarni keyinroq yangilash uchun** (baza allaqachon to'ldirilgan bo'lsa —
  oddiy restart yetarli emas, chunki Flyway repeatable checksum o'zgarmagani uchun
  qayta ishlamaydi) — skriptni ishga tushiring:
  ```powershell
  ./scripts/seed-demo.ps1
  ```

Skript demo tranzaksiyalarni o'chirib, joriy sanaga qayta yaratadi
(idempotent — dublikat bo'lmaydi, boshqa ma'lumotga tegmaydi).

---

## Rasmlar qanday yasalgan

Har shina rasmi — parametrik **SVG** (`shina-magazin-front/public/products/<sku>.svg`),
tashqi tarmoqqa bog'liq emas, offline va deploy'da ishlaydi. Manba:
`shina-magazin-front/scripts/demo-catalog.mjs` (kanonik katalog). Qayta yasash:

```bash
cd shina-magazin-front
node scripts/gen-product-images.mjs   # SVG'lar + demoProducts.ts
node scripts/gen-demo-sql.mjs         # products uchun SQL fragmenti (R__ ga)
```
