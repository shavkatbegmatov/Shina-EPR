import type { CSSProperties } from 'react';
import { useEffect, useState, useCallback } from 'react';
import {
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  DollarSign,
  CreditCard,
  Wallet,
  BarChart3,
  PieChart,
  Clock,
  Calendar,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart as RechartsPie,
  Pie,
  Legend,
} from 'recharts';
import { dashboardApi } from '../../api/dashboard.api';
import { formatCurrency, formatNumber } from '../../config/constants';
import type { DashboardStats, ChartData } from '../../types';
import { useNotificationsStore } from '../../store/notificationsStore';
import { Button, buttonVariants, useChartColors, StatCard, Skeleton } from '@/ui';

// Grafik ranglari tema-aware useChartColors() hooki orqali keladi (src/ui/charts).
// Brend teal/orange/lime + dark-mode varianti src/index.css dagi --chart-* tokenlaridan.

// Valyuta formatlash (qisqa)
const formatCompactCurrency = (value: number): string => {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toString();
};

// Chart Card komponenti
function ChartCard({
  title,
  icon: Icon,
  children,
  action,
  className,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('surface-card overflow-hidden', className)}>
      <div className="flex items-center justify-between border-b border-base-200 px-5 py-4">
        <h3 className="flex items-center gap-2 font-semibold">
          {Icon && <Icon className="h-5 w-5 text-primary" />}
          {title}
        </h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// Recharts tooltip types
interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-base-200 bg-base-100 p-3 shadow-lg">
        <p className="mb-2 font-medium">{label}</p>
        {payload.map((entry: TooltipPayloadEntry, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.name.includes('Daromad') ? formatCurrency(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function DashboardPage() {
  const colors = useChartColors();
  const barCursor = { fill: colors.cursor };
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<7 | 30>(30);
  const { notifications } = useNotificationsStore();
  const loadData = useCallback(async (isInitial = false) => {
    try {
      if (!isInitial) {
        setRefreshing(true);
      }
      const [statsData, chartsData] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getChartData(period),
      ]);
      setStats(statsData);
      setChartData(chartsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  useEffect(() => {
    if (notifications.length > 0) {
      void loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.length]);

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="surface-card p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-8 w-32" />
              <Skeleton className="mt-3 h-6 w-20" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="surface-card p-5">
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="surface-card p-5">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {refreshing && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-base-100/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <span className="text-sm font-medium text-base-content/70">Yangilanmoqda...</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">Dashboard</h1>
          <p className="mt-1 text-base-content/60">
            Biznesingiz haqida real vaqtda ma'lumotlar
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Period selector */}
          <div className="join">
            <Button
              size="sm"
              variant={period === 7 ? 'primary' : 'default'}
              className="join-item"
              onClick={() => setPeriod(7)}
            >
              7 kun
            </Button>
            <Button
              size="sm"
              variant={period === 30 ? 'primary' : 'default'}
              className="join-item"
              onClick={() => setPeriod(30)}
            >
              30 kun
            </Button>
          </div>
          <Link to="/admin/pos" className={buttonVariants({ variant: 'primary' })}>
            <ShoppingCart className="h-4 w-4" />
            Yangi sotuv
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Bugungi sotuvlar"
          value={stats?.todaySalesCount || 0}
          icon={ShoppingCart}
          tone="primary"
          trend={chartData?.salesGrowthPercent}
          trendLabel="o'tgan haftaga nisbatan"
          style={{ '--i': 0 } as CSSProperties}
        />
        <StatCard
          title="Bugungi daromad"
          value={formatCurrency(stats?.todayRevenue || 0)}
          icon={DollarSign}
          tone="success"
          trend={chartData?.revenueGrowthPercent}
          trendLabel="o'tgan haftaga nisbatan"
          style={{ '--i': 1 } as CSSProperties}
        />
        <StatCard
          title="Jami mahsulotlar"
          value={formatNumber(stats?.totalProducts || 0)}
          icon={Package}
          tone="info"
          style={{ '--i': 2 } as CSSProperties}
        />
        <StatCard
          title="Mijozlar soni"
          value={formatNumber(stats?.totalCustomers || 0)}
          icon={Users}
          tone="secondary"
          style={{ '--i': 3 } as CSSProperties}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="surface-soft rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Bu hafta</p>
              <p className="font-bold">{formatCompactCurrency(chartData?.thisWeekRevenue || 0)}</p>
            </div>
          </div>
        </div>
        <div className="surface-soft rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-info/10 p-2">
              <Calendar className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Bu oy</p>
              <p className="font-bold">{formatCompactCurrency(chartData?.thisMonthRevenue || 0)}</p>
            </div>
          </div>
        </div>
        <div className="surface-soft rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-warning/10 p-2">
              <Package className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Omborda</p>
              <p className="font-bold">{formatNumber(stats?.totalStock || 0)} dona</p>
            </div>
          </div>
        </div>
        <div className="surface-soft rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-error/10 p-2">
              <Wallet className="h-5 w-5 text-error" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Jami qarz</p>
              <p className="font-bold text-error">{formatCompactCurrency(stats?.totalDebt || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Sales Trend - Takes 2 columns */}
        <ChartCard
          title="Sotuvlar dinamikasi"
          icon={TrendingUp}
          className="lg:col-span-2"
          action={
            <span className="text-xs text-base-content/50">
              Oxirgi {period} kun
            </span>
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData?.salesTrend || []}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCompactCurrency(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Daromad"
                  stroke={colors.primary}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Payment Methods - Donut Chart */}
        <ChartCard title="To'lov usullari" icon={CreditCard}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={chartData?.paymentMethods || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="amount"
                  nameKey="methodLabel"
                  label={({ methodLabel, percentage }) =>
                    `${methodLabel} ${percentage.toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {(chartData?.paymentMethods || []).map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={colors.series[index % colors.series.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top Products */}
        <ChartCard title="Top mahsulotlar" icon={BarChart3}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData?.topProducts?.slice(0, 5) || []}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatCompactCurrency(value)}
                />
                <YAxis
                  type="category"
                  dataKey="productName"
                  tick={{ fontSize: 11 }}
                  width={120}
                  tickFormatter={(value) =>
                    value.length > 18 ? `${value.slice(0, 18)}...` : value
                  }
                />
                <Tooltip
                  cursor={barCursor}
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Mahsulot: ${label}`}
                />
                <Bar dataKey="revenue" name="Daromad" fill={colors.success} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Hourly Sales */}
        <ChartCard
          title="Bugungi sotuvlar (soatlik)"
          icon={Clock}
          action={
            <span className="text-xs text-base-content/50">
              08:00 - 22:00
            </span>
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData?.hourlySales || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="hourLabel" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  cursor={barCursor}
                  formatter={(value: number, name: string) =>
                    name === 'Daromad' ? formatCurrency(value) : value
                  }
                />
                <Bar
                  dataKey="salesCount"
                  name="Sotuvlar"
                  fill={colors.info}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Third Row - Weekday and Category */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Weekday Sales */}
        <ChartCard title="Hafta kunlari bo'yicha" icon={Calendar}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData?.weekdaySales || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCompactCurrency(v)} />
                <Tooltip
                  cursor={barCursor}
                  formatter={(value: number, name: string) =>
                    name === 'Daromad' ? formatCurrency(value) : value
                  }
                />
                <Bar dataKey="revenue" name="Daromad" radius={[4, 4, 0, 0]}>
                  {(chartData?.weekdaySales || []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.dayOfWeek === 0 || entry.dayOfWeek === 6 ? colors.warning : colors.primary}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Category Sales */}
        <ChartCard title="Kategoriyalar bo'yicha" icon={PieChart}>
          <div className="h-64">
            {chartData?.categorySales && chartData.categorySales.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={chartData.categorySales}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="revenue"
                    nameKey="categoryName"
                    label={({ categoryName, percentage }) =>
                      percentage > 5 ? `${categoryName} ${percentage.toFixed(0)}%` : ''
                    }
                  >
                    {chartData.categorySales.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={colors.series[index % colors.series.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-base-content/50">
                Ma'lumot mavjud emas
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Quick Links */}
      <div className="surface-card p-5">
        <h3 className="mb-4 font-semibold">Tez havolalar</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link to="/admin/pos" className={buttonVariants({ variant: 'primary' })}>
            <ShoppingCart className="h-4 w-4" />
            Kassa
          </Link>
          <Link to="/admin/products" className={buttonVariants({ variant: 'outline' })}>
            <Package className="h-4 w-4" />
            Mahsulotlar
          </Link>
          <Link to="/admin/customers" className={buttonVariants({ variant: 'outline' })}>
            <Users className="h-4 w-4" />
            Mijozlar
          </Link>
          <Link to="/admin/reports" className={buttonVariants({ variant: 'outline' })}>
            <BarChart3 className="h-4 w-4" />
            Hisobotlar
          </Link>
        </div>
      </div>
    </div>
  );
}
