import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useOutletContext } from 'react-router-dom';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { portalApiClient } from '../api/portal.api';
import PortalHeader from '../components/layout/PortalHeader';
import type { AccountOrder } from '../../shop/data/accountApi';
import type { PagedResponse } from '../types/portal.types';
import { format } from 'date-fns';
import { formatNumber as formatMoney } from '../../config/constants';
import { Button } from '@/ui';

interface OutletContextType {
  newNotificationTrigger: number;
}

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
  const { newNotificationTrigger } = useOutletContext<OutletContextType>();
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchOrders = useCallback(async (pageNum: number, showLoading = true) => {
    try {
      if (showLoading) {
        if (pageNum === 0) setLoading(true);
        else setLoadingMore(true);
      }
      const data: PagedResponse<AccountOrder> = await portalApiClient.getShopOrders(pageNum, 10);
      setOrders((prev) => (pageNum === 0 ? data.content : [...prev, ...data.content]));
      setHasMore(!data.last);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch shop orders', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchOrders(0); }, [fetchOrders]);
  useEffect(() => {
    if (newNotificationTrigger > 0) fetchOrders(0, false);
  }, [newNotificationTrigger, fetchOrders]);

  const loadMore = () => {
    if (!loadingMore && hasMore) fetchOrders(page + 1);
  };

  if (loading) {
    return (
      <div className="flex flex-col">
        <PortalHeader title={t('dashboard.shopOrders')} />
        <div className="flex items-center justify-center h-64">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PortalHeader title={t('dashboard.shopOrders')} />
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
            {hasMore && (
              <Button variant="ghost" className="w-full" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? <span className="loading loading-spinner loading-sm"></span> : t('dashboard.viewAll')}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
