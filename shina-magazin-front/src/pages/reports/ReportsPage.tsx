import { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  Users,
  Banknote,
  CreditCard,
  Building2,
  AlertCircle,
  Package,
  RefreshCw,
  FileDown,
  FileSpreadsheet,
  Warehouse,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  Tag,
  Receipt,
  Clock,
  UserX,
  Check,
} from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui';
import { reportsApi } from '../../api/reports.api';
import {
  formatCurrency,
  formatNumber,
  formatDate,
  getTashkentToday,
  getDateDaysAgo,
  getDateMonthsAgo,
  getDateYearsAgo,
} from '../../config/constants';
import {
  exportReportToExcel,
  exportReportToPDF,
  exportWarehouseReportToExcel,
  exportWarehouseReportToPDF,
  exportDebtsReportToExcel,
  exportDebtsReportToPDF,
} from '../../utils/exportUtils';
import { DateRangePicker, type DateRangePreset, type DateRange } from '../../components/common/DateRangePicker';
import type { SalesReport, WarehouseReport, DebtsReport } from '../../types';
import { useNotificationsStore } from '../../store/notificationsStore';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';

type ReportTab = 'sales' | 'warehouse' | 'debts';

export function ReportsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [warehouseReport, setWarehouseReport] = useState<WarehouseReport | null>(null);
  const [debtsReport, setDebtsReport] = useState<DebtsReport | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('month');
  const [customRange, setCustomRange] = useState<DateRange>({ start: '', end: '' });
  const { notifications } = useNotificationsStore();

  // Toshkent timezone da sana oralig'ini hisoblash
  const getDateRangeValues = useCallback((preset: DateRangePreset): { start: string; end: string } => {
    const end = getTashkentToday();

    switch (preset) {
      case 'all':
        // Hisobotlar uchun 'all' - so'nggi 1 yil
        return { start: getDateYearsAgo(1), end };
      case 'today':
        return { start: end, end };
      case 'week':
        return { start: getDateDaysAgo(7), end };
      case 'month':
        return { start: getDateMonthsAgo(1), end };
      case 'quarter':
        return { start: getDateMonthsAgo(3), end };
      case 'year':
        return { start: getDateYearsAgo(1), end };
      case 'custom':
        if (customRange.start && customRange.end) {
          return { start: customRange.start, end: customRange.end };
        }
        return { start: getDateMonthsAgo(1), end };
      default:
        return { start: getDateMonthsAgo(1), end };
    }
  }, [customRange.start, customRange.end]);

  const loadReports = useCallback(async (isManualRefresh = false) => {
    // Agar birinchi yuklash bo'lmasa, smooth refresh uchun refreshing holati ishlatiladi
    const isFirstLoad = initialLoading;

    if (!isFirstLoad) {
      setRefreshing(true);
    }

    if (isManualRefresh) {
      setRefreshSuccess(false);
    }

    setError(null);

    try {
      const { start, end } = getDateRangeValues(dateRangePreset);
      if (!start || !end) {
        setError(t('erp.reports.selectDateRange'));
        setInitialLoading(false);
        setRefreshing(false);
        return;
      }
      const [sales, warehouse, debts] = await Promise.all([
        reportsApi.getSalesReport(start, end),
        reportsApi.getWarehouseReport(start, end),
        reportsApi.getDebtsReport(start, end),
      ]);
      setSalesReport(sales);
      setWarehouseReport(warehouse);
      setDebtsReport(debts);

      if (isManualRefresh) {
        setRefreshSuccess(true);
        setTimeout(() => setRefreshSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError(t('erp.reports.loadError'));
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [dateRangePreset, getDateRangeValues, initialLoading, t]);

  useEffect(() => {
    if (dateRangePreset !== 'custom' || (customRange.start && customRange.end)) {
      loadReports(false);
    }
  }, [dateRangePreset, customRange.start, customRange.end, loadReports]);

  // WebSocket orqali yangi notification kelganda hisobotlarni yangilash
  useEffect(() => {
    if (notifications.length > 0) {
      loadReports(false);
    }
  }, [notifications.length, loadReports]);

  const handleDateRangeChange = (preset: DateRangePreset, range?: DateRange) => {
    setDateRangePreset(preset);
    if (range) {
      setCustomRange(range);
    }
  };

  const handleExportExcel = () => {
    const { start, end } = getDateRangeValues(dateRangePreset);
    if (activeTab === 'sales' && salesReport) {
      exportReportToExcel(salesReport, start, end);
    } else if (activeTab === 'warehouse' && warehouseReport) {
      exportWarehouseReportToExcel(warehouseReport, start, end);
    } else if (activeTab === 'debts' && debtsReport) {
      exportDebtsReportToExcel(debtsReport, start, end);
    }
  };

  const handleExportPDF = () => {
    const { start, end } = getDateRangeValues(dateRangePreset);
    if (activeTab === 'sales' && salesReport) {
      exportReportToPDF(salesReport, start, end);
    } else if (activeTab === 'warehouse' && warehouseReport) {
      exportWarehouseReportToPDF(warehouseReport, start, end);
    } else if (activeTab === 'debts' && debtsReport) {
      exportDebtsReportToPDF(debtsReport, start, end);
    }
  };

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="skeleton h-6 w-40" />
            <div className="skeleton mt-2 h-4 w-52" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="surface-card p-4">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton mt-3 h-8 w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="section-title">{t('erp.reports.title')}</h1>
          <p className="section-subtitle">{t('erp.reports.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker
            value={dateRangePreset}
            customRange={customRange}
            onChange={handleDateRangeChange}
          />

          <Button
            variant={refreshSuccess ? 'success' : 'outline'}
            size="sm"
            className="gap-2 transition-all"
            onClick={() => loadReports(true)}
            disabled={initialLoading || refreshing}
          >
            {refreshSuccess ? (
              <>
                <Check className="h-4 w-4" />
                {t('erp.reports.refreshed')}
              </>
            ) : (
              <>
                <RefreshCw className={clsx('h-4 w-4', refreshing && 'animate-spin')} />
                {refreshing ? t('erp.reports.refreshing') : t('common.refresh')}
              </>
            )}
          </Button>

          <div className="flex items-center gap-2">
            <PermissionGate permission={PermissionCode.REPORTS_EXPORT}>
              <Button variant="success" size="sm" onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
            </PermissionGate>
            <PermissionGate permission={PermissionCode.REPORTS_EXPORT}>
              <Button variant="danger" size="sm" onClick={handleExportPDF}>
                <FileDown className="h-4 w-4" />
                PDF
              </Button>
            </PermissionGate>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed w-fit">
        <button
          className={clsx('tab gap-2', activeTab === 'sales' && 'tab-active')}
          onClick={() => setActiveTab('sales')}
        >
          <ShoppingCart className="h-4 w-4" />
          {t('erp.reports.tabSales')}
        </button>
        <button
          className={clsx('tab gap-2', activeTab === 'warehouse' && 'tab-active')}
          onClick={() => setActiveTab('warehouse')}
        >
          <Warehouse className="h-4 w-4" />
          {t('erp.reports.tabWarehouse')}
        </button>
        <button
          className={clsx('tab gap-2', activeTab === 'debts' && 'tab-active')}
          onClick={() => setActiveTab('debts')}
        >
          <Receipt className="h-4 w-4" />
          {t('erp.reports.tabDebts')}
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Content with refresh overlay */}
      <div className="relative">
        {/* Refresh overlay */}
        {refreshing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-base-100/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <span className="text-sm font-medium text-base-content/70">{t('erp.reports.reportsRefreshing')}</span>
            </div>
          </div>
        )}

        {/* Sales Report Tab */}
        {activeTab === 'sales' && salesReport && <SalesReportView report={salesReport} />}

        {/* Warehouse Report Tab */}
        {activeTab === 'warehouse' && warehouseReport && (
          <WarehouseReportView report={warehouseReport} />
        )}

        {/* Debts Report Tab */}
        {activeTab === 'debts' && debtsReport && <DebtsReportView report={debtsReport} />}
      </div>
    </div>
  );
}

// Sales Report View
function SalesReportView({ report }: { report: SalesReport }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('erp.reports.statTotalRevenue')}
          value={formatCurrency(report.totalRevenue)}
          icon={TrendingUp}
          color="success"
        />
        <StatCard
          title={t('erp.reports.statTotalProfit')}
          value={formatCurrency(report.totalProfit)}
          icon={Banknote}
          color="primary"
        />
        <StatCard
          title={t('erp.reports.statSalesCount')}
          value={formatNumber(report.completedSalesCount)}
          icon={ShoppingCart}
          color="info"
          subtext={t('erp.reports.cancelledCount', { count: report.cancelledSalesCount })}
        />
        <StatCard
          title={t('erp.reports.statAverageSale')}
          value={formatCurrency(report.averageSaleAmount)}
          icon={TrendingUp}
          color="secondary"
        />
      </div>

      <div className="surface-card p-6">
        <h2 className="mb-4 text-lg font-semibold">{t('erp.reports.byPaymentMethod')}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PaymentMethodCard icon={Banknote} label={t('erp.reports.cash')} amount={report.cashTotal} color="bg-green-500" />
          <PaymentMethodCard icon={CreditCard} label={t('erp.reports.card')} amount={report.cardTotal} color="bg-blue-500" />
          <PaymentMethodCard icon={Building2} label={t('erp.reports.transfer')} amount={report.transferTotal} color="bg-purple-500" />
          <PaymentMethodCard icon={AlertCircle} label={t('erp.reports.debt')} amount={report.debtTotal} color="bg-orange-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="surface-card p-6">
          <h2 className="mb-4 text-lg font-semibold">{t('erp.reports.dailySales')}</h2>
          {report.dailyData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>{t('erp.reports.colDate')}</th>
                    <th className="text-right">{t('erp.reports.colSales')}</th>
                    <th className="text-right">{t('erp.reports.colRevenue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.dailyData.slice(-10).map((day) => (
                    <tr key={day.date}>
                      <td>{formatDate(day.date)}</td>
                      <td className="text-right">{day.salesCount}</td>
                      <td className="text-right">{formatCurrency(day.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-base-content/60">{t('erp.reports.noData')}</p>
          )}
        </div>

        <div className="surface-card p-6">
          <h2 className="mb-4 text-lg font-semibold">{t('erp.reports.revenueChart')}</h2>
          {report.dailyData.length > 0 ? (
            <div className="h-64">
              <SimpleBarChart data={report.dailyData.slice(-14)} />
            </div>
          ) : (
            <p className="text-base-content/60">{t('erp.reports.noData')}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="surface-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Package className="h-5 w-5" />
            {t('erp.reports.topProducts')}
          </h2>
          {report.topProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t('erp.reports.colProduct')}</th>
                    <th className="text-right">{t('erp.reports.colSold')}</th>
                    <th className="text-right">{t('erp.reports.colRevenue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topProducts.map((product, index) => (
                    <tr key={product.productId}>
                      <td>{index + 1}</td>
                      <td>
                        <span className="font-medium">{product.productName}</span>
                        <span className="ml-2 text-xs text-base-content/60">{product.productSku}</span>
                      </td>
                      <td className="text-right">{t('erp.reports.unitsCount', { units: product.quantitySold })}</td>
                      <td className="text-right">{formatCurrency(product.totalRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-base-content/60">{t('erp.reports.noData')}</p>
          )}
        </div>

        <div className="surface-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5" />
            {t('erp.reports.topCustomers')}
          </h2>
          {report.topCustomers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t('erp.reports.colCustomer')}</th>
                    <th className="text-right">{t('erp.reports.colPurchases')}</th>
                    <th className="text-right">{t('common.total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topCustomers.map((customer, index) => (
                    <tr key={customer.customerId}>
                      <td>{index + 1}</td>
                      <td>
                        <span className="font-medium">{customer.customerName}</span>
                        <span className="ml-2 text-xs text-base-content/60">{customer.customerPhone}</span>
                      </td>
                      <td className="text-right">{customer.purchaseCount}</td>
                      <td className="text-right">{formatCurrency(customer.totalSpent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-base-content/60">{t('erp.reports.noData')}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Warehouse Report View
function WarehouseReportView({ report }: { report: WarehouseReport }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('erp.reports.statTotalProducts')}
          value={formatNumber(report.totalProducts)}
          icon={Package}
          color="primary"
          subtext={t('erp.reports.inStockUnits', { units: formatNumber(report.totalStock) })}
        />
        <StatCard
          title={t('erp.reports.statStockValue')}
          value={formatCurrency(report.totalStockValue)}
          icon={Banknote}
          color="success"
          subtext={t('erp.reports.potentialValue', { value: formatCurrency(report.totalPotentialRevenue) })}
        />
        <StatCard
          title={t('erp.reports.statLowStock')}
          value={formatNumber(report.lowStockCount)}
          icon={AlertTriangle}
          color="warning"
          subtext={t('erp.reports.outOfStockSub', { count: report.outOfStockCount })}
        />
        <StatCard
          title={t('erp.reports.statMovements')}
          value={`${report.inMovementsCount} / ${report.outMovementsCount}`}
          icon={ArrowDownToLine}
          color="info"
          subtext={t('erp.reports.incomingOutgoing', { incoming: report.totalIncoming, outgoing: report.totalOutgoing })}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="surface-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Tag className="h-5 w-5" />
            {t('erp.reports.byCategory')}
          </h2>
          {report.stockByCategory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>{t('erp.reports.colCategory')}</th>
                    <th className="text-right">{t('erp.reports.colProducts')}</th>
                    <th className="text-right">{t('erp.reports.colInStock')}</th>
                    <th className="text-right">{t('erp.reports.colValue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.stockByCategory.map((cat) => (
                    <tr key={cat.categoryId}>
                      <td className="font-medium">{cat.categoryName}</td>
                      <td className="text-right">{cat.productCount}</td>
                      <td className="text-right">{t('erp.reports.unitsCount', { units: formatNumber(cat.totalStock) })}</td>
                      <td className="text-right">{formatCurrency(cat.stockValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-base-content/60">{t('erp.reports.noData')}</p>
          )}
        </div>

        <div className="surface-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Package className="h-5 w-5" />
            {t('erp.reports.byBrand')}
          </h2>
          {report.stockByBrand.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>{t('erp.reports.colBrand')}</th>
                    <th className="text-right">{t('erp.reports.colProducts')}</th>
                    <th className="text-right">{t('erp.reports.colInStock')}</th>
                    <th className="text-right">{t('erp.reports.colValue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.stockByBrand.map((brand) => (
                    <tr key={brand.brandId}>
                      <td className="font-medium">{brand.brandName}</td>
                      <td className="text-right">{brand.productCount}</td>
                      <td className="text-right">{t('erp.reports.unitsCount', { units: formatNumber(brand.totalStock) })}</td>
                      <td className="text-right">{formatCurrency(brand.stockValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-base-content/60">{t('erp.reports.noData')}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="surface-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {t('erp.reports.lowStockProducts')}
          </h2>
          {report.lowStockProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>{t('erp.reports.colProduct')}</th>
                    <th className="text-right">{t('erp.reports.colCurrent')}</th>
                    <th className="text-right">{t('erp.reports.colMinimal')}</th>
                    <th className="text-right">{t('erp.reports.colPrice')}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.lowStockProducts.map((product) => (
                    <tr key={product.productId} className={product.currentStock === 0 ? 'text-error' : ''}>
                      <td>
                        <span className="font-medium">{product.productName}</span>
                        <span className="ml-2 text-xs text-base-content/60">{product.productSku}</span>
                      </td>
                      <td className="text-right font-bold">{product.currentStock}</td>
                      <td className="text-right">{product.minStockLevel}</td>
                      <td className="text-right">{formatCurrency(product.sellingPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-success">{t('erp.reports.allProductsSufficient')}</p>
          )}
        </div>

        <div className="surface-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <ArrowUpFromLine className="h-5 w-5" />
            {t('erp.reports.dailyMovements')}
          </h2>
          {report.recentMovements.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>{t('erp.reports.colDate')}</th>
                    <th className="text-right text-success">{t('erp.reports.colIncoming')}</th>
                    <th className="text-right text-error">{t('erp.reports.colOutgoing')}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.recentMovements.slice(-10).map((mov) => (
                    <tr key={mov.date}>
                      <td>{formatDate(mov.date)}</td>
                      <td className="text-right text-success">
                        {mov.inCount > 0 && t('erp.reports.movementCount', { count: mov.inCount, units: mov.inQuantity })}
                      </td>
                      <td className="text-right text-error">
                        {mov.outCount > 0 && t('erp.reports.movementCount', { count: mov.outCount, units: mov.outQuantity })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-base-content/60">{t('erp.reports.noData')}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Debts Report View
function DebtsReportView({ report }: { report: DebtsReport }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('erp.reports.statActiveDebts')}
          value={formatCurrency(report.totalActiveDebt)}
          icon={Receipt}
          color="error"
          subtext={t('erp.reports.debtsCount', { count: report.activeDebtsCount })}
        />
        <StatCard
          title={t('erp.reports.statPaid')}
          value={formatCurrency(report.totalPaidDebt)}
          icon={Banknote}
          color="success"
          subtext={t('erp.reports.debtsCount', { count: report.paidDebtsCount })}
        />
        <StatCard
          title={t('erp.reports.statOverdue')}
          value={formatCurrency(report.totalOverdueDebt)}
          icon={Clock}
          color="warning"
          subtext={t('erp.reports.debtsCount', { count: report.overdueDebtsCount })}
        />
        <StatCard
          title={t('erp.reports.statAverageDebt')}
          value={formatCurrency(report.averageDebtAmount)}
          icon={TrendingUp}
          color="info"
          subtext={t('erp.reports.paymentsCountSub', { count: report.paymentsCount })}
        />
      </div>

      <div className="surface-card p-6">
        <h2 className="mb-4 text-lg font-semibold">{t('erp.reports.debtAging')}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {report.debtAging.map((aging) => (
            <div key={aging.period} className="rounded-xl bg-base-200/50 p-4 text-center">
              <p className="text-sm text-base-content/60">{aging.period}</p>
              <p className="mt-1 text-xl font-bold">{formatNumber(aging.count)}</p>
              <p className="text-sm text-base-content/70">{formatCurrency(aging.amount)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="surface-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <UserX className="h-5 w-5 text-error" />
            {t('erp.reports.topDebtors')}
          </h2>
          {report.topDebtors.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t('erp.reports.colCustomer')}</th>
                    <th className="text-right">{t('erp.reports.colTotalDebt')}</th>
                    <th className="text-right">{t('erp.reports.colCount')}</th>
                    <th className="text-right">{t('erp.reports.colOverdue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topDebtors.map((debtor, index) => (
                    <tr key={debtor.customerId}>
                      <td>{index + 1}</td>
                      <td>
                        <span className="font-medium">{debtor.customerName}</span>
                        <span className="ml-2 text-xs text-base-content/60">{debtor.customerPhone}</span>
                      </td>
                      <td className="text-right font-semibold text-error">
                        {formatCurrency(debtor.totalDebt)}
                      </td>
                      <td className="text-right">{debtor.debtsCount}</td>
                      <td className="text-right">
                        {debtor.overdueCount > 0 && (
                          <span className="badge badge-warning badge-sm">{debtor.overdueCount}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-success">{t('erp.reports.noDebtors')}</p>
          )}
        </div>

        <div className="surface-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Clock className="h-5 w-5 text-warning" />
            {t('erp.reports.overdueDebts')}
          </h2>
          {report.overdueDebts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>{t('erp.reports.colCustomer')}</th>
                    <th className="text-right">{t('erp.reports.colRemaining')}</th>
                    <th className="text-right">{t('erp.reports.colDaysOverdue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.overdueDebts.slice(0, 10).map((debt) => (
                    <tr key={debt.debtId} className="text-error">
                      <td>
                        <span className="font-medium">{debt.customerName}</span>
                        <span className="ml-2 text-xs text-base-content/60">{debt.customerPhone}</span>
                      </td>
                      <td className="text-right font-semibold">{formatCurrency(debt.remainingAmount)}</td>
                      <td className="text-right">
                        <span className="badge badge-error badge-sm">{t('erp.reports.daysCount', { count: debt.daysOverdue })}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-success">{t('erp.reports.noOverdueDebts')}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="surface-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Banknote className="h-5 w-5 text-success" />
            {t('erp.reports.recentPayments')}
          </h2>
          {report.recentPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>{t('erp.reports.colDate')}</th>
                    <th className="text-right">{t('erp.reports.colCount')}</th>
                    <th className="text-right">{t('erp.reports.colAmount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.recentPayments.slice(0, 10).map((payment) => (
                    <tr key={payment.date}>
                      <td>{formatDate(payment.date)}</td>
                      <td className="text-right">{payment.count}</td>
                      <td className="text-right text-success">{formatCurrency(payment.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-base-content/60">{t('erp.reports.noPayments')}</p>
          )}
        </div>

        <div className="surface-card p-6">
          <h2 className="mb-4 text-lg font-semibold">{t('erp.reports.debtsStatistics')}</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-base-200/50 p-4">
              <span className="text-base-content/70">{t('erp.reports.paymentsReceived')}</span>
              <span className="text-xl font-bold text-success">
                {formatCurrency(report.totalPaymentsReceived)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-base-200/50 p-4">
              <span className="text-base-content/70">{t('erp.reports.paymentsCountLabel')}</span>
              <span className="text-xl font-bold">{formatNumber(report.paymentsCount)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-base-200/50 p-4">
              <span className="text-base-content/70">{t('erp.reports.activePlusOverdue')}</span>
              <span className="text-xl font-bold text-error">
                {formatCurrency(report.totalActiveDebt + report.totalOverdueDebt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtext,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtext?: string;
}) {
  const colorClasses: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    info: 'bg-info/10 text-info',
    secondary: 'bg-secondary/10 text-secondary',
    warning: 'bg-warning/10 text-warning',
    error: 'bg-error/10 text-error',
  };

  return (
    <div className="surface-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-base-content/60">{title}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
          {subtext && <p className="mt-1 text-xs text-base-content/60">{subtext}</p>}
        </div>
        <div className={clsx('rounded-xl p-3', colorClasses[color])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function PaymentMethodCard({
  icon: Icon,
  label,
  amount,
  color,
}: {
  icon: React.ElementType;
  label: string;
  amount: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-base-200/50 p-4">
      <div className={clsx('rounded-lg p-2 text-white', color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-base-content/60">{label}</p>
        <p className="font-semibold">{formatCurrency(amount)}</p>
      </div>
    </div>
  );
}

function SimpleBarChart({ data }: { data: { date: string; revenue: number }[] }) {
  if (data.length === 0) return null;
  const maxRevenue = Math.max(...data.map((d) => d.revenue));

  return (
    <div className="flex h-full items-end gap-1">
      {data.map((day) => {
        const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
        return (
          <div key={day.date} className="group relative flex flex-1 flex-col items-center">
            <div
              className="w-full rounded-t bg-primary transition-all hover:bg-primary/80"
              style={{ height: `${Math.max(height, 2)}%` }}
            />
            <div className="mt-1 text-[10px] text-base-content/60">{formatShortDate(day.date)}</div>
            <div className="absolute bottom-full mb-2 hidden rounded bg-base-300 px-2 py-1 text-xs shadow-lg group-hover:block">
              {formatCurrency(day.revenue)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}.${month}`;
}
