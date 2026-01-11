import api from './axios';
import type { ApiResponse, SalesReport } from '../types';

export const reportsApi = {
  getSalesReport: async (startDate: string, endDate: string): Promise<SalesReport> => {
    const response = await api.get<ApiResponse<SalesReport>>('/v1/reports/sales', {
      params: { startDate, endDate },
    });
    return response.data.data;
  },
};
