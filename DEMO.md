# Protektor demo ma'lumotlari

Demo dataset endi Flyway yoki to'g'ridan-to'g'ri baza skripti orqali avtomatik
yuklanmaydi. Uni admin paneldagi boshqariladigan oqim yaratadi va o'chiradi.

## Ishlatish

1. Admin panelga kiring.
2. **Sozlamalar → Demo** bo'limini oching.
3. **Demoni yaratish** tugmasini bosing.
4. Demo tugagach, shu bo'limdagi **Demoni o'chirish** tugmasi faqat demo
   markerli yozuvlarni olib tashlaydi.

Amallar uchun `SETTINGS_UPDATE`, holatni ko'rish uchun `SETTINGS_VIEW` ruxsati
kerak. Backend endpointlari:

| Method | Endpoint | Vazifa |
|---|---|---|
| `GET` | `/api/v1/settings/demo-data` | Holat va obyektlar soni |
| `POST` | `/api/v1/settings/demo-data` | Demo datasetni yaratish/qayta yaratish |
| `DELETE` | `/api/v1/settings/demo-data` | Demo datasetni o'chirish |

## Dataset tarkibi

- 12 ta katalog mahsuloti va 6 ta original premium WebP mahsulot rasmi;
- 8 ta mijoz, 3 ta ta'minotchi va 4 ta xodim;
- 12 ta sotuv, to'lovlar, faol va muddati o'tgan qarzlar;
- 4 ta xarid, xarid to'lovlari va ombor harakatlari;
- 5 ta storefront buyurtmasi;
- 6 ta xarajat va demo bildirishnomalar.

Sanalar `CURRENT_DATE` ga nisbatan yaratiladi. **Demoni yangilash** eski demo
datasetni va yangi seedni bitta tranzaksiyada almashtiradi: seed xato qilsa,
oldingi to'liq demo holati saqlanadi.

## Xavfsizlik modeli

- Demo qatorlar `DEMO-*`, `[PROTEKTOR_DEMO]` va `PROTEKTOR_DEMO` kabi
  rezerv markerlar bilan izolyatsiya qilingan.
- Cleanup faqat shu markerlar va eski, aniq ma'lum demo identifikatorlariga
  tegadi; real biznes qatorlarini tasodifiy tanlamaydi.
- Parallel seed/cleanup so'rovlari PostgreSQL transaction advisory lock bilan
  ketma-ketlashtiriladi.
- Dataset login foydalanuvchilari yoki umumiy parollar yaratmaydi.
- Eski Flyway demo skripti yaratgan umumiy parolli demo akkauntlar cleanup
  vaqtida o'chirish o'rniga xavfsiz tarzda bloklanadi; shu tariqa audit va FK
  tarixi buzilmaydi.

SQL resurslari:

- `shina-magazin-api/src/main/resources/db/demo/demo-seed.sql`
- `shina-magazin-api/src/main/resources/db/demo/demo-cleanup.sql`

Rasmlar:

- `shina-magazin-front/public/products/demo/*.webp`
