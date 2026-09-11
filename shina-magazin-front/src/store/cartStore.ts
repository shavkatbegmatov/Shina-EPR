import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Customer, Product, TradeIn } from '../types';
import {
  addTradeInLine,
  removeTradeInLine,
  tradeInTotal,
  updateTradeInLine,
  type TradeInCartItem,
} from '../shared/tradeInCart';

interface CartState {
  items: CartItem[];
  customer: Customer | null;
  discount: number;
  discountPercent: number;

  /** Kassada shu zahoti baholanayotgan eski shinalar. */
  tradeInItems: TradeInCartItem[];
  /**
   * Mijoz oldinroq qoldirgan barter hujjati.
   *
   * <p>`tradeInItems` bilan BIR VAQTDA bo'lmaydi: server ikkalasini birga
   * qabul qilmaydi, chunki qaysi baho ishlatilgani noaniq bo'lardi.
   */
  tradeInDocument: TradeIn | null;

  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  updateItemDiscount: (productId: number, discount: number) => void;
  setCustomer: (customer: Customer | null) => void;
  setDiscount: (discount: number) => void;
  setDiscountPercent: (percent: number) => void;
  clear: () => void;

  addTradeInItem: (product: Product, unitValue?: number) => void;
  updateTradeInItem: (
    productId: number,
    patch: Partial<Pick<TradeInCartItem, 'quantity' | 'unitValue' | 'conditionNote'>>
  ) => void;
  removeTradeInItem: (productId: number) => void;
  setTradeInDocument: (tradeIn: TradeIn | null) => void;
  clearTradeIn: () => void;

  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTotal: () => number;
  getItemCount: () => number;
  /** Barter summasi: hujjat tanlangan bo'lsa undan, aks holda qatorlardan. */
  getTradeInAmount: () => number;
  /** To'lanishi kerak bo'lgan summa: jami minus barter (manfiy bo'lmaydi). */
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
  tradeInItems: [],
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

  setCustomer: (customer) => set({ customer }),

  setDiscount: (discount) => set({ discount, discountPercent: 0 }),

  setDiscountPercent: (discountPercent) => set({ discountPercent, discount: 0 }),

  clear: () =>
    set({
      items: [],
      customer: null,
      discount: 0,
      discountPercent: 0,
      tradeInItems: [],
      tradeInDocument: null,
    }),

  // Qator qo'shilganda tanlangan hujjat bekor qilinadi (va aksincha): ikkalasi
  // birga yuborilsa server so'rovni rad etadi.
  addTradeInItem: (product, unitValue) =>
    set((state) => ({
      tradeInItems: addTradeInLine(state.tradeInItems, product, unitValue),
      tradeInDocument: null,
    })),

  updateTradeInItem: (productId, patch) =>
    set((state) => ({ tradeInItems: updateTradeInLine(state.tradeInItems, productId, patch) })),

  removeTradeInItem: (productId) =>
    set((state) => ({ tradeInItems: removeTradeInLine(state.tradeInItems, productId) })),

  setTradeInDocument: (tradeIn) => set({ tradeInDocument: tradeIn, tradeInItems: [] }),

  clearTradeIn: () => set({ tradeInItems: [], tradeInDocument: null }),

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

  getTradeInAmount: () => {
    const { tradeInDocument, tradeInItems } = get();
    if (tradeInDocument) return tradeInDocument.totalAmount;
    return tradeInTotal(tradeInItems);
  },

  // Barter jamidan KATTA bo'lsa ham bu yerda kamaytirilmaydi: kassir mijozga
  // aytgan bahoni tizim jimgina o'zgartirmasligi kerak. To'lovga o'tish
  // sahifada to'siladi va server ham rad etadi.
  getAmountDue: () => Math.max(0, get().getTotal() - get().getTradeInAmount()),
    }),
    {
      name: 'pos-cart',
      partialize: (state) => ({
        items: state.items,
        customer: state.customer,
        discount: state.discount,
        discountPercent: state.discountPercent,
        tradeInItems: state.tradeInItems,
        tradeInDocument: state.tradeInDocument,
      }),
    }
  )
);
