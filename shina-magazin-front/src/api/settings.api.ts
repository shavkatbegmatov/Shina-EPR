import api from './axios';
import type { ApiResponse, AppSettings, SettingsUpdateRequest } from '../types';
import { createExportApi } from './export.utils';

export const settingsApi = {
  get: async (): Promise<AppSettings> => {
    const response = await api.get<ApiResponse<AppSettings>>('/v1/settings');
    return response.data.data;
  },

  /** Storefront (guest) uchun ommaviy sozlamalar — auth talab qilmaydi. */
  getPublic: async (): Promise<{ imageFallback: string }> => {
    const response = await api.get<ApiResponse<{ imageFallback: string }>>('/v1/settings/public');
    return response.data.data;
  },

  update: async (data: SettingsUpdateRequest): Promise<AppSettings> => {
    const response = await api.put<ApiResponse<AppSettings>>('/v1/settings', data);
    return response.data.data;
  },

  /**
   * Telegram sozlamasini tekshirish.
   *
   * <p>Server xabarni SINXRON yuboradi va yetib bormasa xato qaytaradi —
   * "yuborildi" degan yolg'on javob berilmaydi.
   */
  testTelegram: async (chatId?: string): Promise<void> => {
    await api.post('/v1/settings/telegram/test', null, {
      params: chatId ? { chatId } : undefined,
    });
  },

  // Export functionality
  export: createExportApi('/v1/settings'),
};
