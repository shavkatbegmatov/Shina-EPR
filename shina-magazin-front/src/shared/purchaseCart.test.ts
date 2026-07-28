import { describe, expect, it } from 'vitest';
import {
  addToCart,
  cartTotal,
  cartTotalQuantity,
  initialUnitPrice,
  removeFromCart,
  updateCartItem,
  type CartItem,
} from './purchaseCart';
import type { Product } from '../types';

/**
 * Xarid savati.
 *
 * <p>Bu yerda pul arifmetikasi: xato bo'lsa ta'minotchiga noto'g'ri summa
 * yoziladi va qarz noto'g'ri hisoblanadi. Ilgari bu mantiq sahifa ichidagi
 * handler'lar orasiga tarqalgan edi va umuman sinalmagan.
 */

function product(id: number, overrides: Partial<Product> = {}): Product {
  return {
    id,
    sku: `SKU-${id}`,
    name: `Shina ${id}`,
    sellingPrice: 1_000_000,
    purchasePrice: 700_000,
    quantity: 10,
    minStockLevel: 2,
    active: true,
    ...overrides,
  } as Product;
}

describe('addToCart', () => {
  it('yangi mahsulotni bitta dona bilan qo\'shadi', () => {
    const items = addToCart([], product(1));

    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(1);
    expect(items[0].unitPrice).toBe(700_000);
  });

  // Kassir bir mahsulotni ikki marta bossa, ikkita qator emas — bitta qator
  // ikki dona bo'lishi kerak.
  it('mavjud mahsulotda miqdorni oshiradi, yangi qator ochmaydi', () => {
    const items = addToCart(addToCart([], product(1)), product(1));

    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
  });

  // Narx qayta hisoblansa kassirning qo'lda kiritgan tuzatishi yo'qolardi.
  it('miqdor oshganda qo\'lda kiritilgan narx saqlanadi', () => {
    const withCustomPrice = updateCartItem(addToCart([], product(1)), 1, 'unitPrice', 650_000);
    const items = addToCart(withCustomPrice, product(1));

    expect(items[0].unitPrice).toBe(650_000);
  });

  it('boshqa mahsulot alohida qator bo\'ladi', () => {
    const items = addToCart(addToCart([], product(1)), product(2));

    expect(items).toHaveLength(2);
  });

  it('asl massivni o\'zgartirmaydi', () => {
    const original: CartItem[] = [];
    addToCart(original, product(1));

    expect(original).toHaveLength(0);
  });
});

describe('initialUnitPrice', () => {
  it('xarid narxi bo\'lsa o\'shani oladi', () => {
    expect(initialUnitPrice(product(1, { purchasePrice: 555_000 }))).toBe(555_000);
  });

  // Xarid narxi kiritilmagan mahsulot uchun noldan boshlagandan ko'ra,
  // yaqin taxminni tuzatgan qulay.
  it('xarid narxi yo\'q bo\'lsa sotuv narxining 70% i', () => {
    expect(initialUnitPrice(product(1, { purchasePrice: undefined, sellingPrice: 1_000_000 })))
      .toBe(700_000);
  });

  it('xarid narxi nol bo\'lsa ham 70% ga qaytadi', () => {
    expect(initialUnitPrice(product(1, { purchasePrice: 0, sellingPrice: 500_000 })))
      .toBe(350_000);
  });

  /**
   * Taxmin BUTUN so'mga yaxlitlanadi.
   *
   * <p>So'mning kasr qismi amalda ishlatilmaydi, lekin 70% hisobi uni
   * osongina hosil qiladi (999 999 -> 699 999.3). Bunday qiymat
   * `DECIMAL(15,2)` ustunga yozilib, xarid summasi va mahsulotning
   * tannarxiga o'tardi — tannarx esa FOYDA hisobiga kiradi.
   *
   * <p>Ilgari testlar faqat yumaloq sonlarda edi, shuning uchun farq
   * ko'rinmasdi.
   */
  it('taxminni butun so\'mga yaxlitlaydi', () => {
    expect(initialUnitPrice(product(1, { purchasePrice: 0, sellingPrice: 999_999 })))
      .toBe(699_999);
    expect(initialUnitPrice(product(1, { purchasePrice: 0, sellingPrice: 123_457 })))
      .toBe(86_420);
  });
});

describe('updateCartItem', () => {
  it('miqdorni o\'zgartiradi', () => {
    const items = updateCartItem(addToCart([], product(1)), 1, 'quantity', 5);

    expect(items[0].quantity).toBe(5);
  });

  it('narxni o\'zgartiradi', () => {
    const items = updateCartItem(addToCart([], product(1)), 1, 'unitPrice', 123_456);

    expect(items[0].unitPrice).toBe(123_456);
  });

  it('boshqa qatorlarga tegmaydi', () => {
    const two = addToCart(addToCart([], product(1)), product(2));
    const items = updateCartItem(two, 1, 'quantity', 9);

    expect(items[1].quantity).toBe(1);
  });

  it('mavjud bo\'lmagan mahsulot savatni o\'zgartirmaydi', () => {
    const one = addToCart([], product(1));
    const items = updateCartItem(one, 999, 'quantity', 5);

    expect(items).toEqual(one);
  });
});

describe('removeFromCart', () => {
  it('faqat ko\'rsatilgan qatorni olib tashlaydi', () => {
    const two = addToCart(addToCart([], product(1)), product(2));
    const items = removeFromCart(two, 1);

    expect(items).toHaveLength(1);
    expect(items[0].product.id).toBe(2);
  });
});

describe('jami hisoblar', () => {
  it('jami summa = miqdor × narx', () => {
    let items = addToCart([], product(1, { purchasePrice: 700_000 }));
    items = updateCartItem(items, 1, 'quantity', 3);
    items = addToCart(items, product(2, { purchasePrice: 500_000 }));
    items = updateCartItem(items, 2, 'quantity', 2);

    expect(cartTotal(items)).toBe(3 * 700_000 + 2 * 500_000);
    expect(cartTotalQuantity(items)).toBe(5);
  });

  it('bo\'sh savat nol beradi', () => {
    expect(cartTotal([])).toBe(0);
    expect(cartTotalQuantity([])).toBe(0);
  });
});
