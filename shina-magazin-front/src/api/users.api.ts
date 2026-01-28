import api from './axios';
import type { ApiResponse, PagedResponse } from '../types';

export interface UserActivity {
  id: number;
  action: string;
  entityType: string;
  entityId: number;
  description: string;
  changes: Record<string, {old: unknown; new: unknown}> | Record<string, unknown>;
  username: string | null;
  ipAddress: string;
  deviceType: string;
  browser: string;
  timestamp: string;
}

export const usersApi = {
  /**
   * Get user activity history with pagination and filters
   */
  getUserActivity: async (
    userId: number,
    page: number = 0,
    size: number = 50,
    entityType?: string,
    action?: string,
    startDate?: string,
    endDate?: string
  ): Promise<PagedResponse<UserActivity>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      sort: 'createdAt,desc',
    });

    if (entityType) params.append('entityType', entityType);
    if (action) params.append('action', action);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await api.get<ApiResponse<PagedResponse<UserActivity>>>(
      `/v1/users/${userId}/activity?${params.toString()}`
    );
    return response.data.data;
  },

  /**
   * Export user activity to Excel or PDF
   */
  exportUserActivity: async (
    userId: number,
    format: 'excel' | 'pdf',
    filters?: {
      entityType?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<void> => {
    const params = new URLSearchParams({
      format: format,
    });

    if (filters?.entityType) params.append('entityType', filters.entityType);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const response = await api.get(
      `/v1/users/${userId}/activity/export?${params.toString()}`,
      {
        responseType: 'blob',
      }
    );

    // Download file
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    const extension = format === 'excel' ? 'xlsx' : 'pdf';
    link.download = `user_activity_${userId}_${new Date().toISOString().split('T')[0]}.${extension}`;
    link.click();
    window.URL.revokeObjectURL(url);
  },
};
