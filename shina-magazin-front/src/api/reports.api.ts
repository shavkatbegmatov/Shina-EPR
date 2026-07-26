import api from './axios';
import type {
  ApiResponse,
  SalesReport,
  WarehouseReport,
  DebtsReport,
  ProfitLossReport,
} from '../types';

export const reportsApi = {
  getSalesReport: async (startDate: string, endDate: string): Promise<SalesReport> => {
    const response = await api.get<ApiResponse<SalesReport>>('/v1/reports/sales', {
      params: { startDate, endDate },
    });
    return response.data.data;
  },

  getWarehouseReport: async (startDate: string, endDate: string): Promise<WarehouseReport> => {
    const response = await api.get<ApiResponse<WarehouseReport>>('/v1/reports/warehouse', {
      params: { startDate, endDate },
    });
    return response.data.data;
  },

  getDebtsReport: async (startDate: string, endDate: string): Promise<DebtsReport> => {
    const response = await api.get<ApiResponse<DebtsReport>>('/v1/reports/debts', {
      params: { startDate, endDate },
    });
    return response.data.data;
  },

  /** Sof foyda: tushum − tannarx − xarajatlar. `EXPENSES_VIEW` talab qiladi. */
  getProfitLossReport: async (startDate: string, endDate: string): Promise<ProfitLossReport> => {
    const response = await api.get<ApiResponse<ProfitLossReport>>('/v1/reports/profit-loss', {
      params: { startDate, endDate },
    });
    return response.data.data;
  },
};
