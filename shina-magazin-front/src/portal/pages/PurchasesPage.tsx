import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { portalApiClient } from '../api/portal.api';
import PortalHeader from '../components/layout/PortalHeader';
import type { PortalSale, PagedResponse } from '../types/portal.types';
import { format } from 'date-fns';

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount);
}

export default function PortalPurchasesPage() {
  const { t } = useTranslation();
  const [purchases, setPurchases] = useState<PortalSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetchPurchases(0);
  }, []);

  const fetchPurchases = async (pageNum: number) => {
    try {
      if (pageNum === 0) setLoading(true);
      else setLoadingMore(true);

      const data: PagedResponse<PortalSale> = await portalApiClient.getPurchases(pageNum, 10);

      if (pageNum === 0) {
        setPurchases(data.content);
      } else {
        setPurchases((prev) => [...prev, ...data.content]);
      }

      setHasMore(!data.last);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch purchases', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchPurchases(page + 1);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      COMPLETED: 'badge-success',
      CANCELLED: 'badge-error',
      REFUNDED: 'badge-warning',
    };
    return styles[status as keyof typeof styles] || 'badge-ghost';
  };

  const getPaymentBadge = (status: string) => {
    const styles = {
      PAID: 'text-success',
      PARTIAL: 'text-warning',
      UNPAID: 'text-error',
    };
    return styles[status as keyof typeof styles] || '';
  };

  if (loading) {
    return (
      <div className="flex flex-col">
        <PortalHeader title={t('purchases.title')} />
        <div className="flex items-center justify-center h-64">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PortalHeader title={t('purchases.title')} />

      <div className="p-4">
        {purchases.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
            <p className="text-base-content/60">{t('purchases.noPurchases')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {purchases.map((purchase) => (
              <Link
                key={purchase.id}
                to={`/kabinet/xaridlar/${purchase.id}`}
                className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="card-body p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{purchase.invoiceNumber}</p>
                      <p className="text-sm text-base-content/60">
                        {format(new Date(purchase.saleDate), 'dd.MM.yyyy HH:mm')}
                      </p>
                    </div>
                    <span className={`badge badge-sm ${getStatusBadge(purchase.status)}`}>
                      {t(`status.${purchase.status.toLowerCase()}`)}
                    </span>
                  </div>

                  <div className="divider my-2"></div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-base-content/60">{t('purchases.total')}</p>
                      <p className="font-bold">
                        {formatMoney(purchase.totalAmount)} {t('common.sum')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-base-content/60">{t('purchases.status')}</p>
                      <p className={`font-medium ${getPaymentBadge(purchase.paymentStatus)}`}>
                        {t(`payment.${purchase.paymentStatus.toLowerCase()}`)}
                      </p>
                    </div>
                    <ChevronRight className="text-base-content/40" />
                  </div>
                </div>
              </Link>
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
