import api from './axios';
import type { ApiResponse, PagedResponse, Permission, Role, RoleRequest } from '../types';

export interface RoleFilters {
  page?: number;
  size?: number;
  search?: string;
}

export const rolesApi = {
  // Roles API
  getAll: async (): Promise<Role[]> => {
    const response = await api.get<ApiResponse<Role[]>>('/v1/roles');
    return response.data.data;
  },

  search: async (filters: RoleFilters = {}): Promise<PagedResponse<Role>> => {
    const params = new URLSearchParams();
    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.size !== undefined) params.append('size', filters.size.toString());
    if (filters.search) params.append('search', filters.search);

    const response = await api.get<ApiResponse<PagedResponse<Role>>>(`/v1/roles/search?${params}`);
    return response.data.data;
  },

  getById: async (id: number): Promise<Role> => {
    const response = await api.get<ApiResponse<Role>>(`/v1/roles/${id}`);
    return response.data.data;
  },

  getByCode: async (code: string): Promise<Role> => {
    const response = await api.get<ApiResponse<Role>>(`/v1/roles/code/${code}`);
    return response.data.data;
  },

  create: async (data: RoleRequest): Promise<Role> => {
    const response = await api.post<ApiResponse<Role>>('/v1/roles', data);
    return response.data.data;
  },

  update: async (id: number, data: RoleRequest): Promise<Role> => {
    const response = await api.put<ApiResponse<Role>>(`/v1/roles/${id}`, data);
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/v1/roles/${id}`);
  },

  assignToUser: async (roleId: number, userId: number): Promise<void> => {
    await api.post(`/v1/roles/${roleId}/users/${userId}`);
  },

  removeFromUser: async (roleId: number, userId: number): Promise<void> => {
    await api.delete(`/v1/roles/${roleId}/users/${userId}`);
  },

  getUserRoles: async (userId: number): Promise<Role[]> => {
    const response = await api.get<ApiResponse<Role[]>>(`/v1/roles/users/${userId}`);
    return response.data.data;
  },
};

export const permissionsApi = {
  getAll: async (): Promise<Permission[]> => {
    const response = await api.get<ApiResponse<Permission[]>>('/v1/permissions');
    return response.data.data;
  },

  getAllGrouped: async (): Promise<Record<string, Permission[]>> => {
    const response = await api.get<ApiResponse<Record<string, Permission[]>>>('/v1/permissions/grouped');
    return response.data.data;
  },

  getModules: async (): Promise<string[]> => {
    const response = await api.get<ApiResponse<string[]>>('/v1/permissions/modules');
    return response.data.data;
  },
};
