import type { Product } from '../../types';

/**
 * Protektor storefront — namuna katalog (demo).
 *
 * Hozircha commerce backend (CatalogController/Order) yo'q, shuning uchun
 * vitrina ma'lumotlari shu yerda. Backend tayyor bo'lganda `catalogApi.list()`
 * ga almashtiriladi — Product shakli ERP bilan bir xil, ya'ni komponentlar
 * o'zgarmaydi. Rasm yo'q mahsulotlar ProductImage SVG pleysxolderini ko'rsatadi.
 */
export const DEMO_PRODUCTS: Product[] = [
  {
    id: 1, sku: 'MICH-2055516', name: 'Michelin Primacy 4',
    brandName: 'Michelin', brandId: 1, categoryName: "Yengil avtomobil", categoryId: 1,
    width: 205, profile: 55, diameter: 16, sizeString: '205/55 R16',
    loadIndex: '91', speedRating: 'V', season: 'SUMMER',
    sellingPrice: 920000, quantity: 24, minStockLevel: 4, lowStock: false, active: true,
    description: "Yo'l ushlashi va tormoz masofasi bo'yicha sinflar yetakchisi. Quruq va ho'l yo'lda barqaror.",
  },
  {
    id: 2, sku: 'BRID-2254517', name: 'Bridgestone Turanza T005',
    brandName: 'Bridgestone', brandId: 2, categoryName: "Yengil avtomobil", categoryId: 1,
    width: 225, profile: 45, diameter: 17, sizeString: '225/45 R17',
    loadIndex: '94', speedRating: 'W', season: 'SUMMER',
    sellingPrice: 1080000, quantity: 12, minStockLevel: 4, lowStock: false, active: true,
    description: "Komfort va past shovqin. Uzoq xizmat muddati uchun nano-pro texnologiyasi.",
  },
  {
    id: 3, sku: 'CONT-1956515', name: 'Continental PremiumContact 6',
    brandName: 'Continental', brandId: 3, categoryName: "Yengil avtomobil", categoryId: 1,
    width: 195, profile: 65, diameter: 15, sizeString: '195/65 R15',
    loadIndex: '91', speedRating: 'H', season: 'SUMMER',
    sellingPrice: 760000, quantity: 40, minStockLevel: 6, lowStock: false, active: true,
    description: "Universal yozgi shina — shahar va trassada muvozanatli ishlash.",
  },
  {
    id: 4, sku: 'NOKI-2055516W', name: 'Nokian Hakkapeliitta R5',
    brandName: 'Nokian', brandId: 4, categoryName: "Yengil avtomobil", categoryId: 1,
    width: 205, profile: 55, diameter: 16, sizeString: '205/55 R16',
    loadIndex: '94', speedRating: 'T', season: 'WINTER',
    sellingPrice: 1150000, quantity: 8, minStockLevel: 4, lowStock: false, active: true,
    description: "Shippsiz qishki shina. Muz va qorda yuqori ishqalanish, past shovqin.",
  },
  {
    id: 5, sku: 'HANK-2254518W', name: 'Hankook Winter i*cept',
    brandName: 'Hankook', brandId: 5, categoryName: "Yengil avtomobil", categoryId: 1,
    width: 225, profile: 45, diameter: 18, sizeString: '225/45 R18',
    loadIndex: '95', speedRating: 'H', season: 'WINTER',
    sellingPrice: 890000, quantity: 3, minStockLevel: 4, lowStock: true, active: true,
    description: "Qishki sharoit uchun optimal narx/sifat. Ishonchli tormozlash.",
  },
  {
    id: 6, sku: 'PIRE-2454019', name: 'Pirelli P Zero',
    brandName: 'Pirelli', brandId: 6, categoryName: "Sport", categoryId: 2,
    width: 245, profile: 40, diameter: 19, sizeString: '245/40 R19',
    loadIndex: '98', speedRating: 'Y', season: 'SUMMER',
    sellingPrice: 1680000, quantity: 6, minStockLevel: 2, lowStock: false, active: true,
    description: "Premium sport shina — maksimal yo'l ushlashi va aniq boshqaruv.",
  },
  {
    id: 7, sku: 'GOOD-2156016AS', name: 'Goodyear Vector 4Seasons',
    brandName: 'Goodyear', brandId: 7, categoryName: "Yengil avtomobil", categoryId: 1,
    width: 215, profile: 60, diameter: 16, sizeString: '215/60 R16',
    loadIndex: '99', speedRating: 'V', season: 'ALL_SEASON',
    sellingPrice: 840000, quantity: 18, minStockLevel: 5, lowStock: false, active: true,
    description: "Hamma mavsum shinasi — yil davomida almashtirishsiz qulaylik.",
  },
  {
    id: 8, sku: 'MICH-2356518SUV', name: 'Michelin Latitude Sport 3',
    brandName: 'Michelin', brandId: 1, categoryName: "SUV / Krossover", categoryId: 3,
    width: 235, profile: 65, diameter: 18, sizeString: '235/65 R18',
    loadIndex: '110', speedRating: 'V', season: 'SUMMER',
    sellingPrice: 1420000, quantity: 10, minStockLevel: 3, lowStock: false, active: true,
    description: "SUV uchun yozgi shina — barqarorlik va past yoqilg'i sarfi.",
  },
  {
    id: 9, sku: 'CONT-2654020SUV', name: 'Continental CrossContact',
    brandName: 'Continental', brandId: 3, categoryName: "SUV / Krossover", categoryId: 3,
    width: 265, profile: 40, diameter: 20, sizeString: '265/40 R20',
    loadIndex: '104', speedRating: 'Y', season: 'SUMMER',
    sellingPrice: 1890000, quantity: 4, minStockLevel: 2, lowStock: false, active: true,
    description: "Yirik krossoverlar uchun premium yo'l ushlashi.",
  },
  {
    id: 10, sku: 'HANK-1956515', name: 'Hankook Kinergy Eco 2',
    brandName: 'Hankook', brandId: 5, categoryName: "Yengil avtomobil", categoryId: 1,
    width: 195, profile: 65, diameter: 15, sizeString: '195/65 R15',
    loadIndex: '91', speedRating: 'H', season: 'SUMMER',
    sellingPrice: 540000, quantity: 50, minStockLevel: 8, lowStock: false, active: true,
    description: "Tejamkor yozgi shina — kundalik shahar yurishi uchun.",
  },
  {
    id: 11, sku: 'BRID-2156016W', name: 'Bridgestone Blizzak LM005',
    brandName: 'Bridgestone', brandId: 2, categoryName: "Yengil avtomobil", categoryId: 1,
    width: 215, profile: 60, diameter: 16, sizeString: '215/60 R16',
    loadIndex: '99', speedRating: 'H', season: 'WINTER',
    sellingPrice: 990000, quantity: 0, minStockLevel: 4, lowStock: false, active: true,
    description: "Ho'l va qorli yo'lda ishonchli qishki shina.",
  },
  {
    id: 12, sku: 'PIRE-2255017AS', name: 'Pirelli Cinturato All Season',
    brandName: 'Pirelli', brandId: 6, categoryName: "Yengil avtomobil", categoryId: 1,
    width: 225, profile: 50, diameter: 17, sizeString: '225/50 R17',
    loadIndex: '98', speedRating: 'V', season: 'ALL_SEASON',
    sellingPrice: 1120000, quantity: 14, minStockLevel: 4, lowStock: false, active: true,
    description: "Mo''tadil iqlim uchun hamma mavsum yechimi.",
  },
];

/** Katalogdagi noyob brendlar (filtr uchun). */
export const DEMO_BRANDS: string[] = [...new Set(DEMO_PRODUCTS.map((p) => p.brandName!).filter(Boolean))].sort();
