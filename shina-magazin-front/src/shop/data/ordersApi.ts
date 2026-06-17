import api from '../../api/axios';
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

/**
 * Storefront buyurtma API klienti — backend `POST /v1/orders` (guest, auth'siz).
 * Backend narxni SERVERDA hisoblaydi va rasmiy orderNo qaytaradi.
 */
export const ordersApi = {
  create: async (payload: CreateOrderPayload): Promise<ServerOrder> => {
    const res = await api.post<ApiResponse<ServerOrder>>('/v1/orders', payload);
    return res.data.data;
  },
};
