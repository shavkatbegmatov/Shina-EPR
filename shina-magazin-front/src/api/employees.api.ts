import api from './axios';
import type { ApiResponse, Employee, EmployeeRequest, EmployeeStatus, PagedResponse, User } from '../types';

export interface EmployeeFilters {
  page?: number;
  size?: number;
  search?: string;
}

export const employeesApi = {
  getAll: async (filters: EmployeeFilters = {}): Promise<PagedResponse<Employee>> => {
    const params = new URLSearchParams();
    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.size !== undefined) params.append('size', filters.size.toString());
    if (filters.search) params.append('search', filters.search);

    const response = await api.get<ApiResponse<PagedResponse<Employee>>>(`/v1/employees?${params}`);
    return response.data.data;
  },

  getById: async (id: number): Promise<Employee> => {
    const response = await api.get<ApiResponse<Employee>>(`/v1/employees/${id}`);
    return response.data.data;
  },

  getByStatus: async (status: EmployeeStatus): Promise<Employee[]> => {
    const response = await api.get<ApiResponse<Employee[]>>(`/v1/employees/status/${status}`);
    return response.data.data;
  },

  getByDepartment: async (department: string): Promise<Employee[]> => {
    const response = await api.get<ApiResponse<Employee[]>>(`/v1/employees/department/${encodeURIComponent(department)}`);
    return response.data.data;
  },

  getDepartments: async (): Promise<string[]> => {
    const response = await api.get<ApiResponse<string[]>>('/v1/employees/departments');
    return response.data.data;
  },

  getAvailableUsers: async (): Promise<User[]> => {
    const response = await api.get<ApiResponse<User[]>>('/v1/employees/available-users');
    return response.data.data;
  },

  create: async (data: EmployeeRequest): Promise<Employee> => {
    const response = await api.post<ApiResponse<Employee>>('/v1/employees', data);
    return response.data.data;
  },

  update: async (id: number, data: EmployeeRequest): Promise<Employee> => {
    const response = await api.put<ApiResponse<Employee>>(`/v1/employees/${id}`, data);
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/v1/employees/${id}`);
  },
};
