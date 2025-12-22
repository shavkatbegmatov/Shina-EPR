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
    set((state) => ({
      items: state.items.filter((i) => i.product.id !== productId),
    }));
  },

  updateQuantity: (productId, quantity) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId ? { ...i, quantity: Math.max(1, quantity) } : i
      ),
    }));
  },

  updateItemDiscount: (productId, discount) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId ? { ...i, discount } : i
      ),
    }));
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
