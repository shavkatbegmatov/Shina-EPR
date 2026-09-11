import { describe, expect, it } from 'vitest';
import {
  addTradeInLine,
  isTradeInExcessive,
  removeTradeInLine,
  suggestedUnitValue,
  toTradeInRequestItems,
  tradeInQuantity,
  tradeInTotal,
  updateTradeInLine,
  type TradeInCartItem,
} from './tradeInCart';
import type { Product } from '../types';

/**
 * Barter savati.
 *
 * <p>Bu yerda ham pul arifmetikasi: xato bo'lsa mijozdan olingan eski shina
 * noto'g'ri baholanadi va savdodan noto'g'ri summa ayiriladi. Baho kassir
 * mijozga OG'ZAKI aytgan raqam, ya'ni uni jimgina o'zgartirib bo'lmaydi.
 */

function product(id: number, overrides: Partial<Product> = {}): Product {
  return {
    id,
    sku: `SKU-${id}`,
    name: `B/U shina ${id}`,
    sellingPrice: 400_000,
    purchasePrice: 0,
    quantity: 0,
    minStockLevel: 0,
    active: true,
    ...overrides,
  } as Product;
}

describe('suggestedUnitValue', () => {
  it("tannarx bo'lsa o'shani taklif qiladi", () => {
    expect(suggestedUnitValue(product(1, { purchasePrice: 180_000 }))).toBe(180_000);
  });

  it("tannarx yo'q bo'lsa sotuv narxining yarmini taklif qiladi", () => {
    expect(suggestedUnitValue(product(1, { purchasePrice: 0, sellingPrice: 400_000 }))).toBe(200_000);
  });

  it("ming so'mgacha yaxlitlaydi — kasrli so'm tannarxni ifloslantiradi", () => {
    expect(suggestedUnitValue(product(1, { purchasePrice: 0, sellingPrice: 333_333 }))).toBe(167_000);
  });
});

describe('tradeInTotal', () => {
  it("qatorlar bo'yicha yig'adi", () => {
    const items: TradeInCartItem[] = [
      { product: product(1), quantity: 2, unitValue: 100_000 },
      { product: product(2), quantity: 1, unitValue: 150_000 },
    ];

    expect(tradeInTotal(items)).toBe(350_000);
    expect(tradeInQuantity(items)).toBe(3);
  });

  it("bo'sh savatda nol", () => {
    expect(tradeInTotal([])).toBe(0);
  });
});

describe('addTradeInLine', () => {
  it("yangi qatorni taklif qilingan baho bilan qo'shadi", () => {
    const items = addTradeInLine([], product(1, { purchasePrice: 120_000 }));

    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(1);
    expect(items[0].unitValue).toBe(120_000);
  });

  it("mavjud qatorga miqdor qo'shadi, bahoni o'zgartirmaydi", () => {
    const first = addTradeInLine([], product(1), 90_000);
    const second = addTradeInLine(first, product(1), 500_000);

    expect(second).toHaveLength(1);
    expect(second[0].quantity).toBe(2);
    // Kassir kiritgan baho saqlanadi
    expect(second[0].unitValue).toBe(90_000);
  });
});

describe('updateTradeInLine', () => {
  it("bahoni va miqdorni yangilaydi", () => {
    const items = updateTradeInLine(
      [{ product: product(1), quantity: 1, unitValue: 100_000 }],
      1,
      { quantity: 3, unitValue: 130_000 }
    );

    expect(items[0].quantity).toBe(3);
    expect(items[0].unitValue).toBe(130_000);
  });

  it("miqdor 1 dan past tushmaydi va baho manfiy bo'lmaydi", () => {
    const items = updateTradeInLine(
      [{ product: product(1), quantity: 2, unitValue: 100_000 }],
      1,
      { quantity: 0, unitValue: -5_000 }
    );

    expect(items[0].quantity).toBe(1);
    expect(items[0].unitValue).toBe(0);
  });
});

describe('removeTradeInLine', () => {
  it("qatorni olib tashlaydi", () => {
    const items = removeTradeInLine(
      [
        { product: product(1), quantity: 1, unitValue: 100_000 },
        { product: product(2), quantity: 1, unitValue: 200_000 },
      ],
      1
    );

    expect(items).toHaveLength(1);
    expect(items[0].product.id).toBe(2);
  });
});

describe('toTradeInRequestItems', () => {
  it("serverga faqat kerakli maydonlarni yuboradi", () => {
    const items = toTradeInRequestItems([
      { product: product(7), quantity: 2, unitValue: 100_000, conditionNote: 'protektor 60%' },
    ]);

    expect(items).toEqual([
      { productId: 7, quantity: 2, unitValue: 100_000, conditionNote: 'protektor 60%' },
    ]);
  });
});

describe('isTradeInExcessive', () => {
  it("barter savdo summasidan katta bo'lsa belgilanadi", () => {
    expect(isTradeInExcessive(1_000_000, 900_000)).toBe(true);
  });

  it("teng bo'lsa ruxsat: mijoz hech narsa to'lamaydi", () => {
    expect(isTradeInExcessive(900_000, 900_000)).toBe(false);
  });

  it("kichik bo'lsa ruxsat", () => {
    expect(isTradeInExcessive(200_000, 900_000)).toBe(false);
  });
});
