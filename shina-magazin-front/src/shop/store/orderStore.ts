import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from './cartStore';

export type PaymentMethod = 'cash' | 'card' | 'payme' | 'click';
export type DeliveryMethod = 'delivery' | 'pickup';

export interface ShopOrder {
  orderNo: string;
  createdAt: number;
  items: CartItem[];
  contact: { name: string; phone: string; email?: string };
  delivery: { method: DeliveryMethod; address?: string; note?: string };
  payment: PaymentMethod;
  subtotal: number;
  deliveryFee: number;
  total: number;
}

interface OrderState {
  orders: ShopOrder[];
  addOrder: (order: ShopOrder) => void;
}

/**
 * Mijoz buyurtmalari tarixi — hozircha client-side (localStorage).
 * Backend Order domeni tayyor bo'lganda `ordersApi.create()` ga almashtiriladi
 * va bu store faqat keshlash/optimistik UI uchun qoladi.
 */
export const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      orders: [],
      addOrder: (order) => set((s) => ({ orders: [order, ...s.orders] })),
    }),
    { name: 'shop-orders' }
  )
);

/** Yetkazib berish narxi: 1 000 000 so'mdan oshsa bepul, aks holda 30 000. Olib ketish — bepul. */
export const DELIVERY_FEE = 30000;
export const FREE_DELIVERY_THRESHOLD = 1000000;

export function calcDeliveryFee(method: DeliveryMethod, subtotal: number): number {
  if (method === 'pickup') return 0;
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}
