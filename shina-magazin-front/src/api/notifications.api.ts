import api from './axios';
import type { ApiResponse, PagedResponse } from '../types';

export type StaffNotificationType = 'ORDER' | 'PAYMENT' | 'WARNING' | 'CUSTOMER' | 'INFO' | 'SUCCESS';

export interface StaffNotification {
  id: number;
  title: string;
  message: string;
  type: StaffNotificationType;
  isRead: boolean;
  readAt: string | null;
  referenceType: string | null;
  referenceId: number | null;
  createdAt: string;
}

export interface NotificationFilters {
  page?: number;
  size?: number;
  type?: StaffNotificationType;
}

export const notificationsApi = {
  /**
   * Bildirishnomalar ro'yxatini olish
   */
  getAll: async (filters: NotificationFilters = {}): Promise<PagedResponse<StaffNotification>> => {
    const params = new URLSearchParams();
    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.size !== undefined) params.append('size', filters.size.toString());
    if (filters.type) params.append('type', filters.type);

    const response = await api.get<ApiResponse<PagedResponse<StaffNotification>>>(
      `/v1/notifications?${params}`
    );
    return response.data.data;
  },

  /**
   * O'qilmagan bildirishnomalar (dropdown uchun)
   */
  getUnread: async (): Promise<StaffNotification[]> => {
    const response = await api.get<ApiResponse<StaffNotification[]>>('/v1/notifications/unread');
    return response.data.data;
  },

  /**
   * O'qilmagan bildirishnomalar soni
   */
  getUnreadCount: async (): Promise<number> => {
    const response = await api.get<ApiResponse<number>>('/v1/notifications/unread-count');
    return response.data.data;
  },

  /**
   * Bildirishnomani o'qilgan qilish
   */
  markAsRead: async (id: number): Promise<void> => {
    await api.post<ApiResponse<void>>(`/v1/notifications/${id}/read`);
  },

  /**
   * Barchasini o'qilgan qilish
   */
  markAllAsRead: async (): Promise<number> => {
    const response = await api.post<ApiResponse<number>>('/v1/notifications/mark-all-read');
    return response.data.data;
  },

  /**
   * Bildirishnomani o'chirish
   */
  delete: async (id: number): Promise<void> => {
    await api.delete<ApiResponse<void>>(`/v1/notifications/${id}`);
  },
};
