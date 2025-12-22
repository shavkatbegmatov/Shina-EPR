import { useEffect, useState } from 'react';
import {
  ShoppingCart,
  Package,
  Users,
  AlertTriangle,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import { dashboardApi } from '../../api/dashboard.api';
import { formatCurrency, formatNumber } from '../../config/constants';
import type { DashboardStats } from '../../types';

function StatCard({
  title,
  value,
  icon: Icon,
  color = 'primary',
  subtext,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
  subtext?: string;
}) {
  return (
    <div className="card bg-base-100 shadow-sm border border-base-200">
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-base-content/70">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtext && (
              <p className="text-xs text-base-content/50 mt-1">{subtext}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg bg-${color}/10`}>
            <Icon className={`w-6 h-6 text-${color}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await dashboardApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-base-content/70">Umumiy ko'rsatkichlar</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Bugungi sotuvlar"
          value={stats?.todaySalesCount || 0}
          icon={ShoppingCart}
          color="primary"
          subtext={formatCurrency(stats?.todayRevenue || 0)}
        />
        <StatCard
          title="Jami daromad"
          value={formatCurrency(stats?.totalRevenue || 0)}
          icon={TrendingUp}
          color="success"
        />
        <StatCard
          title="Mahsulotlar"
          value={formatNumber(stats?.totalProducts || 0)}
          icon={Package}
          color="info"
          subtext={`Omborda: ${formatNumber(stats?.totalStock || 0)} dona`}
        />
        <StatCard
          title="Mijozlar"
          value={formatNumber(stats?.totalCustomers || 0)}
          icon={Users}
          color="secondary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body">
            <h2 className="card-title text-lg">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Ogohlantirishlar
            </h2>
            <div className="space-y-3 mt-2">
              {stats?.lowStockCount && stats.lowStockCount > 0 ? (
                <div className="alert alert-warning">
                  <AlertTriangle className="w-5 h-5" />
                  <span>
                    {stats.lowStockCount} ta mahsulotda kam zaxira qoldi
                  </span>
                </div>
              ) : (
                <p className="text-base-content/70">
                  Hozircha ogohlantirish yo'q
                </p>
              )}
              {stats?.totalDebt && stats.totalDebt > 0 && (
                <div className="alert alert-info">
                  <DollarSign className="w-5 h-5" />
                  <span>
                    Jami qarz: {formatCurrency(stats.totalDebt)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body">
            <h2 className="card-title text-lg">Tez havolalar</h2>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <a href="/pos" className="btn btn-primary">
                <ShoppingCart className="w-4 h-4" />
                Yangi sotuv
              </a>
              <a href="/products" className="btn btn-outline">
                <Package className="w-4 h-4" />
                Mahsulotlar
              </a>
              <a href="/customers" className="btn btn-outline">
                <Users className="w-4 h-4" />
                Mijozlar
              </a>
              <a href="/debts" className="btn btn-outline">
                <DollarSign className="w-4 h-4" />
                Qarzlar
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
