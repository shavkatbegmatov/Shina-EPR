import api from './axios';
import type { ApiResponse, AppSettings, SettingsUpdateRequest } from '../types';
import { createExportApi } from './export.utils';

export const settingsApi = {
  get: async (): Promise<AppSettings> => {
    const response = await api.get<ApiResponse<AppSettings>>('/v1/settings');
    return response.data.data;
  },

  update: async (data: SettingsUpdateRequest): Promise<AppSettings> => {
    const response = await api.put<ApiResponse<AppSettings>>('/v1/settings', data);
    return response.data.data;
  },

  // Export functionality
  export: createExportApi('/v1/settings'),
};
