import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const COMPARE_MAX = 4;

interface CompareState {
  ids: number[];
  /** qo'shadi/olib tashlaydi; MAX'dan oshsa qo'shmaydi va false qaytaradi */
  toggle: (id: number) => boolean;
  remove: (id: number) => void;
  clear: () => void;
}

/**
 * Solishtirish ro'yxati — mijoz tomonida (`shop-compare`), MAX 4 ta.
 * Faqat ID'lar; to'liq mahsulot katalog seam'idan olinadi.
 */
export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => {
        const { ids } = get();
        if (ids.includes(id)) {
          set({ ids: ids.filter((x) => x !== id) });
          return true;
        }
        if (ids.length >= COMPARE_MAX) return false;
        set({ ids: [...ids, id] });
        return true;
      },
      remove: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
      clear: () => set({ ids: [] }),
    }),
    { name: 'shop-compare' }
  )
);

export const selectCompareCount = (s: CompareState): number => s.ids.length;
