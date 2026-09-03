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
  COMPLETED: 'badge-success',
  CANCELLED: 'badge-error',
  REFUNDED: 'badge-warning',
};

const PAYMENT_CLASS: Record<string, string> = {
  PAID: 'text-success',
  PARTIAL: 'text-warning',
  UNPAID: 'text-error',
};

export default function PortalPurchasesPage() {
  const { t } = useTranslation();

  const query = useInfiniteQuery({
    queryKey: portalKeys.purchases(),
    queryFn: ({ pageParam }) => portalApiClient.getPurchases(pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
    staleTime: PORTAL_STALE_TIME,
  });

  const purchases = query.data?.pages.flatMap((page) => page.content) ?? [];

  return (
    <div className="flex flex-col">
      <PortalHeader title={t('purchases.title')} />

      {query.isPending ? (
        <PortalLoading />
      ) : query.isError ? (
        <PortalError message={getApiErrorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : (
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
                  to={`/hisob/xaridlar/${purchase.id}`}
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
                      <span className={`badge badge-sm ${STATUS_BADGE[purchase.status] ?? 'badge-ghost'}`}>
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
                        <p className={`font-medium ${PAYMENT_CLASS[purchase.paymentStatus] ?? ''}`}>
                          {t(`payment.${purchase.paymentStatus.toLowerCase()}`)}
                        </p>
                      </div>
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
                  {query.isFetchingNextPage ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    t('dashboard.viewAll')
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
