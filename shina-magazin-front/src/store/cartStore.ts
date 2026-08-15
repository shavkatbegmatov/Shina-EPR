import { create } from 'zustand';
import type { CartItem, Customer, Product } from '../types';

interface CartState {
  items: CartItem[];
  customer: Customer | null;
  discount: number;
  discountPercent: number;

  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  updateItemDiscount: (productId: number, discount: number) => void;
  setCustomer: (customer: Customer | null) => void;
  setDiscount: (discount: number) => void;
  setDiscountPercent: (percent: number) => void;
  clear: () => void;

  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTotal: () => number;
  getItemCount: () => number;
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

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customer: null,
  discount: 0,
  discountPercent: 0,

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
}));
