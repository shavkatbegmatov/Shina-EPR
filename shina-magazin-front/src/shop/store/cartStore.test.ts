import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore, selectCartCount, selectCartSubtotal } from './cartStore';
import type { Product } from '../../types';

const P1: Product = {
  id: 1, sku: 'A-1', name: 'Shina A', sellingPrice: 100_000,
  quantity: 10, minStockLevel: 1, lowStock: false, active: true,
};
const P2: Product = {
  id: 2, sku: 'B-2', name: 'Shina B', sellingPrice: 250_000,
  quantity: 5, minStockLevel: 1, lowStock: false, active: true,
};

describe('cartStore', () => {
  beforeEach(() => useCartStore.getState().clear());

  it('add yangi mahsulotni qo\'shadi (default qty 1)', () => {
    useCartStore.getState().add(P1);
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ product: P1, qty: 1 });
  });

  it('add bir mahsulotni qayta chaqirsa qty birlashtiradi', () => {
    const { add } = useCartStore.getState();
    add(P1, 2);
    add(P1, 3);
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].qty).toBe(5);
  });

  it('remove mahsulotni olib tashlaydi', () => {
    const { add, remove } = useCartStore.getState();
    add(P1);
    add(P2);
    remove(P1.id);
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].product.id).toBe(P2.id);
  });

  it('setQty miqdorni yangilaydi', () => {
    const { add, setQty } = useCartStore.getState();
    add(P1);
    setQty(P1.id, 7);
    expect(useCartStore.getState().items[0].qty).toBe(7);
  });

  it('setQty 0 yoki manfiy bo\'lsa mahsulotni o\'chiradi', () => {
    const { add, setQty } = useCartStore.getState();
    add(P1);
    add(P2);
    setQty(P1.id, 0);
    expect(useCartStore.getState().items.map((i) => i.product.id)).toEqual([P2.id]);
  });

  it('clear savatni bo\'shatadi', () => {
    const { add, clear } = useCartStore.getState();
    add(P1);
    clear();
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('selectCartCount jami donani qaytaradi', () => {
    const { add } = useCartStore.getState();
    add(P1, 2);
    add(P2, 3);
    expect(selectCartCount(useCartStore.getState())).toBe(5);
  });

  it('selectCartSubtotal summani qaytaradi', () => {
    const { add } = useCartStore.getState();
    add(P1, 2); // 200 000
    add(P2, 1); // 250 000
    expect(selectCartSubtotal(useCartStore.getState())).toBe(450_000);
  });
});
