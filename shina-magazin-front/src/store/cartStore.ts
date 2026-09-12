import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Customer, Product, TradeIn, TradeInLine } from '../types';

interface CartState {
  items: CartItem[];
  customer: Customer | null;
  discount: number;
  discountPercent: number;
  /** Barter: mijozdan qabul qilinayotgan eski shinalar (kredit sifatida). */
  tradeIns: TradeInLine[];
  /**
   * Mijoz oldinroq qoldirib ketgan barter hujjati (Barter sahifasida qabul
   * qilingan, kassada kutmoqda). Krediti savdodan ayiriladi; `tradeIns`
   * bilan birga bo'lishi mumkin — ikkalasi qo'shiladi.
   */
  tradeInDocument: TradeIn | null;

  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  updateItemDiscount: (productId: number, discount: number) => void;
  setCustomer: (customer: Customer | null) => void;
  setDiscount: (discount: number) => void;
  setDiscountPercent: (percent: number) => void;
  addTradeIn: (line: Omit<TradeInLine, 'key'>) => void;
  removeTradeIn: (key: string) => void;
  setTradeInDocument: (document: TradeIn | null) => void;
  clear: () => void;

  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTotal: () => number;
  getItemCount: () => number;
  /** Eski shinalar uchun beriladigan jami kredit (qatorlar + tanlangan hujjat). */
  getTradeInTotal: () => number;
  /** Mijoz to'lashi kerak bo'lgan summa: jami − barter (manfiy bo'lmaydi). */
  getAmountDue: () => number;
}

/** Savat qatorlarining jami (qator chegirmalari bilan). */
const subtotalOf = (items: CartItem[]) =>
  items.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity - item.discount,
    0
  );

/**
 * Summa-chegirma yangi subtotal'dan oshmasligi kerak. Chegirma faqat kiritish
 * paytida clamp qilinardi — keyin tovar olib tashlansa (yoki miqdor kamaysa)
 * chegirma subtotal'dan katta bo'lib qolar va manfiy jami summa bilan sotuv
 * o'tkazish mumkin edi.
 */
const clampDiscount = (discount: number, items: CartItem[]) =>
  Math.min(discount, Math.max(0, subtotalOf(items)));

/**
 * POS savati localStorage'da SAQLANADI: ilgari sahifa yangilansa (yoki planshet brauzeri
 * xotira tufayli tabni qayta yuklasa) mijoz oldida yig'ilgan savat yo'qolardi.
 * Vitrina savati allaqachon persist edi — POS'niki esa yo'q.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
  items: [],
  customer: null,
  discount: 0,
  discountPercent: 0,
  tradeIns: [],
  tradeInDocument: null,

  addItem: (product, quantity = 1) => {
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id);
      if (existing) {
        const newQuantity = existing.quantity + quantity;
        if (newQuantity > product.quantity) {
          return state; // Can't add more than available
        }
        return {
          items: state.items.map((i) =>
            i.product.id === product.id
              ? { ...i, quantity: newQuantity }
              : i
          ),
        };
      }
      if (quantity > product.quantity) {
        return state;
      }
      return {
        items: [...state.items, { product, quantity, discount: 0 }],
      };
    });
  },

  removeItem: (productId) => {
    set((state) => {
      const items = state.items.filter((i) => i.product.id !== productId);
      return { items, discount: clampDiscount(state.discount, items) };
    });
  },

  updateQuantity: (productId, quantity) => {
    set((state) => {
      const items = state.items.map((i) =>
        i.product.id === productId ? { ...i, quantity: Math.max(1, quantity) } : i
      );
      return { items, discount: clampDiscount(state.discount, items) };
    });
  },

  updateItemDiscount: (productId, discount) => {
    set((state) => {
      const items = state.items.map((i) =>
        i.product.id === productId ? { ...i, discount } : i
      );
      return { items, discount: clampDiscount(state.discount, items) };
    });
  },

  setCustomer: (customer) =>
    set((state) => ({
      customer,
      // Hujjat mijozga bog'liq: boshqa mijoz tanlansa (yoki mijoz olib
      // tashlansa) u savatda qolmasligi kerak — server baribir rad etadi
      tradeInDocument:
        state.tradeInDocument && customer && state.tradeInDocument.customerId === customer.id
          ? state.tradeInDocument
          : null,
    })),

  setDiscount: (discount) => set({ discount, discountPercent: 0 }),

  setDiscountPercent: (discountPercent) => set({ discountPercent, discount: 0 }),

  addTradeIn: (line) =>
    set((state) => ({
      tradeIns: [
        ...state.tradeIns,
        // Kalit faqat ro'yxatda ajratish uchun — serverga ketmaydi
        { ...line, key: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` },
      ],
    })),

  removeTradeIn: (key) =>
    set((state) => ({ tradeIns: state.tradeIns.filter((line) => line.key !== key) })),

  setTradeInDocument: (document) => set({ tradeInDocument: document }),

  clear: () =>
    set({
      items: [],
      customer: null,
      discount: 0,
      discountPercent: 0,
      tradeIns: [],
      tradeInDocument: null,
    }),

  getSubtotal: () => {
    const { items } = get();
    return items.reduce(
      (sum, item) =>
        sum + item.product.sellingPrice * item.quantity - item.discount,
      0
    );
  },

  getDiscountAmount: () => {
    const { discount, discountPercent } = get();
    if (discount > 0) return discount;
    if (discountPercent > 0) {
      return get().getSubtotal() * (discountPercent / 100);
    }
    return 0;
  },

  getTotal: () => {
    return get().getSubtotal() - get().getDiscountAmount();
  },

  getItemCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },

  getTradeInTotal: () => {
    const { tradeIns, tradeInDocument } = get();
    const lines = tradeIns.reduce((sum, line) => sum + line.quantity * line.unitValue, 0);
    return lines + (tradeInDocument?.totalAmount ?? 0);
  },

  getAmountDue: () => {
    return Math.max(0, get().getTotal() - get().getTradeInTotal());
  },
    }),
    {
      name: 'pos-cart',
      partialize: (state) => ({
        items: state.items,
        customer: state.customer,
        discount: state.discount,
        discountPercent: state.discountPercent,
        tradeIns: state.tradeIns,
        tradeInDocument: state.tradeInDocument,
      }),
      // Eski saqlangan savatda `tradeIns`/`tradeInDocument` yo'q — bo'sh bilan to'ldiriladi
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<CartState>),
        tradeIns: (persisted as Partial<CartState>)?.tradeIns ?? [],
        tradeInDocument: (persisted as Partial<CartState>)?.tradeInDocument ?? null,
      }),
    }
  )
);
