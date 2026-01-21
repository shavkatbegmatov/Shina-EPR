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
  ArrowUpRight,
  ArrowDownRight,
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

// Professional rang palitrasi
const COLORS = {
  primary: '#6366f1',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  secondary: '#8b5cf6',
  chart: ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'],
};

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

// KPI karta komponenti
function KPICard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  color = 'primary',
  className,
  style,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'secondary';
  className?: string;
  style?: CSSProperties;
}) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    error: 'bg-error/10 text-error border-error/20',
    info: 'bg-info/10 text-info border-info/20',
    secondary: 'bg-secondary/10 text-secondary border-secondary/20',
  };

  const isPositive = trend !== undefined && trend >= 0;

  return (
    <div
      className={clsx(
        'surface-card group relative overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-lg',
        className
      )}
      style={style}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-base-content/60">{title}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">{value}</p>
            {trend !== undefined && (
              <div className="mt-3 flex items-center gap-1.5">
                <span
                  className={clsx(
                    'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold',
                    isPositive ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                  )}
                >
                  {isPositive ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(trend).toFixed(1)}%
                </span>
                {trendLabel && (
                  <span className="text-xs text-base-content/50">{trendLabel}</span>
                )}
              </div>
            )}
          </div>
          <div
            className={clsx(
              'grid h-12 w-12 place-items-center rounded-2xl border',
              colorMap[color]
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

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
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.length]);

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="skeleton h-8 w-48" />
            <div className="skeleton mt-2 h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="surface-card p-5">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton mt-3 h-8 w-32" />
              <div className="skeleton mt-3 h-6 w-20" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="surface-card p-5">
            <div className="skeleton h-64 w-full" />
          </div>
          <div className="surface-card p-5">
            <div className="skeleton h-64 w-full" />
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
            <button
              className={clsx('join-item btn btn-sm', period === 7 && 'btn-primary')}
              onClick={() => setPeriod(7)}
            >
              7 kun
            </button>
            <button
              className={clsx('join-item btn btn-sm', period === 30 && 'btn-primary')}
              onClick={() => setPeriod(30)}
            >
              30 kun
            </button>
          </div>
          <Link to="/pos" className="btn btn-primary">
            <ShoppingCart className="h-4 w-4" />
            Yangi sotuv
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Bugungi sotuvlar"
          value={stats?.todaySalesCount || 0}
          icon={ShoppingCart}
          color="primary"
          trend={chartData?.salesGrowthPercent}
          trendLabel="o'tgan haftaga nisbatan"
          style={{ '--i': 0 } as CSSProperties}
        />
        <KPICard
          title="Bugungi daromad"
          value={formatCurrency(stats?.todayRevenue || 0)}
          icon={DollarSign}
          color="success"
          trend={chartData?.revenueGrowthPercent}
          trendLabel="o'tgan haftaga nisbatan"
          style={{ '--i': 1 } as CSSProperties}
        />
        <KPICard
          title="Jami mahsulotlar"
          value={formatNumber(stats?.totalProducts || 0)}
          icon={Package}
          color="info"
          style={{ '--i': 2 } as CSSProperties}
        />
        <KPICard
          title="Mijozlar soni"
          value={formatNumber(stats?.totalCustomers || 0)}
          icon={Users}
          color="secondary"
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
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
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
                  stroke={COLORS.primary}
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
                      fill={COLORS.chart[index % COLORS.chart.length]}
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
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Mahsulot: ${label}`}
                />
                <Bar dataKey="revenue" name="Daromad" fill={COLORS.success} radius={[0, 4, 4, 0]} />
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
                  formatter={(value: number, name: string) =>
                    name === 'Daromad' ? formatCurrency(value) : value
                  }
                />
                <Bar
                  dataKey="salesCount"
                  name="Sotuvlar"
                  fill={COLORS.info}
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
                  formatter={(value: number, name: string) =>
                    name === 'Daromad' ? formatCurrency(value) : value
                  }
                />
                <Bar dataKey="revenue" name="Daromad" radius={[4, 4, 0, 0]}>
                  {(chartData?.weekdaySales || []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.dayOfWeek === 0 || entry.dayOfWeek === 6 ? COLORS.warning : COLORS.primary}
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
                        fill={COLORS.chart[index % COLORS.chart.length]}
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
          <Link to="/pos" className="btn btn-primary">
            <ShoppingCart className="h-4 w-4" />
            Kassa
          </Link>
          <Link to="/products" className="btn btn-outline">
            <Package className="h-4 w-4" />
            Mahsulotlar
          </Link>
          <Link to="/customers" className="btn btn-outline">
            <Users className="h-4 w-4" />
            Mijozlar
          </Link>
          <Link to="/reports" className="btn btn-outline">
            <BarChart3 className="h-4 w-4" />
            Hisobotlar
          </Link>
        </div>
      </div>
    </div>
  );
}
