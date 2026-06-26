import shopAccountApi from './shopAccountAxios';
import type { ApiResponse, PagedResponse } from '../../types';

/** Backend ShopOrderResponse.Item (kerakli qismi). */
export interface AccountOrderItem {
  productName: string;
  sizeString?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/** Backend ShopOrderResponse (mijoz akkaunti ro'yxati uchun). */
export interface AccountOrder {
  orderNo: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  createdAt: string;
  items: AccountOrderItem[];
}

/**
 * Login qilgan mijozning storefront buyurtmalari (backend'dan).
 * `GET /v1/account/orders` — hasRole CUSTOMER (portal telefon+PIN sessiyasi).
 */
export const accountApi = {
  myOrders: async (page = 0, size = 20): Promise<PagedResponse<AccountOrder>> => {
    const res = await shopAccountApi.get<ApiResponse<PagedResponse<AccountOrder>>>(
      `/v1/account/orders?page=${page}&size=${size}`
    );
    return res.data.data;
  },
};
