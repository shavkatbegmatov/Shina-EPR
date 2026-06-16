import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistState {
  ids: number[];
  toggle: (id: number) => void;
  remove: (id: number) => void;
  clear: () => void;
}

/**
 * Saqlanganlar (wishlist) — mijoz tomonida, localStorage'da (`shop-wishlist`).
 * Faqat mahsulot ID'lari saqlanadi; to'liq mahsulot katalog seam'idan olinadi.
 */
export const useWishlistStore = create<WishlistState>()(
  persist(
    (set) => ({
      ids: [],
      toggle: (id) =>
        set((s) => ({
          ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [id, ...s.ids],
        })),
      remove: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
      clear: () => set({ ids: [] }),
    }),
    { name: 'shop-wishlist' }
  )
);

export const selectWishlistCount = (s: WishlistState): number => s.ids.length;
