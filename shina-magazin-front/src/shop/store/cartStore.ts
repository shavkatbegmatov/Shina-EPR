import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '../../types';

export interface CartItem {
  product: Product;
  qty: number;
}

interface CartState {
  items: CartItem[];
  add: (product: Product, qty?: number) => void;
  remove: (productId: number) => void;
  setQty: (productId: number, qty: number) => void;
  clear: () => void;
}

/**
 * Protektor savati — mijoz tomonida (client-side), localStorage'da saqlanadi.
 * Backend Order domeni tayyor bo'lganda checkout shu holatdan serverga yuboradi.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      // Zaxira chegarasi POS savatida bor edi, do'kon savatida yo'q: mijoz
      // 3 donalik tovardan 50 ta qo'shib, to'rt bosqichli checkout'ni
      // to'ldirib, faqat OXIRIDA "Zaxira yetarli emas" xatosini olardi.
      add: (product, qty = 1) =>
        set((state) => {
          const limit = product.quantity ?? Number.MAX_SAFE_INTEGER;
          const existing = state.items.find((i) => i.product.id === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id
                  ? { ...i, qty: Math.min(i.qty + qty, limit) }
                  : i
              ),
            };
          }
          return { items: [...state.items, { product, qty: Math.min(qty, limit) }] };
        }),
      remove: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.product.id !== productId) })),
      setQty: (productId, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => i.product.id !== productId)
              : state.items.map((i) =>
                  i.product.id === productId
                    ? { ...i, qty: Math.min(qty, i.product.quantity ?? Number.MAX_SAFE_INTEGER) }
                    : i
                ),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: 'shop-cart' }
  )
);

/** Savatdagi jami dona (badge uchun). */
export const selectCartCount = (s: CartState): number =>
  s.items.reduce((sum, i) => sum + i.qty, 0);

/** Savat summasi. */
export const selectCartSubtotal = (s: CartState): number =>
  s.items.reduce((sum, i) => sum + i.product.sellingPrice * i.qty, 0);
