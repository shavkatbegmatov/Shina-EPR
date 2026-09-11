# Kirim hujjati va barter — qo'llanma va demo ssenariysi

Bu hujjat ikki yangi oqimni tushuntiradi: **ta'minotchi yuk xati asosida omborga
kirim** (kirim hujjati) va **barter** (mijoz eski shinalarini beradi, yangisini oladi,
farqni to'laydi). Oxirida mijozga ko'rsatish uchun 10 daqiqalik demo ssenariysi bor.

---

## 1. Kirim hujjati (ta'minotchi shabloni)

Ta'minotchi yuk xati (masalan "LARGO TYRES GROUP") tizimda **bir xil tuzilmada**
kiritiladi — omborchi ikkita qog'ozni yonma-yon qo'yib solishtiradi:

| Ta'minotchi hujjatidagi maydon | Tizimda | Izoh |
|---|---|---|
| Kun ID (43 943) | Ta'minotchi hujjat № | Ro'yxatda va tafsilotda ko'rinadi, qidiriladi |
| Sana (01.09.2026) | Hujjat sanasi | Hujjatning o'z sanasi; kirim sanasi alohida |
| Yuk mashina № (1 post) | Yuk mashina № / jo'natma | |
| Yo'l haqi | Yo'l haqi (so'm) | Ta'minotchi qarziga **kirmaydi**, tannarxga taqsimlanadi |
| Narx (46,25) | Narx — hujjat valyutasida | USD hujjatda dollarda kiritiladi, kurs bilan saqlanadi |
| Bonus $ / Bonus % / Bonus summa | Bonus/dona, Bonus %, Bonus | Qator bo'yicha; to'lov summasini kamaytiradi |
| Jami (140) | Jami (dona) | |
| Jami summa / Bonus / To'lov summa | Tovar summasi / Bonus / To'lov summasi | `To'lov = Tovar − Bonus` — shablondagi bilan bir xil |
| TEKSHIRILDI muhri | Qabul qilish (TEKSHIRILDI) | Kim va qachon sanab qabul qilgani yoziladi |

### Valyuta va so'm

Pul ustunlari (jami, to'langan, qarz, ta'minotchi balansi, hisobotlar) **doim so'mda**.
USD hujjatda narxlar dollarda kiritiladi, kurs (`1 USD = N so'm`) hujjat bilan birga
**muhrlanadi** — keyin kurs o'zgarsa eski hujjat o'zgarmaydi. Kurs oxirgi USD hujjatdan
taklif qilinadi. So'mga aylantirish qator darajasida, 2 xonagacha yaxlitlanadi
(backend `PurchasePricing`, frontend `purchasePricing.ts` — bir xil qoida, ikkalasi
bir xil testlar bilan qulflangan).

### Tannarx (landed cost)

Har qator uchun:

```
tannarx (1 dona) = (qator summasi − qator bonusi + yo'l haqi ulushi) / miqdor
yo'l haqi ulushi = yo'l haqi × qator miqdori / jami miqdor
```

Mahsulot kartochkasidagi "Kelish narxi" aynan shu tannarxdan yoziladi, ya'ni foyda
hisoboti yetkazib berish xarajati va bonusni hisobga oladi.

Misol (haqiqiy hujjat, kurs 12 700, yo'l haqi 254 000 so'm):

| Qator | Soni | Narx | Bonus | So'mda | Tannarx |
|---|---|---|---|---|---|
| JOYROAD 195/65 R15 | 8 | $40 | $1/dona | 4 064 000 − 101 600 + 127 000 | **511 175** |
| JOYROAD 205/60 R16 | 8 | $48,5 | $1/dona | 4 927 600 − 101 600 + 127 000 | **619 125** |
| **To'lov summa** | 16 | | $16 | **$692 = 8 788 400 so'm** | |

### Holatlar

| Holat | Ma'nosi | Zaxira | Ta'minotchi balansi |
|---|---|---|---|
| **Kutilmoqda** (`ORDERED`) | Hujjat kiritildi, mol hali sanab qabul qilinmagan | tegilmaydi | faqat oldindan to'lov (manfiy) |
| **Qisman qabul** (`PARTIAL`) | Molning bir qismi keldi | kelgan miqdor kirdi | kelgan mol summasi |
| **Qabul qilingan** (`RECEIVED`) | Hammasi keldi — TEKSHIRILDI | to'liq | to'liq to'lov summasi |
| Bekor qilingan | Faqat kutilayotgan va to'lanmagan hujjat | — | — |

Formada "Mol qabul qilindi — omborga kirim qilinsin" **yoqiq** bo'lsa (standart) hujjat
darhol qabul qilinadi — eski oqim. O'chirilsa hujjat kutadi; mol kelganda xarid
tafsilotida **Qabul qilish (TEKSHIRILDI)** bosiladi: har qator uchun haqiqatda kelgan
miqdor kiritiladi, kamomad qatorda ko'rinadi, summalar va ta'minotchi qarzi **kelgan
mol bo'yicha** qayta hisoblanadi. Qolgan mol keyin kelsa — o'sha tugma, jami miqdor bilan.

Chop etish: xarid tafsilotida **Kirim hujjatini chop etish** — A4 hujjat, ta'minotchi
shablonidagi ustunlar bilan, qabul qilingan bo'lsa TEKSHIRILDI muhri (kim, qachon).

Ruxsatlar: kiritish `PURCHASES_CREATE`, qabul qilish `PURCHASES_RECEIVE`, bekor qilish
`PURCHASES_UPDATE` (V11 da MANAGER va ADMIN'da bor).

---

## 2. Barter (eski shina evaziga yangi)

Kassa (POS) → savatda **Barter — eski shinalar** → **Eski shina qo'shish**: o'lcham
(eni/profil/diametr), brend (ixtiyoriy), holati ("protektor 60%"), soni, **qabul narxi**
(1 dona uchun kredit) va B/U sotish narxi (taklif: kredit × 1,5). Kassir SKU o'ylamaydi.

Nima bo'ladi:

1. Savdo summasi **o'zgarmaydi** — yangi shinalar to'liq narxda sotilgan (daromad shu).
2. Eski shinalar krediti savdodan ayiriladi: `To'lanadigan = Jami − Barter`. Kassaga
   faqat shu farq tushadi; qarz ham faqat farqdan hisoblanadi.
3. Eski shinalar **B/U mahsulot** sifatida omborga kiradi (`Ishlatilgan shinalar`
   kategoriyasi, SKU `BU-205-55-R16[-BREND]`): bir o'lchamdagi barcha eski shinalar
   bitta kartochkada yig'iladi, tannarxi = berilgan kredit. Ombor harakati `TRADE_IN`.
4. Chekda eski shinalar, barter krediti va to'lanadigan summa alohida chiqadi.
5. Barter uchun **mijoz tanlash shart** — eski shinalar kimdan olingani hujjatda qoladi.

Qoidalar:

- Barter qiymati savdo summasidan katta bo'lolmaydi (kassa mijozga pul qaytarmaydi).
- **Bekor qilish** (pul tushmagan savdo): eski shinalar mijozga qaytariladi — B/U qoldiq
  kamayadi (`TRADE_IN_CANCEL`). Ular allaqachon sotilgan bo'lsa bekor qilinmaydi.
- **Qaytarish**: naqd faqat kassaga tushgan qismgacha qaytariladi; eski shinalar uchun
  berilgan kredit qismi **mijoz balansiga kredit** bo'lib yoziladi (do'kon eski shinalarni
  qaytarib bermaydi). Z-hisobotga faqat naqd qaytarim tushadi.
- Hisobotlar: Sotuvlar hisobotida "Barter" alohida kartada; daromad va foyda to'liq
  narxdan, kassa ustunlari esa faqat puldan.

---

## 3. Demo ssenariysi (10 daqiqa)

**Tayyorgarlik:** Sozlamalar → Demo → Demoni yaratish (mahsulotlar, mijozlar,
ta'minotchilar tayyor). Ta'minotchilar sahifasida "Largo Tyres Group" ta'minotchisini
qo'shing (telefon +998 90 406 00 36).

**A. Kirim hujjati (4 daqiqa)**

1. Xaridlar → **Yangi xarid**. Ta'minotchi: Largo Tyres Group. Hujjat №: `43 943`,
   hujjat sanasi 01.09.2026, mashina: `1 post`.
2. Valyuta: **USD**, kurs (masalan 12 700). Mahsulotlarni qo'shing va hujjatdagi
   narxlarni dollarda kiriting: `46,25`, `41,25`, `31,5`, `32,5` … Soni: 12, 12, 12, 76 …
   Jami 140 dona, To'lov summa **$5 296** — ekrandagi raqam hujjatdagi bilan bir xil.
3. Yo'l haqi: 254 000 so'm — Tannarx ustuni darhol o'zgaradi (yetkazib berish narxga
   kirdi). Ikkinchi hujjatda (43 824) bonus $1/dona: To'lov summa 1 540 − 32 = **$1 508**.
4. "Mol qabul qilindi" belgisini **oling** → Hujjatni saqlash (kutilmoqda). Ro'yxatda
   "Kutilmoqda", zaxira o'zgarmadi, ta'minotchi qarzi yo'q.
5. Xaridni oching → **Qabul qilish (TEKSHIRILDI)**: bitta qatorda 76 o'rniga 74 kiriting.
   Natija: kamomad −2 ko'rinadi, summa kelgan mol bo'yicha, ta'minotchi qarzi shunga
   mos, mahsulot kartochkasida yangi tannarx, ombor harakatida hujjat raqami.
6. **Kirim hujjatini chop etish** — A4, TEKSHIRILDI muhri bilan.

**B. Barter (4 daqiqa)**

1. Kassa → mijozni tanlang (masalan Muslihiddin aka), 4 ta yangi shina qo'shing.
2. **Eski shina qo'shish**: 205/55 R16, Michelin, "protektor 60%", 4 dona, qabul narxi
   150 000 → jami kredit 600 000.
3. Savatda: Jami 4 000 000, Barter −600 000, **To'lanadigan 3 400 000**. To'lovga o'tish →
   to'langan summa avtomatik 3 400 000 → Tasdiqlash → chekni chop eting.
4. Mahsulotlar → `B/U Michelin 205/55 R16` — 4 dona, kelish narxi 150 000, sotish narxi
   225 000. Ombor → harakatlar → `Barter kirim`. Sotuvlar ro'yxatida "Barter" belgisi.
5. (Ixtiyoriy) Savdo tafsiloti → Qaytarish → 4 dona: naqd 3 400 000, mijoz balansiga
   600 000 kredit — eski shinalar omborda qoladi.

**C. Hisobotlar (2 daqiqa)** — Hisobotlar → Sotuvlar: Barter kartasi; Foyda-zarar:
tannarx yo'l haqi va bonus bilan.

---

## 4. Cheklovlar va keyingi qadamlar

- Ta'minotchi balansi so'mda yuritiladi (hujjat kursida). Dollarda qarz yuritish kerak
  bo'lsa — alohida valyuta balansi kerak (rejada).
- Kirim hujjati yaratilgandan keyin tahrirlanmaydi: xato bo'lsa bekor qilib qaytadan
  kiritiladi (kutilmoqda holatida), qabul qilingan bo'lsa qaytarish rasmiylashtiriladi.
- Barter qaytarilganda eski shinalar mijozga qaytarilmaydi (kredit yoziladi); kerak
  bo'lsa omborchi Ombor → chiqim bilan qo'lda rasmiylashtiradi.
- B/U mahsulot vitrinada ham ko'rinadi (faol mahsulot). Ko'rsatilmasin desa, mahsulot
  kartochkasida arxivlanadi yoki narxi tahrirlanadi.
