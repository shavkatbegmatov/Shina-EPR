import api from './axios';
import type { ApiResponse, PagedResponse, Sale, SaleRequest } from '../types';
import { createExportApi } from './export.utils';

export interface SaleFilters {
  page?: number;
  size?: number;
  sort?: string;
  startDate?: string;
  endDate?: string;
}

export const salesApi = {
  getAll: async (filters: SaleFilters = {}): Promise<PagedResponse<Sale>> => {
    const params = new URLSearchParams();
    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.size !== undefined) params.append('size', filters.size.toString());
    if (filters.sort) params.append('sort', filters.sort);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await api.get<ApiResponse<PagedResponse<Sale>>>(`/v1/sales?${params}`);
    return response.data.data;
  },

  getById: async (id: number): Promise<Sale> => {
    const response = await api.get<ApiResponse<Sale>>(`/v1/sales/${id}`);
    return response.data.data;
  },

  getToday: async (): Promise<Sale[]> => {
    const response = await api.get<ApiResponse<Sale[]>>('/v1/sales/today');
    return response.data.data;
  },

  create: async (data: SaleRequest): Promise<Sale> => {
    const response = await api.post<ApiResponse<Sale>>('/v1/sales', data);
    return response.data.data;
  },

  cancel: async (id: number): Promise<Sale> => {
    const response = await api.put<ApiResponse<Sale>>(`/v1/sales/${id}/cancel`);
    return response.data.data;
  },

  // Export functionality
  export: createExportApi('/v1/sales'),
};
