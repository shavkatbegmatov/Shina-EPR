import api from './axios';
import type {
  ApiResponse,
  PagedResponse,
  PurchaseOrder,
  PurchaseRequest,
  PurchaseStats,
} from '../types';

export interface PurchaseFilters {
  page?: number;
  size?: number;
  supplierId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export const purchasesApi = {
  getAll: async (filters: PurchaseFilters = {}): Promise<PagedResponse<PurchaseOrder>> => {
    const params = new URLSearchParams();
    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.size !== undefined) params.append('size', filters.size.toString());
    if (filters.supplierId !== undefined) params.append('supplierId', filters.supplierId.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await api.get<ApiResponse<PagedResponse<PurchaseOrder>>>(`/v1/purchases?${params}`);
    return response.data.data;
  },

  getById: async (id: number): Promise<PurchaseOrder> => {
    const response = await api.get<ApiResponse<PurchaseOrder>>(`/v1/purchases/${id}`);
    return response.data.data;
  },

  getBySupplier: async (supplierId: number): Promise<PurchaseOrder[]> => {
    const response = await api.get<ApiResponse<PurchaseOrder[]>>(`/v1/purchases/by-supplier/${supplierId}`);
    return response.data.data;
  },

  getStats: async (): Promise<PurchaseStats> => {
    const response = await api.get<ApiResponse<PurchaseStats>>('/v1/purchases/stats');
    return response.data.data;
  },

  create: async (data: PurchaseRequest): Promise<PurchaseOrder> => {
    const response = await api.post<ApiResponse<PurchaseOrder>>('/v1/purchases', data);
    return response.data.data;
  },

  update: async (id: number, data: PurchaseRequest): Promise<PurchaseOrder> => {
    const response = await api.put<ApiResponse<PurchaseOrder>>(`/v1/purchases/${id}`, data);
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/v1/purchases/${id}`);
  },
};
