import api from './axios';
import type { ApiResponse, Customer, CustomerRequest, PagedResponse } from '../types';

export interface CustomerFilters {
  page?: number;
  size?: number;
  search?: string;
}

export const customersApi = {
  getAll: async (filters: CustomerFilters = {}): Promise<PagedResponse<Customer>> => {
    const params = new URLSearchParams();
    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.size !== undefined) params.append('size', filters.size.toString());
    if (filters.search) params.append('search', filters.search);

    const response = await api.get<ApiResponse<PagedResponse<Customer>>>(`/v1/customers?${params}`);
    return response.data.data;
  },

  getById: async (id: number): Promise<Customer> => {
    const response = await api.get<ApiResponse<Customer>>(`/v1/customers/${id}`);
    return response.data.data;
  },

  getWithDebt: async (): Promise<Customer[]> => {
    const response = await api.get<ApiResponse<Customer[]>>('/v1/customers/with-debt');
    return response.data.data;
  },

  create: async (data: CustomerRequest): Promise<Customer> => {
    const response = await api.post<ApiResponse<Customer>>('/v1/customers', data);
    return response.data.data;
  },

  update: async (id: number, data: CustomerRequest): Promise<Customer> => {
    const response = await api.put<ApiResponse<Customer>>(`/v1/customers/${id}`, data);
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/v1/customers/${id}`);
  },
};
