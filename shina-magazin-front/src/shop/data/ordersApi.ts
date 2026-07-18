import api from './shopAccountAxios';
import type { ApiResponse } from '../../types';
import type { DeliveryMethod, PaymentMethod } from '../store/orderStore';

export interface CreateOrderPayload {
  items: Array<{ productId: number; quantity: number }>;
  name: string;
  phone: string;
  email?: string;
  deliveryMethod: DeliveryMethod;
  address?: string;
  note?: string;
  payment: PaymentMethod;
}

/** Backend ShopOrderResponse (kerakli qismi). */
export interface ServerOrder {
  orderNo: string;
  status: string;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
}

/** To'lov boshlash javobi (PaymentInitResponse). */
export interface PaymentInit {
  orderNo: string;
  method: string;
  /** Onlayn usul uchun provayder checkout URL'i; naqd/o'chiq uchun null */
  redirectUrl: string | null;
  paymentStatus: string;
  online: boolean;
}

/** Ommaviy buyurtma holati (ShopOrderStatusResponse) — shaxsiy ma'lumotsiz. */
export interface OrderStatus {
  orderNo: string;
  status: string;
  paymentStatus: string;
}

/**
 * Storefront buyurtma API klienti — backend `POST /v1/orders` (guest, auth'siz).
 * Backend narxni SERVERDA hisoblaydi va rasmiy orderNo qaytaradi.
 */
export const ordersApi = {
  create: async (payload: CreateOrderPayload): Promise<ServerOrder> => {
    const res = await api.post<ApiResponse<ServerOrder>>('/v1/orders', {
      ...payload,
      deliveryMethod: payload.deliveryMethod.toUpperCase(),
      payment: payload.payment.toUpperCase(),
    });
    return res.data.data;
  },

  /** To'lovni boshlash — onlayn usul uchun provayder checkout URL qaytaradi. */
  initiatePayment: async (orderNo: string): Promise<PaymentInit> => {
    const res = await api.post<ApiResponse<PaymentInit>>(`/v1/orders/${encodeURIComponent(orderNo)}/pay`);
    return res.data.data;
  },

  /** Ommaviy (guest) buyurtma holati — tasdiq sahifasida real to'lov holati uchun. */
  getStatus: async (orderNo: string): Promise<OrderStatus> => {
    const res = await api.get<ApiResponse<OrderStatus>>(`/v1/orders/${encodeURIComponent(orderNo)}/status`);
    return res.data.data;
  },
};
