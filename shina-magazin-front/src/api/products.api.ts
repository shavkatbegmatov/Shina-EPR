import api from './axios';
import type { ApiResponse, Brand, Category, PagedResponse, Product, ProductRequest, Season } from '../types';
import { createExportApi } from './export.utils';

export interface ProductFilters {
  page?: number;
  size?: number;
  search?: string;
  brandId?: number;
  categoryId?: number;
  season?: Season;
}

export const productsApi = {
  getAll: async (filters: ProductFilters = {}): Promise<PagedResponse<Product>> => {
    const params = new URLSearchParams();
    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.size !== undefined) params.append('size', filters.size.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.brandId) params.append('brandId', filters.brandId.toString());
    if (filters.categoryId) params.append('categoryId', filters.categoryId.toString());
    if (filters.season) params.append('season', filters.season);

    const response = await api.get<ApiResponse<PagedResponse<Product>>>(`/v1/products?${params}`);
    return response.data.data;
  },

  getById: async (id: number): Promise<Product> => {
    const response = await api.get<ApiResponse<Product>>(`/v1/products/${id}`);
    return response.data.data;
  },

  getLowStock: async (): Promise<Product[]> => {
    const response = await api.get<ApiResponse<Product[]>>('/v1/products/low-stock');
    return response.data.data;
  },

  create: async (data: ProductRequest): Promise<Product> => {
    const response = await api.post<ApiResponse<Product>>('/v1/products', data);
    return response.data.data;
  },

  update: async (id: number, data: ProductRequest): Promise<Product> => {
    const response = await api.put<ApiResponse<Product>>(`/v1/products/${id}`, data);
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/v1/products/${id}`);
  },

  adjustStock: async (id: number, adjustment: number): Promise<Product> => {
    const response = await api.patch<ApiResponse<Product>>(
      `/v1/products/${id}/stock`,
      null,
      { params: { adjustment } }
    );
    return response.data.data;
  },

  // Export functionality
  export: createExportApi('/v1/products'),
};

export const brandsApi = {
  getAll: async (): Promise<Brand[]> => {
    const response = await api.get<ApiResponse<Brand[]>>('/v1/brands');
    return response.data.data;
  },

  create: async (name: string, country?: string): Promise<Brand> => {
    const params = new URLSearchParams({ name });
    if (country) params.append('country', country);
    const response = await api.post<ApiResponse<Brand>>(`/v1/brands?${params}`);
    return response.data.data;
  },

  update: async (id: number, name: string, country?: string): Promise<Brand> => {
    const params = new URLSearchParams({ name });
    if (country) params.append('country', country);
    const response = await api.put<ApiResponse<Brand>>(`/v1/brands/${id}?${params}`);
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/v1/brands/${id}`);
  },

  // Export functionality
  export: createExportApi('/v1/brands'),
};

export const categoriesApi = {
  getAll: async (): Promise<Category[]> => {
    const response = await api.get<ApiResponse<Category[]>>('/v1/categories');
    return response.data.data;
  },

  getTree: async (): Promise<Category[]> => {
    const response = await api.get<ApiResponse<Category[]>>('/v1/categories/tree');
    return response.data.data;
  },

  create: async (name: string, description?: string, parentId?: number): Promise<Category> => {
    const params = new URLSearchParams({ name });
    if (description) params.append('description', description);
    if (parentId) params.append('parentId', parentId.toString());
    const response = await api.post<ApiResponse<Category>>(`/v1/categories?${params}`);
    return response.data.data;
  },

  update: async (id: number, name: string, description?: string, parentId?: number): Promise<Category> => {
    const params = new URLSearchParams({ name });
    if (description) params.append('description', description);
    if (parentId) params.append('parentId', parentId.toString());
    const response = await api.put<ApiResponse<Category>>(`/v1/categories/${id}?${params}`);
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/v1/categories/${id}`);
  },

  // Export functionality
  export: createExportApi('/v1/categories'),
};
