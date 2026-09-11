/**
 * Barter savati — eski shinani baholash matematikasi.
 *
 * <p>Alohida modul, chunki bu PUL arifmetikasi: uni sahifani render qilmasdan
 * sinash kerak. `purchaseCart.ts` ham xuddi shu sababdan ajratilgan.
 *
 * <p>Muhim qoida: barter savdo QIYMATINI kamaytirmaydi, faqat to'lanadigan
 * summani kamaytiradi. Ya'ni 900 000 lik savdoda 200 000 lik barter bo'lsa,
 * savdo qiymati 900 000 bo'lib qoladi va kassaga 700 000 tushadi.
 */
import type { Product, TradeInItemRequest } from '../types';

export interface TradeInCartItem {
  product: Product;
  quantity: number;
  /** Bitta shinaning baholangan narxi. */
  unitValue: number;
  conditionNote?: string;
}

/** Qatorlar jami — savdodan aynan shu summa ayiriladi. */
export const tradeInTotal = (items: TradeInCartItem[]): number =>
  items.reduce((sum, item) => sum + item.unitValue * item.quantity, 0);

export const tradeInQuantity = (items: TradeInCartItem[]): number =>
  items.reduce((sum, item) => sum + item.quantity, 0);

/**
 * Boshlang'ich baho taklifi.
 *
 * <p>B/U kartochkada tannarx bo'lsa o'sha olinadi — do'kon shu narxda qabul
 * qilib turgan. Bo'lmasa sotuv narxining yarmi: b/u shinada odatiy ustama shu
 * atrofda. Har ikki holda ming so'mgacha yaxlitlanadi — kassir baribir qo'lda
 * o'zgartiradi, kasrli so'm esa tannarxni ifloslantiradi.
 */
export const suggestedUnitValue = (product: Product): number => {
  const base =
    product.purchasePrice && product.purchasePrice > 0
      ? product.purchasePrice
      : (product.sellingPrice ?? 0) / 2;
  return Math.max(0, Math.round(base / 1000) * 1000);
};

export const addTradeInLine = (
  items: TradeInCartItem[],
  product: Product,
  unitValue?: number,
  quantity = 1
): TradeInCartItem[] => {
  const existing = items.find((i) => i.product.id === product.id);
  if (existing) {
    return items.map((i) =>
      i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
    );
  }
  return [
    ...items,
    {
      product,
      quantity: Math.max(1, quantity),
      unitValue: unitValue ?? suggestedUnitValue(product),
    },
  ];
};

export const updateTradeInLine = (
  items: TradeInCartItem[],
  productId: number,
  patch: Partial<Pick<TradeInCartItem, 'quantity' | 'unitValue' | 'conditionNote'>>
): TradeInCartItem[] =>
  items.map((i) =>
    i.product.id === productId
      ? {
          ...i,
          ...patch,
          quantity: Math.max(1, patch.quantity ?? i.quantity),
          unitValue: Math.max(0, patch.unitValue ?? i.unitValue),
        }
      : i
  );

export const removeTradeInLine = (
  items: TradeInCartItem[],
  productId: number
): TradeInCartItem[] => items.filter((i) => i.product.id !== productId);

/** Serverga yuboriladigan ko'rinish. */
export const toTradeInRequestItems = (items: TradeInCartItem[]): TradeInItemRequest[] =>
  items.map((i) => ({
    productId: i.product.id,
    quantity: i.quantity,
    unitValue: i.unitValue,
    conditionNote: i.conditionNote,
  }));

/**
 * Barter savdo summasidan oshib ketdimi.
 *
 * <p>Chegirmadan farqli o'laroq AVTOMATIK kamaytirilmaydi: kassir mijozga
 * aytgan bahoni tizim jimgina o'zgartirsa, mijoz bilan kelishuv buziladi.
 * O'rniga to'lovga o'tish to'siladi va kassir o'zi qaror qiladi.
 */
export const isTradeInExcessive = (tradeIn: number, saleTotal: number): boolean =>
  tradeIn > saleTotal;
