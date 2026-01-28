import api from './axios';
import type { ApiResponse, DashboardStats, ChartData } from '../types';

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get<ApiResponse<DashboardStats>>('/v1/dashboard/stats');
    return response.data.data;
  },

  getChartData: async (days: number = 30): Promise<ChartData> => {
    const response = await api.get<ApiResponse<ChartData>>(`/v1/dashboard/charts?days=${days}`);
    return response.data.data;
  },
};
