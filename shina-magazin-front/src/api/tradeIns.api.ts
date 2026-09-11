import api from './axios';
import type { ApiResponse, PagedResponse, TradeIn, TradeInRequest, TradeInStatus } from '../types';

export interface TradeInFilters {
  page?: number;
  size?: number;
  status?: TradeInStatus;
}

/**
 * Barter — eski shinani qabul qilish va baholash.
 *
 * <p>Savdo ichida qabul qilish uchun bu yerdagi `accept` KERAK EMAS: POS
 * barterni `salesApi.create` so'roviga qo'shib yuboradi, shunda hujjat va
 * savdo bitta tranzaksiyada yaratiladi. Bu modul mijoz shinasini QOLDIRIB
 * ketgan holat uchun.
 */
export const tradeInsApi = {
  getAll: async (filters: TradeInFilters = {}): Promise<PagedResponse<TradeIn>> => {
    const params = new URLSearchParams();
    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.size !== undefined) params.append('size', filters.size.toString());
    if (filters.status) params.append('status', filters.status);

    const response = await api.get<ApiResponse<PagedResponse<TradeIn>>>(`/v1/trade-ins?${params}`);
    return response.data.data;
  },

  /** Kassada tanlash uchun: hali savdoga bog'lanmagan hujjatlar. */
  getAvailable: async (customerId?: number): Promise<TradeIn[]> => {
    const params = new URLSearchParams();
    if (customerId !== undefined) params.append('customerId', customerId.toString());

    const response = await api.get<ApiResponse<TradeIn[]>>(`/v1/trade-ins/available?${params}`);
    return response.data.data;
  },

  getById: async (id: number): Promise<TradeIn> => {
    const response = await api.get<ApiResponse<TradeIn>>(`/v1/trade-ins/${id}`);
    return response.data.data;
  },

  accept: async (data: TradeInRequest): Promise<TradeIn> => {
    const response = await api.post<ApiResponse<TradeIn>>('/v1/trade-ins', data);
    return response.data.data;
  },

  cancel: async (id: number): Promise<TradeIn> => {
    const response = await api.put<ApiResponse<TradeIn>>(`/v1/trade-ins/${id}/cancel`, {});
    return response.data.data;
  },
};
