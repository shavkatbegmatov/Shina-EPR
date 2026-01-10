import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Wallet, AlertTriangle, ShoppingBag, ChevronRight } from 'lucide-react';
import { usePortalAuthStore } from '../store/portalAuthStore';
import { portalApiClient } from '../api/portal.api';
import PortalHeader from '../components/layout/PortalHeader';
import type { CustomerDashboardStats, PortalSale } from '../types/portal.types';
import { format } from 'date-fns';

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount);
}

export default function PortalDashboardPage() {
  const { t } = useTranslation();
  const { customer } = usePortalAuthStore();
  const [stats, setStats] = useState<CustomerDashboardStats | null>(null);
  const [recentPurchases, setRecentPurchases] = useState<PortalSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardStats, purchasesData] = await Promise.all([
          portalApiClient.getDashboard(),
          portalApiClient.getPurchases(0, 3),
        ]);
        setStats(dashboardStats);
        setRecentPurchases(purchasesData.content);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

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
              <p className={`text-xl font-bold ${stats && stats.balance < 0 ? 'text-error' : 'text-success'}`}>
                {formatMoney(stats?.balance || 0)} {t('common.sum')}
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
              <p className={`text-xl font-bold ${stats?.hasDebt ? 'text-error' : 'text-success'}`}>
                {formatMoney(stats?.totalDebt || 0)} {t('common.sum')}
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
                <p className="text-xl font-bold">{stats?.totalPurchases || 0}</p>
              </div>
              {stats?.hasDebt && (
                <Link to="/kabinet/qarzlar" className="btn btn-error btn-sm">
                  {t('dashboard.hasDebt')}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Recent Purchases */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{t('dashboard.recentPurchases')}</h3>
              <Link to="/kabinet/xaridlar" className="text-primary text-sm flex items-center gap-1">
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
                    to={`/kabinet/xaridlar/${purchase.id}`}
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
