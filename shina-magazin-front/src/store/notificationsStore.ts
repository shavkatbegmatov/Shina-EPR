import { create } from 'zustand';

type NotificationType = 'warning' | 'success' | 'info' | 'order' | 'payment' | 'customer';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

// Mock data - keyinchalik API dan olinadi
const initialNotifications: Notification[] = [
  {
    id: 1,
    title: 'Yangi buyurtma',
    message: '#INV-2024-001 buyurtmasi yaratildi. Mijoz: Alisher Karimov',
    type: 'order',
    isRead: false,
    createdAt: '2024-01-15T10:30:00',
  },
  {
    id: 2,
    title: 'Kam zaxira ogohlantirishi',
    message: "Michelin Pilot Sport 4 (225/45 R17) - Zaxirada faqat 3 ta qoldi",
    type: 'warning',
    isRead: false,
    createdAt: '2024-01-15T09:15:00',
  },
  {
    id: 3,
    title: "To'lov qabul qilindi",
    message: "Mijoz Bobur Toshmatov 1,500,000 so'm to'ladi. Qarz to'liq yopildi.",
    type: 'payment',
    isRead: false,
    createdAt: '2024-01-15T08:45:00',
  },
  {
    id: 4,
    title: 'Yangi mijoz',
    message: "Sardor Aliyev ro'yxatdan o'tdi. Telefon: +998 90 123 45 67",
    type: 'customer',
    isRead: true,
    createdAt: '2024-01-14T16:20:00',
  },
  {
    id: 5,
    title: 'Mahsulot qo\'shildi',
    message: "Continental PremiumContact 6 (205/55 R16) omborga qo'shildi. Soni: 20 ta",
    type: 'info',
    isRead: true,
    createdAt: '2024-01-14T14:00:00',
  },
  {
    id: 6,
    title: 'Sotuw muvaffaqiyatli',
    message: '#INV-2024-098 buyurtmasi yakunlandi. Jami: 2,400,000 so\'m',
    type: 'success',
    isRead: true,
    createdAt: '2024-01-14T11:30:00',
  },
  {
    id: 7,
    title: 'Qarz eslatmasi',
    message: "Jasur Rahimov ning qarzi 500,000 so'm. Muddat: 3 kun qoldi",
    type: 'warning',
    isRead: true,
    createdAt: '2024-01-13T09:00:00',
  },
  {
    id: 8,
    title: "Ta'minotchi yetkazib berdi",
    message: "Tashkent Shina LLC dan 50 ta mahsulot qabul qilindi",
    type: 'info',
    isRead: true,
    createdAt: '2024-01-12T15:45:00',
  },
];

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: number) => void;
  clearAll: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: initialNotifications,
  unreadCount: initialNotifications.filter((n) => !n.isRead).length,

  markAsRead: (id) =>
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      );
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.isRead).length,
      };
    }),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),

  deleteNotification: (id) =>
    set((state) => {
      const notifications = state.notifications.filter((n) => n.id !== id);
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.isRead).length,
      };
    }),

  clearAll: () =>
    set({
      notifications: [],
      unreadCount: 0,
    }),

  addNotification: (notification) =>
    set((state) => {
      const newNotification: Notification = {
        ...notification,
        id: Date.now(),
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      return {
        notifications: [newNotification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    }),
}));
