import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router-dom';
import { Bell, AlertTriangle, CheckCircle, Gift, Info, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { portalApiClient } from '../api/portal.api';
import PortalHeader from '../components/layout/PortalHeader';
import type { PortalNotification, NotificationType, PagedResponse } from '../types/portal.types';
import { formatDistanceToNow } from 'date-fns';
import { uz, ru } from 'date-fns/locale';
import { usePortalAuthStore } from '../store/portalAuthStore';

interface OutletContextType {
  setUnreadCount: (count: number) => void;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'DEBT_REMINDER':
      return <AlertTriangle className="text-warning" size={20} />;
    case 'PAYMENT_RECEIVED':
      return <CheckCircle className="text-success" size={20} />;
    case 'PROMOTION':
      return <Gift className="text-primary" size={20} />;
    case 'SYSTEM':
    default:
      return <Info className="text-info" size={20} />;
  }
};

export default function PortalNotificationsPage() {
  const { t } = useTranslation();
  const { language } = usePortalAuthStore();
  const { setUnreadCount } = useOutletContext<OutletContextType>();
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  useEffect(() => {
    fetchNotifications(0);
  }, []);

  const fetchNotifications = async (pageNum: number) => {
    try {
      if (pageNum === 0) setLoading(true);
      else setLoadingMore(true);

      const data: PagedResponse<PortalNotification> = await portalApiClient.getNotifications(pageNum, 20);

      if (pageNum === 0) {
        setNotifications(data.content);
      } else {
        setNotifications((prev) => [...prev, ...data.content]);
      }

      setHasMore(!data.last);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchNotifications(page + 1);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await portalApiClient.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      const newUnreadCount = notifications.filter((n) => !n.isRead && n.id !== id).length;
      setUnreadCount(newUnreadCount);
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    try {
      const count = await portalApiClient.markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
      toast.success(`${count} ${t('notifications.markAllRead')}`);
    } catch (error) {
      console.error('Failed to mark all as read', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const locale = language === 'ru' ? ru : uz;

  if (loading) {
    return (
      <div className="flex flex-col">
        <PortalHeader title={t('notifications.title')} />
        <div className="flex items-center justify-center h-64">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PortalHeader title={t('notifications.title')} />

      <div className="p-4 space-y-4">
        {/* Mark all read button */}
        {unreadCount > 0 && (
          <button
            className="btn btn-ghost btn-sm w-full"
            onClick={handleMarkAllRead}
            disabled={markingAllRead}
          >
            {markingAllRead ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <>
                <CheckCheck size={16} />
                {t('notifications.markAllRead')} ({unreadCount})
              </>
            )}
          </button>
        )}

        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
            <p className="text-base-content/60">{t('notifications.noNotifications')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`card bg-base-100 shadow-sm cursor-pointer transition-all ${
                  !notification.isRead ? 'border-l-4 border-primary' : 'opacity-75'
                }`}
                onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
              >
                <div className="card-body p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.notificationType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm">{notification.title}</h4>
                        {!notification.isRead && (
                          <span className="badge badge-primary badge-xs">{t('notifications.unread')}</span>
                        )}
                      </div>
                      <p className="text-sm text-base-content/70 mt-1">{notification.message}</p>
                      <p className="text-xs text-base-content/50 mt-2">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {hasMore && (
              <button
                className="btn btn-ghost w-full"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  t('dashboard.viewAll')
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
