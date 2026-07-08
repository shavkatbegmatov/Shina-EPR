// Kanonik demo katalog — YAGONA manba.
// Bundan: (1) public/products/<sku>.svg rasmlari, (2) src/shop/data/demoProducts.ts
// (offline vitrina), (3) backend db/demo uchun products SQL fragmenti generatsiya qilinadi.
// `existing: true` — V2__seed_data.sql da allaqachon bor (SQL faqat image_url ni yangilaydi).

/** @typedef {{sku:string, brand:string, model:string, category:string, w:number, p:number, d:number, load:string, speed:string, season:'SUMMER'|'WINTER'|'ALL_SEASON', purchase:number, price:number, qty:number, min:number, desc:string, existing?:boolean}} Item */

/** @type {Item[]} */
export const CATALOG = [
  // ── V2 da mavjud 10 mahsulot (faqat image_url yangilanadi) ──
  { existing: true, sku: 'MCH-205-55-R16-S', brand: 'Michelin', model: 'Primacy 4', category: 'Yengil avtomobil shinalari', w: 205, p: 55, d: 16, load: '91', speed: 'V', season: 'SUMMER', purchase: 800000, price: 1200000, qty: 20, min: 5, desc: "Yo'l ushlashi va tormoz masofasi bo'yicha sinf yetakchisi. Quruq va ho'l yo'lda barqaror." },
  { existing: true, sku: 'BRD-225-45-R17-W', brand: 'Bridgestone', model: 'Blizzak LM005', category: 'Yengil avtomobil shinalari', w: 225, p: 45, d: 17, load: '94', speed: 'H', season: 'WINTER', purchase: 1100000, price: 1500000, qty: 15, min: 5, desc: "Ho'l va qorli yo'lda ishonchli qishki shina — qisqa tormoz masofasi." },
  { existing: true, sku: 'CNT-195-65-R15-A', brand: 'Continental', model: 'AllSeasonContact', category: 'Yengil avtomobil shinalari', w: 195, p: 65, d: 15, load: '91', speed: 'T', season: 'ALL_SEASON', purchase: 700000, price: 1000000, qty: 30, min: 10, desc: 'Universal hamma mavsum shinasi — yil davomida almashtirishsiz qulaylik.' },
  { existing: true, sku: 'GDY-235-60-R18-S', brand: 'Goodyear', model: 'Eagle F1', category: 'SUV va Crossover shinalari', w: 235, p: 60, d: 18, load: '103', speed: 'W', season: 'SUMMER', purchase: 1200000, price: 1800000, qty: 10, min: 5, desc: 'Sport SUV uchun aniq boshqaruv va yuqori tezlik barqarorligi.' },
  { existing: true, sku: 'PIR-255-50-R19-S', brand: 'Pirelli', model: 'Scorpion Verde', category: 'SUV va Crossover shinalari', w: 255, p: 50, d: 19, load: '107', speed: 'Y', season: 'SUMMER', purchase: 1400000, price: 2000000, qty: 8, min: 3, desc: 'Premium krossover shinasi — past yoqilgʻi sarfi va komfort.' },
  { existing: true, sku: 'HNK-185-60-R14-S', brand: 'Hankook', model: 'Kinergy Eco', category: 'Yengil avtomobil shinalari', w: 185, p: 60, d: 14, load: '82', speed: 'H', season: 'SUMMER', purchase: 450000, price: 650000, qty: 25, min: 10, desc: 'Tejamkor yozgi shina — kundalik shahar yurishi uchun.' },
  { existing: true, sku: 'YKH-215-55-R17-W', brand: 'Yokohama', model: 'IceGuard', category: 'Yengil avtomobil shinalari', w: 215, p: 55, d: 17, load: '94', speed: 'T', season: 'WINTER', purchase: 900000, price: 1300000, qty: 12, min: 5, desc: 'Muz va qorda yuqori ishqalanish, past shovqin.' },
  { existing: true, sku: 'DLP-205-60-R16-A', brand: 'Dunlop', model: 'Sport All Season', category: 'Yengil avtomobil shinalari', w: 205, p: 60, d: 16, load: '96', speed: 'V', season: 'ALL_SEASON', purchase: 750000, price: 1100000, qty: 18, min: 5, desc: "Moʻtadil iqlim uchun hamma mavsum yechimi." },
  { existing: true, sku: 'NKN-225-50-R17-W', brand: 'Nokian', model: 'Hakkapeliitta R5', category: 'Yengil avtomobil shinalari', w: 225, p: 50, d: 17, load: '98', speed: 'R', season: 'WINTER', purchase: 1300000, price: 1900000, qty: 6, min: 3, desc: 'Shippsiz premium qishki shina — Shimoliy sharoit uchun.' },
  { existing: true, sku: 'TYO-265-70-R17-S', brand: 'Toyo', model: 'Open Country A/T', category: 'SUV va Crossover shinalari', w: 265, p: 70, d: 17, load: '115', speed: 'T', season: 'ALL_SEASON', purchase: 1000000, price: 1450000, qty: 14, min: 5, desc: 'Ofrod va asfaltda muvozanat — mustahkam yon devor.' },

  // ── Yangi mahsulotlar ──
  // Yengil avtomobil (c1)
  { sku: 'MCH-ENS-1856515', brand: 'Michelin', model: 'Energy Saver+', category: 'Yengil avtomobil shinalari', w: 185, p: 65, d: 15, load: '88', speed: 'H', season: 'SUMMER', purchase: 520000, price: 760000, qty: 34, min: 8, desc: 'Past yumalash qarshiligi — yoqilgʻini 0.2 l/100km gacha tejaydi.' },
  { sku: 'BRD-TUR-2055516', brand: 'Bridgestone', model: 'Turanza T005', category: 'Yengil avtomobil shinalari', w: 205, p: 55, d: 16, load: '91', speed: 'V', season: 'SUMMER', purchase: 780000, price: 1090000, qty: 22, min: 6, desc: 'Komfort va past shovqin, ho\'l yo\'lda kuchli ushlash — nano-pro texnologiyasi.' },
  { sku: 'CNT-PC6-2255017', brand: 'Continental', model: 'PremiumContact 6', category: 'Yengil avtomobil shinalari', w: 225, p: 50, d: 17, load: '98', speed: 'Y', season: 'SUMMER', purchase: 990000, price: 1380000, qty: 16, min: 5, desc: 'Sport va komfort muvozanati — aniq rul javobi.' },
  { sku: 'GDY-EFG-1956015', brand: 'Goodyear', model: 'EfficientGrip Performance', category: 'Yengil avtomobil shinalari', w: 195, p: 60, d: 15, load: '88', speed: 'H', season: 'SUMMER', purchase: 560000, price: 820000, qty: 28, min: 8, desc: 'Uzoq xizmat muddati va past yoqilgʻi sarfi.' },
  { sku: 'HNK-VP3-2155516', brand: 'Hankook', model: 'Ventus Prime3', category: 'Yengil avtomobil shinalari', w: 215, p: 55, d: 16, load: '93', speed: 'V', season: 'SUMMER', purchase: 690000, price: 970000, qty: 19, min: 6, desc: "Ho'l yo'lda ishonchli tormoz, past shovqin — kundalik uchun optimal." },
  { sku: 'KMH-ES31-1956515', brand: 'Kumho', model: 'Ecowing ES31', category: 'Yengil avtomobil shinalari', w: 195, p: 65, d: 15, load: '91', speed: 'H', season: 'SUMMER', purchase: 380000, price: 560000, qty: 40, min: 10, desc: 'Byudjet segmenti — hamyonbop va tejamkor.' },
  { sku: 'YKH-BEGT-2056016', brand: 'Yokohama', model: 'BluEarth-GT', category: 'Yengil avtomobil shinalari', w: 205, p: 60, d: 16, load: '96', speed: 'H', season: 'ALL_SEASON', purchase: 720000, price: 1020000, qty: 14, min: 5, desc: 'Hamma mavsum — quruq, ho\'l va yengil qorda barqaror.' },
  { sku: 'NKN-ND8-2055516', brand: 'Nokian', model: 'Nordman 8', category: 'Yengil avtomobil shinalari', w: 205, p: 55, d: 16, load: '94', speed: 'T', season: 'WINTER', purchase: 640000, price: 930000, qty: 4, min: 6, desc: 'Shipli qishki shina — muzli yoʻlda maksimal ishonch.' },
  { sku: 'TYO-CAS2-2156016', brand: 'Toyo', model: 'Celsius AS2', category: 'Yengil avtomobil shinalari', w: 215, p: 60, d: 16, load: '99', speed: 'V', season: 'ALL_SEASON', purchase: 760000, price: 1080000, qty: 13, min: 5, desc: '3PMSF sertifikati — haqiqiy hamma mavsum.' },
  { sku: 'SLN-AZE-2055516', brand: 'Sailun', model: 'Atrezzo Elite', category: 'Yengil avtomobil shinalari', w: 205, p: 55, d: 16, load: '91', speed: 'V', season: 'SUMMER', purchase: 300000, price: 470000, qty: 46, min: 12, desc: 'Eng hamyonbop yechim — shahar yurishi uchun yetarli.' },

  // SUV / Crossover (c2)
  { sku: 'MCH-LTC-2356018', brand: 'Michelin', model: 'Latitude Cross', category: 'SUV va Crossover shinalari', w: 235, p: 60, d: 18, load: '107', speed: 'V', season: 'ALL_SEASON', purchase: 1350000, price: 1850000, qty: 8, min: 4, desc: 'SUV uchun hamma mavsum — yengil ofrodga chidamli.' },
  { sku: 'BRD-DHP-2355519', brand: 'Bridgestone', model: 'Dueler H/P Sport', category: 'SUV va Crossover shinalari', w: 235, p: 55, d: 19, load: '105', speed: 'W', season: 'SUMMER', purchase: 1480000, price: 2050000, qty: 0, min: 3, desc: 'Sport SUV uchun yuqori tezlik va aniq boshqaruv.' },
  { sku: 'CNT-CLX2-2457016', brand: 'Continental', model: 'CrossContact LX2', category: 'SUV va Crossover shinalari', w: 245, p: 70, d: 16, load: '111', speed: 'T', season: 'ALL_SEASON', purchase: 1200000, price: 1680000, qty: 12, min: 5, desc: 'Uzoq safar SUV shinasi — bardoshli va tinch.' },
  { sku: 'PIR-SCW-2555518', brand: 'Pirelli', model: 'Scorpion Winter', category: 'SUV va Crossover shinalari', w: 255, p: 55, d: 18, load: '109', speed: 'V', season: 'WINTER', purchase: 1620000, price: 2240000, qty: 3, min: 5, desc: 'Premium SUV qishki shinasi — qor va muzda ishonch.' },
  { sku: 'NKN-OAT-2656517', brand: 'Nokian', model: 'Outpost AT', category: 'SUV va Crossover shinalari', w: 265, p: 65, d: 17, load: '112', speed: 'T', season: 'ALL_SEASON', purchase: 1250000, price: 1720000, qty: 10, min: 4, desc: 'All-terrain — tosh va loyga bardoshli protektor.' },
  { sku: 'TYO-PST-2855020', brand: 'Toyo', model: 'Proxes S/T III', category: 'SUV va Crossover shinalari', w: 285, p: 50, d: 20, load: '116', speed: 'V', season: 'SUMMER', purchase: 1780000, price: 2450000, qty: 2, min: 4, desc: 'Yirik SUV uchun agressiv sport shinasi.' },

  // Yuk / tijorat (c3)
  { sku: 'CNT-VAN2-1957015', brand: 'Continental', model: 'Vanco 2', category: 'Yuk mashinasi shinalari', w: 195, p: 70, d: 15, load: '104', speed: 'R', season: 'SUMMER', purchase: 820000, price: 1160000, qty: 14, min: 6, desc: 'Yengil tijorat (C) — yuqori yuk indeksi, mustahkam yon.' },
  { sku: 'BRD-DR660-2056516', brand: 'Bridgestone', model: 'Duravis R660', category: 'Yuk mashinasi shinalari', w: 205, p: 65, d: 16, load: '107', speed: 'T', season: 'SUMMER', purchase: 950000, price: 1330000, qty: 10, min: 5, desc: 'Furgon va mikroavtobus uchun uzoq yurumli shina.' },
  { sku: 'TRI-TR652-2257015', brand: 'Triangle', model: 'TR652', category: 'Yuk mashinasi shinalari', w: 225, p: 70, d: 15, load: '112', speed: 'S', season: 'ALL_SEASON', purchase: 640000, price: 920000, qty: 18, min: 6, desc: 'Hamyonbop tijorat shinasi — kuchli karkas.' },

  // Mototsikl (c4)
  { sku: 'MCH-PR4-1207017', brand: 'Michelin', model: 'Pilot Road 4', category: 'Mototsikl shinalari', w: 120, p: 70, d: 17, load: '58', speed: 'W', season: 'SUMMER', purchase: 780000, price: 1180000, qty: 7, min: 3, desc: 'Sport-turizm mototsikli — ho\'l yo\'lda ajoyib ushlash.' },
  { sku: 'BRD-BT-1805517', brand: 'Bridgestone', model: 'Battlax S22', category: 'Mototsikl shinalari', w: 180, p: 55, d: 17, load: '73', speed: 'W', season: 'SUMMER', purchase: 990000, price: 1450000, qty: 0, min: 3, desc: 'Sport mototsikl — trek va yoʻlda maksimal burchak.' },
  { sku: 'DLP-SS-1606017', brand: 'Dunlop', model: 'SportSmart Mk3', category: 'Mototsikl shinalari', w: 160, p: 60, d: 17, load: '69', speed: 'W', season: 'SUMMER', purchase: 860000, price: 1260000, qty: 6, min: 3, desc: 'Tez qiziydigan aralashma — sport haydash uchun.' },

  // Sport / UHP (c5 — yangi kategoriya)
  { sku: 'PIR-PZ-2454019', brand: 'Pirelli', model: 'P Zero', category: 'Sport / UHP shinalari', w: 245, p: 40, d: 19, load: '98', speed: 'Y', season: 'SUMMER', purchase: 1550000, price: 2180000, qty: 6, min: 3, desc: 'Premium sport shina — maksimal yoʻl ushlashi.' },
  { sku: 'MCH-PS4S-2553520', brand: 'Michelin', model: 'Pilot Sport 4S', category: 'Sport / UHP shinalari', w: 255, p: 35, d: 20, load: '97', speed: 'Y', season: 'SUMMER', purchase: 1980000, price: 2790000, qty: 3, min: 5, desc: 'Flagman UHP — trek darajasidagi ishlash.' },
  { sku: 'CNT-SC7-2354018', brand: 'Continental', model: 'SportContact 7', category: 'Sport / UHP shinalari', w: 235, p: 40, d: 18, load: '95', speed: 'Y', season: 'SUMMER', purchase: 1420000, price: 1990000, qty: 8, min: 4, desc: 'Aniq boshqaruv va qisqa tormoz — sport sedanlar uchun.' },

  // Elektromobil (c6 — yangi kategoriya)
  { sku: 'HNK-ION-2354518', brand: 'Hankook', model: 'iON evo', category: 'Elektromobil (EV) shinalari', w: 235, p: 45, d: 18, load: '98', speed: 'W', season: 'ALL_SEASON', purchase: 1180000, price: 1650000, qty: 9, min: 4, desc: 'EV uchun maxsus — past shovqin, yuqori yuk, kam qarshilik.' },
];

/** Yangi (V2 da yo'q) brendlar. */
export const NEW_BRANDS = [
  { name: 'Kumho', country: 'Janubiy Koreya' },
  { name: 'Sailun', country: 'Xitoy' },
  { name: 'Triangle', country: 'Xitoy' },
];

/** Yangi (V2 da yo'q) kategoriyalar. */
export const NEW_CATEGORIES = [
  { name: 'Sport / UHP shinalari', description: 'Yuqori unumdorlikli sport shinalari (UHP)' },
  { name: 'Elektromobil (EV) shinalari', description: 'Elektromobillar uchun maxsus shinalar' },
];

export const sizeString = (it) => `${it.w}/${it.p} R${it.d}`;
export const fullName = (it) => `${it.brand} ${it.model} ${sizeString(it)}`;
export const imageUrlFor = (it) => `/products/${it.sku}.svg`;
