import { create } from 'zustand';
import toast from 'react-hot-toast';
import { notificationsApi, type StaffNotification, type StaffNotificationType } from '../api/notifications.api';
import { webSocketService, type WebSocketNotification, type PermissionUpdateMessage } from '../services/websocket';
import { useAuthStore } from './authStore';

// Frontend uchun notification type mapping
type FrontendNotificationType = 'warning' | 'success' | 'info' | 'order' | 'payment' | 'customer';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: FrontendNotificationType;
  isRead: boolean;
  createdAt: string;
  referenceType?: string | null;
  referenceId?: number | null;
}

// Backend type -> Frontend type
const mapNotificationType = (backendType: StaffNotificationType): FrontendNotificationType => {
  const mapping: Record<StaffNotificationType, FrontendNotificationType> = {
    ORDER: 'order',
    PAYMENT: 'payment',
    WARNING: 'warning',
    CUSTOMER: 'customer',
    INFO: 'info',
    SUCCESS: 'success',
    PERMISSION_UPDATE: 'info',
  };
  return mapping[backendType] || 'info';
};

// Backend notification -> Frontend notification
const mapNotification = (n: StaffNotification): Notification => ({
  id: n.id,
  title: n.title,
  message: n.message,
  type: mapNotificationType(n.type),
  isRead: n.isRead,
  createdAt: n.createdAt,
  referenceType: n.referenceType,
  referenceId: n.referenceId,
});

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  wsConnected: boolean;

  // Actions
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;

  // WebSocket
  connectWebSocket: (token: string) => void;
  disconnectWebSocket: () => void;

  // Local state updates (for optimistic UI)
  setNotifications: (notifications: Notification[]) => void;
  setUnreadCount: (count: number) => void;
  addNotification: (notification: Notification) => void;
}

// WebSocket'dan kelgan notification'ni map qilish
const mapWebSocketNotification = (n: WebSocketNotification): Notification => ({
  id: n.id,
  title: n.title,
  message: n.message,
  type: mapNotificationType(n.type as StaffNotificationType),
  isRead: n.isRead,
  createdAt: n.createdAt,
  referenceType: n.referenceType,
  referenceId: n.referenceId,
});

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  wsConnected: false,

  fetchNotifications: async () => {
    set({ loading: true, error: null });
    try {
      const response = await notificationsApi.getAll({ size: 50 });
      const notifications = response.content.map(mapNotification);
      const unreadCount = notifications.filter((n) => !n.isRead).length;
      set({ notifications, unreadCount, loading: false });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      set({ error: 'Bildirishnomalarni yuklashda xatolik', loading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const count = await notificationsApi.getUnreadCount();
      set({ unreadCount: count });
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  },

  markAsRead: async (id) => {
    // Optimistic update
    const { notifications } = get();
    const updatedNotifications = notifications.map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    );
    const unreadCount = updatedNotifications.filter((n) => !n.isRead).length;
    set({ notifications: updatedNotifications, unreadCount });

    try {
      await notificationsApi.markAsRead(id);
    } catch (error) {
      console.error('Failed to mark as read:', error);
      // Revert on error
      set({ notifications, unreadCount: notifications.filter((n) => !n.isRead).length });
    }
  },

  markAllAsRead: async () => {
    // Optimistic update
    const { notifications } = get();
    const updatedNotifications = notifications.map((n) => ({ ...n, isRead: true }));
    set({ notifications: updatedNotifications, unreadCount: 0 });

    try {
      await notificationsApi.markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      // Revert on error
      set({ notifications, unreadCount: notifications.filter((n) => !n.isRead).length });
    }
  },

  deleteNotification: async (id) => {
    // Optimistic update
    const { notifications } = get();
    const updatedNotifications = notifications.filter((n) => n.id !== id);
    const unreadCount = updatedNotifications.filter((n) => !n.isRead).length;
    set({ notifications: updatedNotifications, unreadCount });

    try {
      await notificationsApi.delete(id);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      // Revert on error
      set({ notifications, unreadCount: notifications.filter((n) => !n.isRead).length });
    }
  },

  setNotifications: (notifications) => {
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    set({ notifications, unreadCount });
  },

  setUnreadCount: (count) => set({ unreadCount: count }),

  // Yangi notification qo'shish (WebSocket orqali kelganda)
  addNotification: (notification) => {
    const { notifications } = get();
    // Dublikatni tekshirish
    if (notifications.some((n) => n.id === notification.id)) {
      return;
    }
    // Boshiga qo'shish
    set({
      notifications: [notification, ...notifications],
      unreadCount: get().unreadCount + (notification.isRead ? 0 : 1),
    });
  },

  // WebSocket ulanishini boshlash
  connectWebSocket: (token) => {
    webSocketService.connect(
      token,
      // Notification callback
      (wsNotification) => {
        const notification = mapWebSocketNotification(wsNotification);
        get().addNotification(notification);
      },
      // Permission update callback
      (permissionUpdate: PermissionUpdateMessage) => {
        // Update authStore with new permissions
        const authState = useAuthStore.getState();
        if (authState.user && authState.accessToken && authState.refreshToken) {
          // Call setAuth to properly update state and trigger persist
          authState.setAuth(
            authState.user,
            authState.accessToken,
            authState.refreshToken,
            permissionUpdate.permissions,
            permissionUpdate.roles
          );

          // Show toast notification
          toast(
            permissionUpdate.reason || 'Sizning kirish huquqlaringiz yangilandi',
            {
              duration: 5000,
              icon: '🔐',
            }
          );
        }
      },
      // Connection status callback
      (connected) => {
        set({ wsConnected: connected });
      }
    );
  },

  // WebSocket ulanishini uzish
  disconnectWebSocket: () => {
    webSocketService.disconnect();
    set({ wsConnected: false });
  },
}));
