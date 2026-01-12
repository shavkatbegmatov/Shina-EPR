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
import { reportsApi } from '../../api/reports.api';
import { formatCurrency, formatNumber, formatDate } from '../../config/constants';
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

type ReportTab = 'sales' | 'warehouse' | 'debts';

export function ReportsPage() {
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

  const getDateRangeValues = useCallback((preset: DateRangePreset): { start: string; end: string } => {
    const today = new Date();
    const end = today.toISOString().split('T')[0];
    let start: Date;

    switch (preset) {
      case 'today':
        start = today;
        break;
      case 'week':
        start = new Date(today);
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start = new Date(today);
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start = new Date(today);
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start = new Date(today);
        start.setFullYear(start.getFullYear() - 1);
        break;
      case 'custom':
        return { start: customRange.start, end: customRange.end };
      default:
        start = new Date(today);
        start.setMonth(start.getMonth() - 1);
    }

    return { start: start.toISOString().split('T')[0], end };
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
        setError("Iltimos, sana oralig'ini tanlang");
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
      setError('Hisobotlarni yuklashda xatolik yuz berdi');
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [dateRangePreset, getDateRangeValues, initialLoading]);

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
          <h1 className="section-title">Hisobotlar</h1>
          <p className="section-subtitle">Sotuvlar, ombor va qarzlar hisobotlari</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker
            value={dateRangePreset}
            customRange={customRange}
            onChange={handleDateRangeChange}
          />

          <button
            className={clsx(
              'btn btn-sm gap-2 transition-all',
              refreshSuccess ? 'btn-success' : 'btn-outline'
            )}
            onClick={() => loadReports(true)}
            disabled={initialLoading || refreshing}
          >
            {refreshSuccess ? (
              <>
                <Check className="h-4 w-4" />
                Yangilandi
              </>
            ) : (
              <>
                <RefreshCw className={clsx('h-4 w-4', refreshing && 'animate-spin')} />
                {refreshing ? 'Yangilanmoqda...' : 'Yangilash'}
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button className="btn btn-success btn-sm" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </button>
            <button className="btn btn-error btn-sm" onClick={handleExportPDF}>
              <FileDown className="h-4 w-4" />
              PDF
            </button>
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
          Sotuvlar
        </button>
        <button
          className={clsx('tab gap-2', activeTab === 'warehouse' && 'tab-active')}
          onClick={() => setActiveTab('warehouse')}
        >
          <Warehouse className="h-4 w-4" />
          Ombor
        </button>
        <button
          className={clsx('tab gap-2', activeTab === 'debts' && 'tab-active')}
          onClick={() => setActiveTab('debts')}
        >
          <Receipt className="h-4 w-4" />
          Qarzlar
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
              <span className="text-sm font-medium text-base-content/70">Hisobotlar yangilanmoqda...</span>
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
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Jami daromad"
          value={formatCurrency(report.totalRevenue)}
          icon={TrendingUp}
          color="success"
        />
        <StatCard
          title="Jami foyda"
          value={formatCurrency(report.totalProfit)}
          icon={Banknote}
          color="primary"
        />
        <StatCard
          title="Sotuvlar soni"
          value={formatNumber(report.completedSalesCount)}
          icon={ShoppingCart}
          color="info"
          subtext={`Bekor qilingan: ${report.cancelledSalesCount}`}
        />
        <StatCard
          title="O'rtacha sotuv"
          value={formatCurrency(report.averageSaleAmount)}
          icon={TrendingUp}
          color="secondary"
        />
      </div>

      <div className="surface-card p-6">
        <h2 className="mb-4 text-lg font-semibold">To'lov usullari bo'yicha</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PaymentMethodCard icon={Banknote} label="Naqd" amount={report.cashTotal} color="bg-green-500" />
          <PaymentMethodCard icon={CreditCard} label="Karta" amount={report.cardTotal} color="bg-blue-500" />
          <PaymentMethodCard icon={Building2} label="O'tkazma" amount={report.transferTotal} color="bg-purple-500" />
          <PaymentMethodCard icon={AlertCircle} label="Qarz" amount={report.debtTotal} color="bg-orange-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="surface-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Kunlik sotuvlar</h2>
          {report.dailyData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th className="text-right">Sotuvlar</th>
                    <th className="text-right">Daromad</th>
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
            <p className="text-base-content/60">Ma'lumot mavjud emas</p>
          )}
        </div>

        <div className="surface-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Daromad grafigi</h2>
          {report.dailyData.length > 0 ? (
            <div className="h-64">
              <SimpleBarChart data={report.dailyData.slice(-14)} />
            </div>
          ) : (
            <p className="text-base-content/60">Ma'lumot mavjud emas</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="surface-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Package className="h-5 w-5" />
            Top mahsulotlar
          </h2>
          {report.topProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Mahsulot</th>
                    <th className="text-right">Sotildi</th>
                    <th className="text-right">Daromad</th>
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
                      <td className="text-right">{product.quantitySold} dona</td>
                      <td className="text-right">{formatCurrency(product.totalRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-base-content/60">Ma'lumot mavjud emas</p>
          )}
        </div>

        <div className="surface-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5" />
            Top mijozlar
          </h2>
          {report.topCustomers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Mijoz</th>
                    <th className="text-right">Xaridlar</th>
                    <th className="text-right">Jami</th>
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
            <p className="text-base-content/60">Ma'lumot mavjud emas</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Warehouse Report View
function WarehouseReportView({ report }: { report: WarehouseReport }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Jami mahsulotlar"
          value={formatNumber(report.totalProducts)}
          icon={Package}
          color="primary"
          subtext={`Omborda: ${formatNumber(report.totalStock)} dona`}
        />
        <StatCard
          title="Ombor qiymati"
          value={formatCurrency(report.totalStockValue)}
          icon={Banknote}
          color="success"
          subtext={`Potensial: ${formatCurrency(report.totalPotentialRevenue)}`}
        />
        <StatCard
          title="Kam qolgan"
          value={formatNumber(report.lowStockCount)}
          icon={AlertTriangle}
          color="warning"
          subtext={`Tugagan: ${report.outOfStockCount}`}
        />
        <StatCard
          title="Harakatlar"
          value={`${report.inMovementsCount} / ${report.outMovementsCount}`}
          icon={ArrowDownToLine}
          color="info"
          subtext={`Kirim: ${report.totalIncoming}, Chiqim: ${report.totalOutgoing}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="surface-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Tag className="h-5 w-5" />
            Kategoriya bo'yicha
          </h2>
          {report.stockByCategory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Kategoriya</th>
                    <th className="text-right">Mahsulotlar</th>
                    <th className="text-right">Omborda</th>
                    <th className="text-right">Qiymati</th>
                  </tr>
                </thead>
                <tbody>
                  {report.stockByCategory.map((cat) => (
                    <tr key={cat.categoryId}>
                      <td className="font-medium">{cat.categoryName}</td>
                      <td className="text-right">{cat.productCount}</td>
                      <td className="text-right">{formatNumber(cat.totalStock)} dona</td>
                      <td className="text-right">{formatCurrency(cat.stockValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-base-content/60">Ma'lumot mavjud emas</p>
          )}
        </div>

        <div className="surface-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Package className="h-5 w-5" />
            Brend bo'yicha
          </h2>
          {report.stockByBrand.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Brend</th>
                    <th className="text-right">Mahsulotlar</th>
                    <th className="text-right">Omborda</th>
                    <th className="text-right">Qiymati</th>
                  </tr>
                </thead>
                <tbody>
                  {report.stockByBrand.map((brand) => (
                    <tr key={brand.brandId}>
                      <td className="font-medium">{brand.brandName}</td>
                      <td className="text-right">{brand.productCount}</td>
                      <td className="text-right">{formatNumber(brand.totalStock)} dona</td>
                      <td className="text-right">{formatCurrency(brand.stockValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-base-content/60">Ma'lumot mavjud emas</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="surface-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Kam qolgan mahsulotlar
          </h2>
          {report.lowStockProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Mahsulot</th>
                    <th className="text-right">Hozirgi</th>
                    <th className="text-right">Minimal</th>
                    <th className="text-right">Narxi</th>
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
            <p className="text-success">Barcha mahsulotlar yetarli miqdorda</p>
          )}
        </div>

        <div className="surface-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <ArrowUpFromLine className="h-5 w-5" />
            Kunlik harakatlar
          </h2>
          {report.recentMovements.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th className="text-right text-success">Kirim</th>
                    <th className="text-right text-error">Chiqim</th>
                  </tr>
                </thead>
                <tbody>
                  {report.recentMovements.slice(-10).map((mov) => (
                    <tr key={mov.date}>
                      <td>{formatDate(mov.date)}</td>
                      <td className="text-right text-success">
                        {mov.inCount > 0 && `${mov.inCount} ta (${mov.inQuantity} dona)`}
                      </td>
                      <td className="text-right text-error">
                        {mov.outCount > 0 && `${mov.outCount} ta (${mov.outQuantity} dona)`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-base-content/60">Ma'lumot mavjud emas</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Debts Report View
function DebtsReportView({ report }: { report: DebtsReport }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Faol qarzlar"
          value={formatCurrency(report.totalActiveDebt)}
          icon={Receipt}
          color="error"
          subtext={`${report.activeDebtsCount} ta qarz`}
        />
        <StatCard
          title="To'langan"
          value={formatCurrency(report.totalPaidDebt)}
          icon={Banknote}
          color="success"
          subtext={`${report.paidDebtsCount} ta qarz`}
        />
        <StatCard
          title="Muddati o'tgan"
          value={formatCurrency(report.totalOverdueDebt)}
          icon={Clock}
          color="warning"
          subtext={`${report.overdueDebtsCount} ta qarz`}
        />
        <StatCard
          title="O'rtacha qarz"
          value={formatCurrency(report.averageDebtAmount)}
          icon={TrendingUp}
          color="info"
          subtext={`To'lovlar: ${report.paymentsCount} ta`}
        />
      </div>

      <div className="surface-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Qarz davrlari (Aging)</h2>
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
            Top qarzdorlar
          </h2>
          {report.topDebtors.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Mijoz</th>
                    <th className="text-right">Jami qarz</th>
                    <th className="text-right">Soni</th>
                    <th className="text-right">Kechikkan</th>
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
            <p className="text-success">Qarzdorlar yo'q</p>
          )}
        </div>

        <div className="surface-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Clock className="h-5 w-5 text-warning" />
            Muddati o'tgan qarzlar
          </h2>
          {report.overdueDebts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Mijoz</th>
                    <th className="text-right">Qoldiq</th>
                    <th className="text-right">O'tgan kunlar</th>
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
                        <span className="badge badge-error badge-sm">{debt.daysOverdue} kun</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-success">Muddati o'tgan qarzlar yo'q</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="surface-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Banknote className="h-5 w-5 text-success" />
            So'nggi to'lovlar
          </h2>
          {report.recentPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th className="text-right">Soni</th>
                    <th className="text-right">Miqdori</th>
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
            <p className="text-base-content/60">To'lovlar mavjud emas</p>
          )}
        </div>

        <div className="surface-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Qarzlar statistikasi</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-base-200/50 p-4">
              <span className="text-base-content/70">Qabul qilingan to'lovlar</span>
              <span className="text-xl font-bold text-success">
                {formatCurrency(report.totalPaymentsReceived)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-base-200/50 p-4">
              <span className="text-base-content/70">To'lovlar soni</span>
              <span className="text-xl font-bold">{formatNumber(report.paymentsCount)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-base-200/50 p-4">
              <span className="text-base-content/70">Faol + Muddati o'tgan</span>
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
