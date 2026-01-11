import type { CSSProperties } from 'react';
import { useEffect, useState, useCallback } from 'react';
import {
  ShoppingCart,
  Package,
  Users,
  AlertTriangle,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { dashboardApi } from '../../api/dashboard.api';
import { formatCurrency, formatNumber } from '../../config/constants';
import type { DashboardStats } from '../../types';
import { useNotificationsStore } from '../../store/notificationsStore';

const STAT_TONES: Record<string, string> = {
  primary: 'bg-primary/10 text-primary border-primary/20',
  success: 'bg-success/10 text-success border-success/20',
  info: 'bg-info/10 text-info border-info/20',
  secondary: 'bg-secondary/10 text-secondary border-secondary/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  error: 'bg-error/10 text-error border-error/20',
};

function StatCard({
  title,
  value,
  icon: Icon,
  color = 'primary',
  subtext,
  className,
  style,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
  subtext?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const tone = STAT_TONES[color] ?? STAT_TONES.primary;

  return (
    <div
      className={clsx(
        'surface-card group relative overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-strong)]',
        className
      )}
      style={style}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
        <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
      </div>
      <div className="relative p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-base-content/60">{title}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
            {subtext && (
              <p className="mt-2 text-xs text-base-content/60">{subtext}</p>
            )}
          </div>
          <div
            className={clsx(
              'grid h-12 w-12 place-items-center rounded-2xl border',
              tone
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { notifications } = useNotificationsStore();

  const loadStats = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const data = await dashboardApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // WebSocket orqali yangi notification kelganda statistikani yangilash
  useEffect(() => {
    if (notifications.length > 0) {
      loadStats(false);
    }
  }, [notifications.length, loadStats]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="skeleton h-6 w-40" />
          <div className="skeleton mt-2 h-4 w-52" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="surface-card p-4">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton mt-3 h-8 w-32" />
              <div className="skeleton mt-4 h-10 w-10 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="section-title">Dashboard</h1>
          <p className="section-subtitle">Umumiy ko'rsatkichlar</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="nav-chip">Bugun</span>
          <Link to="/pos" className="btn btn-primary">
            <ShoppingCart className="h-4 w-4" />
            Yangi sotuv
          </Link>
        </div>
      </div>

      <div className="stagger-children grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Bugungi sotuvlar"
          value={stats?.todaySalesCount || 0}
          icon={ShoppingCart}
          color="primary"
          subtext={formatCurrency(stats?.todayRevenue || 0)}
          style={{ '--i': 0 } as CSSProperties}
        />
        <StatCard
          title="Jami daromad"
          value={formatCurrency(stats?.totalRevenue || 0)}
          icon={TrendingUp}
          color="success"
          style={{ '--i': 1 } as CSSProperties}
        />
        <StatCard
          title="Mahsulotlar"
          value={formatNumber(stats?.totalProducts || 0)}
          icon={Package}
          color="info"
          subtext={`Omborda: ${formatNumber(stats?.totalStock || 0)} dona`}
          style={{ '--i': 2 } as CSSProperties}
        />
        <StatCard
          title="Mijozlar"
          value={formatNumber(stats?.totalCustomers || 0)}
          icon={Users}
          color="secondary"
          style={{ '--i': 3 } as CSSProperties}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="surface-card p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-warning/15 text-warning">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </span>
            Ogohlantirishlar
          </h2>
          <div className="mt-4 space-y-3">
            {stats?.lowStockCount && stats.lowStockCount > 0 ? (
              <div className="surface-soft flex items-center gap-3 rounded-xl p-3">
                <AlertTriangle className="h-5 w-5 text-warning" />
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
              <div className="surface-soft flex items-center gap-3 rounded-xl p-3">
                <DollarSign className="h-5 w-5 text-info" />
                <span>Jami qarz: {formatCurrency(stats.totalDebt)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="surface-card p-6">
          <h2 className="text-lg font-semibold">Tez havolalar</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link to="/pos" className="btn btn-primary">
              <ShoppingCart className="h-4 w-4" />
              Yangi sotuv
            </Link>
            <Link to="/products" className="btn btn-outline">
              <Package className="h-4 w-4" />
              Mahsulotlar
            </Link>
            <Link to="/customers" className="btn btn-outline">
              <Users className="h-4 w-4" />
              Mijozlar
            </Link>
            <Link to="/debts" className="btn btn-outline">
              <DollarSign className="h-4 w-4" />
              Qarzlar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
