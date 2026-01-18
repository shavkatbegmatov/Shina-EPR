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
};
