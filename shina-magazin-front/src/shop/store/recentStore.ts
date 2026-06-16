import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX = 8;

interface RecentState {
  ids: number[];
  add: (id: number) => void;
  clear: () => void;
}

/**
 * Yaqinda ko'rilgan mahsulotlar — mijoz tomonida (`shop-recent`).
 * PDP ochilganda qo'shiladi; eng yangisi birinchi, MAX tagacha.
 */
export const useRecentStore = create<RecentState>()(
  persist(
    (set) => ({
      ids: [],
      add: (id) =>
        set((s) => ({ ids: [id, ...s.ids.filter((x) => x !== id)].slice(0, MAX) })),
      clear: () => set({ ids: [] }),
    }),
    { name: 'shop-recent' }
  )
);
