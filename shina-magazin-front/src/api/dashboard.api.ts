import api from './axios';
import type { ApiResponse, DashboardStats } from '../types';

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get<ApiResponse<DashboardStats>>('/v1/dashboard/stats');
    return response.data.data;
  },
};
