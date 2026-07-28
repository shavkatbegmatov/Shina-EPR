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

/** Backend ShopOrderResponse — tafsilot sahifasi uchun to'liq maydonlar. */
export interface AccountOrderDetail extends AccountOrder {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  /** DELIVERY | PICKUP */
  deliveryMethod: string;
  deliveryAddress?: string;
  deliveryNote?: string;
  /** CASH | CARD | PAYME | CLICK */
  paymentMethod: string;
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

  /** Bitta buyurtma tafsiloti. Begona buyurtmada backend 404 qaytaradi. */
  orderByNo: async (orderNo: string): Promise<AccountOrderDetail> => {
    const res = await shopAccountApi.get<ApiResponse<AccountOrderDetail>>(
      `/v1/account/orders/${encodeURIComponent(orderNo)}`
    );
    return res.data.data;
  },
};
