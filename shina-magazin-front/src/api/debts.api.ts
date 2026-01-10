import api from './axios';
import type { ApiResponse, Debt, DebtPaymentRequest, DebtStatus, PagedResponse, Payment } from '../types';

export interface DebtFilters {
  page?: number;
  size?: number;
  status?: DebtStatus;
}

export const debtsApi = {
  getAll: async (filters: DebtFilters = {}): Promise<PagedResponse<Debt>> => {
    const params = new URLSearchParams();
    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.size !== undefined) params.append('size', filters.size.toString());
    if (filters.status) params.append('status', filters.status);

    const response = await api.get<ApiResponse<PagedResponse<Debt>>>(`/v1/debts?${params}`);
    return response.data.data;
  },

  getActive: async (): Promise<Debt[]> => {
    const response = await api.get<ApiResponse<Debt[]>>('/v1/debts/active');
    return response.data.data;
  },

  getOverdue: async (): Promise<Debt[]> => {
    const response = await api.get<ApiResponse<Debt[]>>('/v1/debts/overdue');
    return response.data.data;
  },

  getById: async (id: number): Promise<Debt> => {
    const response = await api.get<ApiResponse<Debt>>(`/v1/debts/${id}`);
    return response.data.data;
  },

  getCustomerDebts: async (customerId: number): Promise<Debt[]> => {
    const response = await api.get<ApiResponse<Debt[]>>(`/v1/debts/customer/${customerId}`);
    return response.data.data;
  },

  getDebtPayments: async (debtId: number): Promise<Payment[]> => {
    const response = await api.get<ApiResponse<Payment[]>>(`/v1/debts/${debtId}/payments`);
    return response.data.data;
  },

  getCustomerPayments: async (customerId: number, page = 0, size = 20): Promise<PagedResponse<Payment>> => {
    const params = new URLSearchParams({ page: page.toString(), size: size.toString() });
    const response = await api.get<ApiResponse<PagedResponse<Payment>>>(
      `/v1/debts/customer/${customerId}/payments?${params}`
    );
    return response.data.data;
  },

  makePayment: async (debtId: number, data: DebtPaymentRequest): Promise<Debt> => {
    const response = await api.post<ApiResponse<Debt>>(`/v1/debts/${debtId}/pay`, data);
    return response.data.data;
  },

  makeFullPayment: async (debtId: number, data: Omit<DebtPaymentRequest, 'amount'>): Promise<Debt> => {
    const response = await api.post<ApiResponse<Debt>>(`/v1/debts/${debtId}/pay-full`, data);
    return response.data.data;
  },

  getTotalActiveDebt: async (): Promise<number> => {
    const response = await api.get<ApiResponse<number>>('/v1/debts/total');
    return response.data.data;
  },

  getCustomerTotalDebt: async (customerId: number): Promise<number> => {
    const response = await api.get<ApiResponse<number>>(`/v1/debts/customer/${customerId}/total`);
    return response.data.data;
  },
};
