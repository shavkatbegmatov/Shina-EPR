import { beforeEach, describe, expect, it } from 'vitest';
import { useCartStore } from './cartStore';
import type { Product } from '../types';

/**
 * Savat chegirmasi hech qachon subtotal'dan oshib qolmasligi.
 *
 * Chegirma faqat kiritish paytida clamp qilinardi — keyin tovar olib
 * tashlansa (yoki miqdor kamaysa) chegirma subtotal'dan katta bo'lib
 * qolar va MANFIY jami summa bilan sotuv o'tkazish mumkin edi.
 */

const product = (id: number, sellingPrice: number): Product =>
  ({
    id,
    name: `Shina ${id}`,
    sku: `SKU-${id}`,
    sellingPrice,
    quantity: 100,
    active: true,
  }) as Product;

const store = () => useCartStore.getState();

beforeEach(() => {
  store().clear();
});

describe('cartStore chegirma clamp', () => {
  it('tovar olib tashlanganda chegirma yangi subtotal bilan cheklanadi', () => {
    store().addItem(product(1, 500_000));
    store().addItem(product(2, 300_000));
    store().setDiscount(700_000); // subtotal 800 000 — ruxsat etiladi

    store().removeItem(2); // subtotal endi 500 000

    expect(store().discount).toBe(500_000);
    expect(store().getTotal()).toBe(0);
  });

  it('miqdor kamayganda ham chegirma qayta cheklanadi', () => {
    store().addItem(product(1, 500_000), 2); // subtotal 1 000 000
    store().setDiscount(900_000);

    store().updateQuantity(1, 1); // subtotal endi 500 000

    expect(store().discount).toBe(500_000);
    expect(store().getTotal()).toBe(0);
  });

  it('qator chegirmasi oshganda savat chegirmasi qayta cheklanadi', () => {
    store().addItem(product(1, 500_000));
    store().setDiscount(400_000);

    store().updateItemDiscount(1, 200_000); // subtotal endi 300 000

    expect(store().discount).toBe(300_000);
    expect(store().getTotal()).toBe(0);
  });

  it('audit ssenariysi: olib tashlashdan keyin jami hech qachon manfiy emas', () => {
    store().addItem(product(1, 2_000_000));
    store().addItem(product(2, 100_000));
    store().setDiscount(2_000_000);

    store().removeItem(1); // subtotal 100 000, eski chegirma 2 000 000 edi

    expect(store().getTotal()).toBeGreaterThanOrEqual(0);
    expect(store().discount).toBe(100_000);
  });

  it("chegirma subtotal ichida bo'lsa tegilmaydi", () => {
    store().addItem(product(1, 500_000));
    store().addItem(product(2, 300_000));
    store().setDiscount(100_000);

    store().removeItem(2);

    expect(store().discount).toBe(100_000);
    expect(store().getTotal()).toBe(400_000);
  });
});
