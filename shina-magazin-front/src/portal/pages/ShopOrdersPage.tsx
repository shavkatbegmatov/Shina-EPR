import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { portalApiClient } from '../api/portal.api';
import { portalKeys, PORTAL_STALE_TIME } from '../api/portalQueryKeys';
import PortalHeader from '../components/layout/PortalHeader';
import { PortalError, PortalLoading } from '../components/PortalState';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatNumber as formatMoney } from '../../config/constants';
import { Button } from '@/ui';

const PAGE_SIZE = 10;

const STATUS_BADGE: Record<string, string> = {
  NEW: 'badge-info', CONFIRMED: 'badge-success', COMPLETED: 'badge-success', CANCELLED: 'badge-error',
};
const PAY_CLASS: Record<string, string> = {
  PAID: 'text-success', PENDING: 'text-warning', PROCESSING: 'text-warning',
  FAILED: 'text-error', CANCELLED: 'text-error', REFUNDED: 'text-base-content/60',
};

/**
 * Portal hub: storefront do'kon buyurtmalari (Faza 6 `/v1/account/orders`).
 * PurchasesPage (ERP Sale) bilan bir uslub — bitta mijoz kabinetida B2B + B2C.
 */
export default function PortalShopOrdersPage() {
  const { t } = useTranslation();

  const query = useInfiniteQuery({
    queryKey: portalKeys.shopOrders(),
    queryFn: ({ pageParam }) => portalApiClient.getShopOrders(pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
    staleTime: PORTAL_STALE_TIME,
  });

  const orders = query.data?.pages.flatMap((page) => page.content) ?? [];

  return (
    <div className="flex flex-col">
      <PortalHeader title={t('dashboard.shopOrders')} />
      {query.isPending ? (
        <PortalLoading />
      ) : query.isError ? (
        <PortalError message={getApiErrorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : (
        <div className="p-4">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
              <p className="text-base-content/60">{t('shop.orders.empty')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <Link
                  key={o.orderNo}
                  to={`/buyurtma/${o.orderNo}`}
                  className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="card-body p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono font-semibold">{o.orderNo}</p>
                        <p className="text-sm text-base-content/60">
                          {format(new Date(o.createdAt), 'dd.MM.yyyy HH:mm')}
                        </p>
                      </div>
                      <span className={`badge badge-sm ${STATUS_BADGE[o.status] ?? 'badge-ghost'}`}>
                        {t('shop.orders.status.' + o.status, { defaultValue: o.status })}
                      </span>
                    </div>
                    <div className="divider my-2"></div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-base-content/60">
                          {t('shop.orders.itemsCount', { count: o.items.reduce((s, i) => s + i.quantity, 0) })}
                        </p>
                        <p className="font-bold">{formatMoney(o.totalAmount)} {t('common.sum')}</p>
                      </div>
                      <p className={`text-sm font-medium ${PAY_CLASS[o.paymentStatus] ?? ''}`}>
                        {t('shop.order.payStatus.' + o.paymentStatus, { defaultValue: o.paymentStatus })}
                      </p>
                      <ChevronRight className="text-base-content/40" />
                    </div>
                  </div>
                </Link>
              ))}
              {query.hasNextPage && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => void query.fetchNextPage()}
                  disabled={query.isFetchingNextPage}
                >
                  {query.isFetchingNextPage ? <span className="loading loading-spinner loading-sm"></span> : t('dashboard.viewAll')}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
