import api from './axios';
import type { ApiResponse, Supplier, SupplierRequest, PagedResponse } from '../types';

export interface SupplierFilters {
  page?: number;
  size?: number;
  search?: string;
}

export const suppliersApi = {
  getAll: async (filters: SupplierFilters = {}): Promise<PagedResponse<Supplier>> => {
    const params = new URLSearchParams();
    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.size !== undefined) params.append('size', filters.size.toString());
    if (filters.search) params.append('search', filters.search);

    const response = await api.get<ApiResponse<PagedResponse<Supplier>>>(`/v1/suppliers?${params}`);
    return response.data.data;
  },

  getActive: async (): Promise<Supplier[]> => {
    const response = await api.get<ApiResponse<Supplier[]>>('/v1/suppliers/active');
    return response.data.data;
  },

  getById: async (id: number): Promise<Supplier> => {
    const response = await api.get<ApiResponse<Supplier>>(`/v1/suppliers/${id}`);
    return response.data.data;
  },

  getWithDebt: async (): Promise<Supplier[]> => {
    const response = await api.get<ApiResponse<Supplier[]>>('/v1/suppliers/with-debt');
    return response.data.data;
  },

  getTotalDebt: async (): Promise<number> => {
    const response = await api.get<ApiResponse<number>>('/v1/suppliers/total-debt');
    return response.data.data;
  },

  create: async (data: SupplierRequest): Promise<Supplier> => {
    const response = await api.post<ApiResponse<Supplier>>('/v1/suppliers', data);
    return response.data.data;
  },

  update: async (id: number, data: SupplierRequest): Promise<Supplier> => {
    const response = await api.put<ApiResponse<Supplier>>(`/v1/suppliers/${id}`, data);
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/v1/suppliers/${id}`);
  },
};
