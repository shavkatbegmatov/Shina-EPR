import api from './axios';
import type { ApiResponse, CashShift, PagedResponse, ZReport } from '../types';

/** Kassa smenasi — ochish, yopish (Z-hisobot bilan) va tarix. */
export const shiftsApi = {
  /** Joriy foydalanuvchining ochiq smenasi (bo'lmasa null). */
  getCurrent: async (): Promise<CashShift | null> => {
    const res = await api.get<ApiResponse<CashShift | null>>('/v1/shifts/current');
    return res.data.data;
  },

  open: async (openingFloat: number): Promise<CashShift> => {
    const res = await api.post<ApiResponse<CashShift>>('/v1/shifts/open', { openingFloat });
    return res.data.data;
  },

  /** Yopish Z-hisobotni qaytaradi — chop etish uchun. */
  close: async (countedCash: number, notes?: string): Promise<ZReport> => {
    const res = await api.post<ApiResponse<ZReport>>('/v1/shifts/close', { countedCash, notes });
    return res.data.data;
  },

  getReport: async (shiftId: number): Promise<ZReport> => {
    const res = await api.get<ApiResponse<ZReport>>(`/v1/shifts/${shiftId}/report`);
    return res.data.data;
  },

  getAll: async (page = 0, size = 20): Promise<PagedResponse<CashShift>> => {
    const res = await api.get<ApiResponse<PagedResponse<CashShift>>>(
      `/v1/shifts?page=${page}&size=${size}`
    );
    return res.data.data;
  },
};
