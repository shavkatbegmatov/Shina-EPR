import api from './axios';
import type {
  ApiResponse,
  Expense,
  ExpenseCategory,
  ExpenseRequest,
  PagedResponse,
} from '../types';

/** Do'kon xarajatlari — sof foyda (P&L) hisobi uchun. */
export const expensesApi = {
  getAll: async (params: {
    startDate: string;
    endDate: string;
    category?: ExpenseCategory;
    page?: number;
    size?: number;
  }): Promise<PagedResponse<Expense>> => {
    const res = await api.get<ApiResponse<PagedResponse<Expense>>>('/v1/expenses', {
      params: {
        startDate: params.startDate,
        endDate: params.endDate,
        category: params.category,
        page: params.page ?? 0,
        size: params.size ?? 20,
      },
    });
    return res.data.data;
  },

  create: async (payload: ExpenseRequest): Promise<Expense> => {
    const res = await api.post<ApiResponse<Expense>>('/v1/expenses', payload);
    return res.data.data;
  },

  update: async (id: number, payload: ExpenseRequest): Promise<Expense> => {
    const res = await api.put<ApiResponse<Expense>>(`/v1/expenses/${id}`, payload);
    return res.data.data;
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/v1/expenses/${id}`);
  },
};
