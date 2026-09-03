import { useTranslation } from 'react-i18next';
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { Bell, AlertTriangle, CheckCircle, Gift, Info, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { uz, ru } from 'date-fns/locale';
import { portalApiClient } from '../api/portal.api';
import { portalKeys, PORTAL_STALE_TIME } from '../api/portalQueryKeys';
import PortalHeader from '../components/layout/PortalHeader';
import { PortalError, PortalLoading } from '../components/PortalState';
import { getApiErrorMessage } from '../../utils/apiError';
import type { PortalNotification, NotificationType, PagedResponse } from '../types/portal.types';
import { usePortalAuthStore } from '../store/portalAuthStore';
import { Button } from '@/ui';

const PAGE_SIZE = 20;

type NotificationPages = InfiniteData<PagedResponse<PortalNotification>, number>;

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

/** Keshdagi sahifalarni "o'qilgan" holatga o'tkazadi (optimistik yangilash). */
function markInCache(data: NotificationPages | undefined, ids: 'all' | number): NotificationPages | undefined {
  if (!data) return data;
  const readAt = new Date().toISOString();
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      content: page.content.map((n) =>
        ids === 'all' || n.id === ids ? { ...n, isRead: true, readAt } : n
      ),
    })),
  };
}

export default function PortalNotificationsPage() {
  const { t } = useTranslation();
  const { language } = usePortalAuthStore();
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: portalKeys.notifications(),
    queryFn: ({ pageParam }) => portalApiClient.getNotifications(pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
    staleTime: PORTAL_STALE_TIME,
  });

  const invalidateUnread = () =>
    queryClient.invalidateQueries({ queryKey: portalKeys.unreadCount() });

  const markOne = useMutation({
    mutationFn: (id: number) => portalApiClient.markNotificationAsRead(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<NotificationPages>(portalKeys.notifications(), (old) => markInCache(old, id));
      void invalidateUnread();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const markAll = useMutation({
    mutationFn: () => portalApiClient.markAllNotificationsAsRead(),
    onSuccess: (count) => {
      queryClient.setQueryData<NotificationPages>(portalKeys.notifications(), (old) => markInCache(old, 'all'));
      void invalidateUnread();
      toast.success(`${count} ${t('notifications.markAllRead')}`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const notifications = query.data?.pages.flatMap((page) => page.content) ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const locale = language === 'ru' ? ru : uz;

  return (
    <div className="flex flex-col">
      <PortalHeader title={t('notifications.title')} />

      {query.isPending ? (
        <PortalLoading />
      ) : query.isError ? (
        <PortalError message={getApiErrorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : (
        <div className="p-4 space-y-4">
          {/* Mark all read button */}
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => markAll.mutate()}
              loading={markAll.isPending}
            >
              <CheckCheck size={16} />
              {t('notifications.markAllRead')} ({unreadCount})
            </Button>
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
                  className={`card bg-base-100 shadow-sm transition-all ${
                    !notification.isRead ? 'border-l-4 border-primary cursor-pointer' : 'opacity-75'
                  }`}
                  role={!notification.isRead ? 'button' : undefined}
                  tabIndex={!notification.isRead ? 0 : undefined}
                  onClick={() => !notification.isRead && markOne.mutate(notification.id)}
                  onKeyDown={(event) => {
                    if (!notification.isRead && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      markOne.mutate(notification.id);
                    }
                  }}
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

              {query.hasNextPage && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => void query.fetchNextPage()}
                  loading={query.isFetchingNextPage}
                >
                  {t('dashboard.viewAll')}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
