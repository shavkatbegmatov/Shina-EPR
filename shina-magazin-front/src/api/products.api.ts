import api from './axios';
import type {
  ApiResponse,
  Attribute,
  AttributeRequest,
  Brand,
  Category,
  CategoryAttribute,
  CategoryAttributeBinding,
  CategoryRequest,
  PagedResponse,
  Product,
  ProductRequest,
  Season,
} from '../types';
import { createExportApi } from './export.utils';

export interface ProductFilters {
  page?: number;
  size?: number;
  sort?: string[];
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
    filters.sort?.forEach((sort) => params.append('sort', sort));
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

  // Rasm yuklash (multipart) -> ommaviy URL qaytaradi (imageUrl uchun)
  uploadImage: async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    const response = await api.post<ApiResponse<{ url: string }>>('/v1/products/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data.url;
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

  create: async (data: CategoryRequest): Promise<Category> => {
    const response = await api.post<ApiResponse<Category>>('/v1/categories', data);
    return response.data.data;
  },

  update: async (id: number, data: CategoryRequest): Promise<Category> => {
    const response = await api.put<ApiResponse<Category>>(`/v1/categories/${id}`, data);
    return response.data.data;
  },

  move: async (id: number, direction: 'up' | 'down'): Promise<Category[]> => {
    const response = await api.patch<ApiResponse<Category[]>>(
      `/v1/categories/${id}/move`,
      null,
      { params: { direction } }
    );
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/v1/categories/${id}`);
  },

  // Kategoriyaning effektiv atributlari (ota kategoriyalardan meros bilan)
  getAttributes: async (id: number): Promise<CategoryAttribute[]> => {
    const response = await api.get<ApiResponse<CategoryAttribute[]>>(`/v1/categories/${id}/attributes`);
    return response.data.data;
  },

  // Kategoriyaning o'z atribut bog'lanishlarini to'liq almashtirish
  updateAttributes: async (id: number, bindings: CategoryAttributeBinding[]): Promise<CategoryAttribute[]> => {
    const response = await api.put<ApiResponse<CategoryAttribute[]>>(`/v1/categories/${id}/attributes`, bindings);
    return response.data.data;
  },

  // Export functionality
  export: createExportApi('/v1/categories'),
};

export const attributesApi = {
  getAll: async (): Promise<Attribute[]> => {
    const response = await api.get<ApiResponse<Attribute[]>>('/v1/attributes');
    return response.data.data;
  },

  getById: async (id: number): Promise<Attribute> => {
    const response = await api.get<ApiResponse<Attribute>>(`/v1/attributes/${id}`);
    return response.data.data;
  },

  create: async (data: AttributeRequest): Promise<Attribute> => {
    const response = await api.post<ApiResponse<Attribute>>('/v1/attributes', data);
    return response.data.data;
  },

  update: async (id: number, data: AttributeRequest): Promise<Attribute> => {
    const response = await api.put<ApiResponse<Attribute>>(`/v1/attributes/${id}`, data);
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/v1/attributes/${id}`);
  },
};
