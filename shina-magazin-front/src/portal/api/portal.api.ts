import portalApi from './portalAxios';
import type {
  ApiResponse,
  CustomerDashboardStats,
  CustomerPortalProfile,
  PagedResponse,
  PortalDebt,
  PortalNotification,
  PortalSale,
} from '../types/portal.types';

export const portalApiClient = {
  // Profile
  getProfile: async (): Promise<CustomerPortalProfile> => {
    const response = await portalApi.get<ApiResponse<CustomerPortalProfile>>('/v1/portal/profile');
    return response.data.data;
  },

  updateLanguage: async (lang: string): Promise<CustomerPortalProfile> => {
    const response = await portalApi.put<ApiResponse<CustomerPortalProfile>>(
      '/v1/portal/profile/language',
      null,
      { params: { lang } }
    );
    return response.data.data;
  },

  // Dashboard
  getDashboard: async (): Promise<CustomerDashboardStats> => {
    const response = await portalApi.get<ApiResponse<CustomerDashboardStats>>('/v1/portal/dashboard');
    return response.data.data;
  },

  // Purchases
  getPurchases: async (page = 0, size = 10): Promise<PagedResponse<PortalSale>> => {
    const response = await portalApi.get<ApiResponse<PagedResponse<PortalSale>>>(
      '/v1/portal/purchases',
      { params: { page, size } }
    );
    return response.data.data;
  },

  getPurchaseDetails: async (id: number): Promise<PortalSale> => {
    const response = await portalApi.get<ApiResponse<PortalSale>>(`/v1/portal/purchases/${id}`);
    return response.data.data;
  },

  // Debts
  getDebts: async (): Promise<PortalDebt[]> => {
    const response = await portalApi.get<ApiResponse<PortalDebt[]>>('/v1/portal/debts');
    return response.data.data;
  },

  getTotalDebt: async (): Promise<number> => {
    const response = await portalApi.get<ApiResponse<{ totalDebt: number }>>('/v1/portal/debts/total');
    return response.data.data.totalDebt;
  },

  // Notifications
  getNotifications: async (page = 0, size = 20): Promise<PagedResponse<PortalNotification>> => {
    const response = await portalApi.get<ApiResponse<PagedResponse<PortalNotification>>>(
      '/v1/portal/notifications',
      { params: { page, size } }
    );
    return response.data.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await portalApi.get<ApiResponse<{ unreadCount: number }>>(
      '/v1/portal/notifications/unread-count'
    );
    return response.data.data.unreadCount;
  },

  markNotificationAsRead: async (id: number): Promise<void> => {
    await portalApi.post(`/v1/portal/notifications/${id}/read`);
  },

  markAllNotificationsAsRead: async (): Promise<number> => {
    const response = await portalApi.post<ApiResponse<{ markedCount: number }>>(
      '/v1/portal/notifications/mark-all-read'
    );
    return response.data.data.markedCount;
  },
};
