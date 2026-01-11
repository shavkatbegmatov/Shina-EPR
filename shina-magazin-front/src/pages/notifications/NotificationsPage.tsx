import { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Info,
  Package,
  CreditCard,
  Users,
  CheckCheck,
  Trash2,
  Filter,
} from 'lucide-react';
import clsx from 'clsx';

type NotificationType = 'warning' | 'success' | 'info' | 'order' | 'payment' | 'customer';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

// Mock data - keyinchalik API dan olinadi
const mockNotifications: Notification[] = [
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

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-warning" />;
    case 'success':
      return <CheckCircle className="h-5 w-5 text-success" />;
    case 'order':
      return <Package className="h-5 w-5 text-primary" />;
    case 'payment':
      return <CreditCard className="h-5 w-5 text-success" />;
    case 'customer':
      return <Users className="h-5 w-5 text-info" />;
    case 'info':
    default:
      return <Info className="h-5 w-5 text-info" />;
  }
};

const getNotificationBorderColor = (type: NotificationType) => {
  switch (type) {
    case 'warning':
      return 'border-l-warning';
    case 'success':
    case 'payment':
      return 'border-l-success';
    case 'order':
      return 'border-l-primary';
    case 'customer':
    case 'info':
    default:
      return 'border-l-info';
  }
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins} daqiqa oldin`;
  } else if (diffHours < 24) {
    return `${diffHours} soat oldin`;
  } else if (diffDays < 7) {
    return `${diffDays} kun oldin`;
  } else {
    return date.toLocaleDateString('uz-UZ');
  }
};

type FilterType = 'all' | 'unread' | 'warning' | 'order' | 'payment';

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [filter, setFilter] = useState<FilterType>('all');

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.isRead;
    return n.type === filter;
  });

  const handleMarkAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleDelete = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">Bildirishnomalar</h1>
          <p className="section-subtitle">
            {unreadCount > 0
              ? `${unreadCount} ta o'qilmagan xabar`
              : "Barcha xabarlar o'qilgan"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Barchasini o'qilgan qilish</span>
            </button>
          )}
          {notifications.length > 0 && (
            <button
              className="btn btn-ghost btn-sm text-error"
              onClick={handleClearAll}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Tozalash</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-base-content/50" />
        <div className="flex flex-wrap gap-1">
          {[
            { key: 'all', label: 'Barchasi' },
            { key: 'unread', label: "O'qilmagan" },
            { key: 'warning', label: 'Ogohlantirishlar' },
            { key: 'order', label: 'Buyurtmalar' },
            { key: 'payment', label: "To'lovlar" },
          ].map((item) => (
            <button
              key={item.key}
              className={clsx(
                'btn btn-xs',
                filter === item.key ? 'btn-primary' : 'btn-ghost'
              )}
              onClick={() => setFilter(item.key as FilterType)}
            >
              {item.label}
              {item.key === 'unread' && unreadCount > 0 && (
                <span className="badge badge-error badge-xs ml-1">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="surface-card overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-10 text-center text-base-content/50">
            <Bell className="h-12 w-12" />
            <div>
              <p className="text-base font-medium">Bildirishnomalar yo'q</p>
              <p className="text-sm">
                {filter !== 'all'
                  ? "Bu toifada hech narsa yo'q"
                  : "Yangi bildirishnomalar bu yerda ko'rinadi"}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-base-200">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={clsx(
                  'flex items-start gap-4 p-4 transition-colors hover:bg-base-200/50',
                  'border-l-4',
                  getNotificationBorderColor(notification.type),
                  !notification.isRead && 'bg-primary/5'
                )}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-base-200">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3
                          className={clsx(
                            'text-sm',
                            !notification.isRead ? 'font-semibold' : 'font-medium'
                          )}
                        >
                          {notification.title}
                        </h3>
                        {!notification.isRead && (
                          <span className="badge badge-primary badge-xs">Yangi</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-base-content/70 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-xs text-base-content/50">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.isRead && (
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleMarkAsRead(notification.id)}
                          title="O'qilgan qilish"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => handleDelete(notification.id)}
                        title="O'chirish"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
