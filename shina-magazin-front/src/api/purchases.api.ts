import api from './axios';
import type {
  ApiResponse,
  PagedResponse,
  PurchaseOrder,
  PurchaseRequest,
  PurchaseStats,
  PurchasePayment,
  PurchasePaymentRequest,
  PurchaseReturn,
  PurchaseReturnRequest,
  PurchaseReturnStatus,
} from '../types';
import { createExportApi } from './export.utils';

export interface PurchaseFilters {
  page?: number;
  size?: number;
  supplierId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface ReturnFilters {
  page?: number;
  size?: number;
  status?: PurchaseReturnStatus;
}

export const purchasesApi = {
  // ==================== PURCHASE ORDERS ====================

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

  // ==================== PAYMENTS ====================

  getPayments: async (purchaseId: number): Promise<PurchasePayment[]> => {
    const response = await api.get<ApiResponse<PurchasePayment[]>>(`/v1/purchases/${purchaseId}/payments`);
    return response.data.data;
  },

  addPayment: async (purchaseId: number, data: PurchasePaymentRequest): Promise<PurchasePayment> => {
    const response = await api.post<ApiResponse<PurchasePayment>>(`/v1/purchases/${purchaseId}/payments`, data);
    return response.data.data;
  },

  // ==================== RETURNS ====================

  getReturns: async (purchaseId: number): Promise<PurchaseReturn[]> => {
    const response = await api.get<ApiResponse<PurchaseReturn[]>>(`/v1/purchases/${purchaseId}/returns`);
    return response.data.data;
  },

  createReturn: async (purchaseId: number, data: PurchaseReturnRequest): Promise<PurchaseReturn> => {
    const response = await api.post<ApiResponse<PurchaseReturn>>(`/v1/purchases/${purchaseId}/returns`, data);
    return response.data.data;
  },

  getAllReturns: async (filters: ReturnFilters = {}): Promise<PagedResponse<PurchaseReturn>> => {
    const params = new URLSearchParams();
    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.size !== undefined) params.append('size', filters.size.toString());
    if (filters.status) params.append('status', filters.status);

    const response = await api.get<ApiResponse<PagedResponse<PurchaseReturn>>>(`/v1/purchase-returns?${params}`);
    return response.data.data;
  },

  getReturnById: async (returnId: number): Promise<PurchaseReturn> => {
    const response = await api.get<ApiResponse<PurchaseReturn>>(`/v1/purchase-returns/${returnId}`);
    return response.data.data;
  },

  approveReturn: async (returnId: number): Promise<PurchaseReturn> => {
    const response = await api.put<ApiResponse<PurchaseReturn>>(`/v1/purchase-returns/${returnId}/approve`);
    return response.data.data;
  },

  completeReturn: async (returnId: number): Promise<PurchaseReturn> => {
    const response = await api.put<ApiResponse<PurchaseReturn>>(`/v1/purchase-returns/${returnId}/complete`);
    return response.data.data;
  },

  deleteReturn: async (returnId: number): Promise<void> => {
    await api.delete(`/v1/purchase-returns/${returnId}`);
  },

  // Export functionality
  export: createExportApi('/v1/purchases'),
  exportReturns: createExportApi('/v1/purchase-returns'),
};
