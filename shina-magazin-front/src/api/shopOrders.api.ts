import api from './axios';
import type { ApiResponse, PagedResponse } from '../types';

export type ShopOrderStatus = 'NEW' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
export type ShopDeliveryMethod = 'DELIVERY' | 'PICKUP';
export type ShopPaymentMethod = 'CASH' | 'CARD' | 'PAYME' | 'CLICK';
export type ShopPaymentStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED';

export interface ShopOrderItemDto {
  productId: number;
  productName: string;
  sizeString?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ShopOrderDto {
  orderNo: string;
  status: ShopOrderStatus;
  customerId?: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryMethod: ShopDeliveryMethod;
  deliveryAddress?: string;
  deliveryNote?: string;
  paymentMethod: ShopPaymentMethod;
  paymentStatus: ShopPaymentStatus;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  createdAt: string;
  items: ShopOrderItemDto[];
}

export interface ShopOrderFilters {
  status?: ShopOrderStatus;
  customerId?: number;
  search?: string;
  page?: number;
  size?: number;
}

/** Storefront buyurtmalari — xodim API (himoyalangan: SALES_VIEW). */
export const shopOrdersApi = {
  getAll: async (filters: ShopOrderFilters = {}): Promise<PagedResponse<ShopOrderDto>> => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.customerId) params.append('customerId', filters.customerId.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.size !== undefined) params.append('size', filters.size.toString());
    const res = await api.get<ApiResponse<PagedResponse<ShopOrderDto>>>(`/v1/orders?${params}`);
    return res.data.data;
  },

  getByOrderNo: async (orderNo: string): Promise<ShopOrderDto> => {
    const res = await api.get<ApiResponse<ShopOrderDto>>(`/v1/orders/${encodeURIComponent(orderNo)}`);
    return res.data.data;
  },

  updateStatus: async (orderNo: string, status: ShopOrderStatus): Promise<ShopOrderDto> => {
    const res = await api.patch<ApiResponse<ShopOrderDto>>(
      `/v1/orders/${encodeURIComponent(orderNo)}/status?status=${status}`
    );
    return res.data.data;
  },
};
