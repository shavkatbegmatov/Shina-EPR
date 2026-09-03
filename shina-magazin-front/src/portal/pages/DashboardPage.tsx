import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Wallet, AlertTriangle, ShoppingBag, ChevronRight, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { usePortalAuthStore } from '../store/portalAuthStore';
import { portalApiClient } from '../api/portal.api';
import { portalKeys, PORTAL_STALE_TIME } from '../api/portalQueryKeys';
import PortalHeader from '../components/layout/PortalHeader';
import { PortalError, PortalLoading } from '../components/PortalState';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatNumber as formatMoney } from '../../config/constants';
import { buttonVariants } from '@/ui';

export default function PortalDashboardPage() {
  const { t } = useTranslation();
  const { customer } = usePortalAuthStore();

  const statsQuery = useQuery({
    queryKey: portalKeys.dashboard(),
    queryFn: () => portalApiClient.getDashboard(),
    staleTime: PORTAL_STALE_TIME,
  });
  const recentQuery = useQuery({
    queryKey: portalKeys.recentPurchases(),
    queryFn: () => portalApiClient.getPurchases(0, 3),
    staleTime: PORTAL_STALE_TIME,
  });

  if (statsQuery.isPending || recentQuery.isPending) {
    return (
      <div className="flex flex-col">
        <PortalHeader title={t('dashboard.title')} />
        <PortalLoading />
      </div>
    );
  }

  if (statsQuery.isError || recentQuery.isError) {
    const error = statsQuery.error ?? recentQuery.error;
    return (
      <div className="flex flex-col">
        <PortalHeader title={t('dashboard.title')} />
        <PortalError
          message={getApiErrorMessage(error)}
          onRetry={() => {
            void statsQuery.refetch();
            void recentQuery.refetch();
          }}
        />
      </div>
    );
  }

  const stats = statsQuery.data;
  const recentPurchases = recentQuery.data.content;

  return (
    <div className="flex flex-col">
      <PortalHeader title={t('dashboard.title')} />

      <div className="p-4 space-y-4">
        {/* Greeting */}
        <div className="card bg-primary text-primary-content">
          <div className="card-body py-4">
            <h2 className="text-lg">
              {t('dashboard.greeting')}, <span className="font-bold">{customer?.fullName}</span>! 👋
            </h2>
            <Link to="/" className="mt-1 inline-flex w-fit items-center gap-1 text-sm text-primary-content/80 hover:text-primary-content">
              <ArrowLeft size={14} /> {t('dashboard.backToShop')}
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Balance */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center gap-2 text-base-content/60 text-xs">
                <Wallet size={16} />
                {t('dashboard.balance')}
              </div>
              <p className={`text-xl font-bold ${stats.balance < 0 ? 'text-error' : 'text-success'}`}>
                {formatMoney(stats.balance || 0)} {t('common.sum')}
              </p>
            </div>
          </div>

          {/* Total Debt */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center gap-2 text-base-content/60 text-xs">
                <AlertTriangle size={16} />
                {t('dashboard.totalDebt')}
              </div>
              <p className={`text-xl font-bold ${stats.hasDebt ? 'text-error' : 'text-success'}`}>
                {formatMoney(stats.totalDebt || 0)} {t('common.sum')}
              </p>
            </div>
          </div>

          {/* Total Purchases */}
          <div className="card bg-base-100 shadow-sm col-span-2">
            <div className="card-body p-4 flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-base-content/60 text-xs">
                  <ShoppingBag size={16} />
                  {t('dashboard.totalPurchases')}
                </div>
                <p className="text-xl font-bold">{stats.totalPurchases || 0}</p>
              </div>
              {stats.hasDebt && (
                <Link to="/hisob/qarzlar" className={buttonVariants({ variant: "danger", size: "sm" })}>
                  {t('dashboard.hasDebt')}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Do'kon buyurtmalari (storefront) */}
        <Link to="/hisob/buyurtmalar" className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="card-body p-4 flex-row items-center justify-between">
            <div className="flex items-center gap-2 font-medium">
              <ShoppingBag size={18} className="text-primary" />
              {t('dashboard.shopOrders')}
            </div>
            <ChevronRight className="text-base-content/40" />
          </div>
        </Link>

        {/* Recent Purchases */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{t('dashboard.recentPurchases')}</h3>
              <Link to="/hisob/xaridlar" className="text-primary text-sm flex items-center gap-1">
                {t('dashboard.viewAll')}
                <ChevronRight size={16} />
              </Link>
            </div>

            {recentPurchases.length === 0 ? (
              <p className="text-base-content/60 text-center py-4">{t('purchases.noPurchases')}</p>
            ) : (
              <div className="space-y-2">
                {recentPurchases.map((purchase) => (
                  <Link
                    key={purchase.id}
                    to={`/hisob/xaridlar/${purchase.id}`}
                    className="flex items-center justify-between p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{purchase.invoiceNumber}</p>
                      <p className="text-xs text-base-content/60">
                        {format(new Date(purchase.saleDate), 'dd.MM.yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        {formatMoney(purchase.totalAmount)} {t('common.sum')}
                      </p>
                      <p className={`text-xs ${
                        purchase.paymentStatus === 'PAID' ? 'text-success' :
                        purchase.paymentStatus === 'PARTIAL' ? 'text-warning' : 'text-error'
                      }`}>
                        {t(`payment.${purchase.paymentStatus.toLowerCase()}`)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
