import { create } from 'zustand';

interface QuickViewState {
  openId: number | null;
  open: (id: number) => void;
  close: () => void;
}

/**
 * Tezkor ko'rish (quick view) modali holati — transient (persist QILINMAYDI).
 * Karta -> open(id); yagona QuickViewModal ShopLayout'da render qilinadi.
 */
export const useQuickViewStore = create<QuickViewState>((set) => ({
  openId: null,
  open: (id) => set({ openId: id }),
  close: () => set({ openId: null }),
}));
