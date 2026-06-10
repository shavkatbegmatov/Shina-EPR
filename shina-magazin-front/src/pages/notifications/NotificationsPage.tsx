import { useEffect, useState } from 'react';
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
  RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useNotificationsStore, type Notification } from '../../store/notificationsStore';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import { Button } from '@/ui';

type NotificationType = Notification['type'];

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

const formatTimeAgo = (dateString: string, t: TFunction) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return t('erp.notifications.minutesAgo', { count: diffMins });
  } else if (diffHours < 24) {
    return t('erp.notifications.hoursAgo', { count: diffHours });
  } else if (diffDays < 7) {
    return t('erp.notifications.daysAgo', { count: diffDays });
  } else {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }
};

type FilterType = 'all' | 'unread' | 'warning' | 'order' | 'payment';

export function NotificationsPage() {
  const { t } = useTranslation();
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationsStore();
  const [filter, setFilter] = useState<FilterType>('all');
  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.isRead;
    return n.type === filter;
  });

  const handleRefresh = () => {
    void fetchNotifications();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">{t('erp.notifications.title')}</h1>
          <p className="section-subtitle">
            {unreadCount > 0
              ? t('erp.notifications.unreadCount', { count: unreadCount })
              : t('erp.notifications.allRead')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={clsx("h-4 w-4", loading && "animate-spin")} />
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead()}
            >
              <CheckCheck className="h-4 w-4" />
              <span className="hidden sm:inline">{t('erp.notifications.markAllRead')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-base-content/50" />
        <div className="flex flex-wrap gap-1">
          {[
            { key: 'all', label: t('common.all') },
            { key: 'unread', label: t('erp.notifications.filterUnread') },
            { key: 'warning', label: t('erp.notifications.filterWarning') },
            { key: 'order', label: t('erp.notifications.filterOrder') },
            { key: 'payment', label: t('erp.notifications.filterPayment') },
          ].map((item) => (
            <Button
              key={item.key}
              variant={filter === item.key ? 'primary' : 'ghost'}
              size="xs"
              onClick={() => setFilter(item.key as FilterType)}
            >
              {item.label}
              {item.key === 'unread' && unreadCount > 0 && (
                <span className="badge badge-error badge-xs ml-1">{unreadCount}</span>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="surface-card overflow-hidden">
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-10 text-center text-base-content/50">
            <Bell className="h-12 w-12" />
            <div>
              <p className="text-base font-medium">{t('erp.notifications.emptyTitle')}</p>
              <p className="text-sm">
                {filter !== 'all'
                  ? t('erp.notifications.emptyFiltered')
                  : t('erp.notifications.emptyDescription')}
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
                          <span className="badge badge-primary badge-xs">{t('erp.notifications.newBadge')}</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-base-content/70 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-xs text-base-content/50">
                        {formatTimeAgo(notification.createdAt, t)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <PermissionGate permission={PermissionCode.NOTIFICATIONS_MANAGE}>
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => markAsRead(notification.id)}
                            title={t('erp.notifications.markReadTitle')}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </PermissionGate>
                      <PermissionGate permission={PermissionCode.NOTIFICATIONS_MANAGE}>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="text-error"
                          onClick={() => deleteNotification(notification.id)}
                          title={t('common.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </PermissionGate>
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
