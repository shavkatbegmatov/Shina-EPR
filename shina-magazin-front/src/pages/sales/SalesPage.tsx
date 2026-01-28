import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Receipt, Eye, XCircle, Calendar, User, X, CreditCard, Banknote, ArrowRightLeft, Layers } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { salesApi } from '../../api/sales.api';
import {
  formatCurrency,
  formatDateTime,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  SALE_STATUSES,
  getDateDaysAgo,
  getDateMonthsAgo,
  getDateYearsAgo,
  getTashkentToday,
} from '../../config/constants';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Select } from '../../components/ui/Select';
import { ModalPortal } from '../../components/common/Modal';
import { DateRangePicker, type DateRangePreset, type DateRange } from '../../components/common/DateRangePicker';
import { SearchInput } from '../../components/ui/SearchInput';
import { ExportButtons } from '../../components/common/ExportButtons';
import { useHighlight } from '../../hooks/useHighlight';
import { PermissionGate } from '../../components/common/PermissionGate';
import { usePermission, PermissionCode } from '../../hooks/usePermission';
import type { Sale, PaymentStatus, SaleStatus, PaymentMethod } from '../../types';
import { useNotificationsStore } from '../../store/notificationsStore';

const paymentMethodIcons: Record<PaymentMethod, React.ReactNode> = {
  CASH: <Banknote className="h-4 w-4" />,
  CARD: <CreditCard className="h-4 w-4" />,
  TRANSFER: <ArrowRightLeft className="h-4 w-4" />,
  MIXED: <Layers className="h-4 w-4" />,
};

export function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState('');
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('all');
  const [customRange, setCustomRange] = useState<DateRange>({ start: '', end: '' });
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatus | ''>('');
  const [statusFilter, setStatusFilter] = useState<SaleStatus | ''>('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const { notifications } = useNotificationsStore();
  const { highlightId, clearHighlight } = useHighlight();
  const { hasPermission } = usePermission();

  const hasFilters = useMemo(
    () => (
      search.trim().length > 0
      || paymentStatusFilter !== ''
      || statusFilter !== ''
      || dateRangePreset !== 'all'
    ),
    [search, paymentStatusFilter, statusFilter, dateRangePreset]
  );

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  const getDateRangeValues = useCallback((preset: DateRangePreset): { start: string; end: string } | null => {
    if (preset === 'all') {
      return null;
    }

    const end = getTashkentToday();

    switch (preset) {
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
        return null;
      default:
        return null;
    }
  }, [customRange.start, customRange.end]);

  const handleDateRangeChange = (preset: DateRangePreset, range?: DateRange) => {
    setDateRangePreset(preset);
    if (preset === 'custom' && range) {
      setCustomRange(range);
    }
    if (preset !== 'custom') {
      setCustomRange({ start: '', end: '' });
    }
    setPage(0);
  };

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      if (search.trim() && !sale.invoiceNumber.toLowerCase().includes(search.toLowerCase())) return false;
      if (paymentStatusFilter && sale.paymentStatus !== paymentStatusFilter) return false;
      if (statusFilter && sale.status !== statusFilter) return false;
      return true;
    });
  }, [sales, search, paymentStatusFilter, statusFilter]);

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    const styles: Record<PaymentStatus, string> = { PAID: 'badge-success', PARTIAL: 'badge-warning', UNPAID: 'badge-error' };
    return <span className={clsx('badge badge-sm', styles[status])}>{PAYMENT_STATUSES[status]?.label}</span>;
  };

  const getSaleStatusBadge = (status: SaleStatus) => {
    const styles: Record<SaleStatus, string> = { COMPLETED: 'badge-success badge-outline', CANCELLED: 'badge-error badge-outline', REFUNDED: 'badge-warning badge-outline' };
    return <span className={clsx('badge badge-sm', styles[status])}>{SALE_STATUSES[status]?.label}</span>;
  };

  const handleViewSale = async (sale: Sale) => {
    setSelectedSale(sale);
    setShowDetailModal(true);
    if (!sale.items || sale.items.length === 0) {
      setLoadingDetails(true);
      try {
        const fullSale = await salesApi.getById(sale.id);
        setSelectedSale(fullSale);
      } catch (error) {
        console.error('Failed to load sale details:', error);
        toast.error('Sotuv tafsilotlarini yuklashda xatolik');
      } finally {
        setLoadingDetails(false);
      }
    }
  };

  const handleOpenCancelModal = (sale: Sale) => {
    setSelectedSale(sale);
    setShowCancelModal(true);
  };

  // Table columns
  const columns: Column<Sale>[] = useMemo(() => [
    {
      key: 'invoiceNumber',
      header: 'Faktura',
      render: (sale) => (
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" />
          <span className="font-mono text-sm">{sale.invoiceNumber}</span>
        </div>
      ),
    },
    {
      key: 'saleDate',
      header: 'Sana',
      render: (sale) => (
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-base-content/50" />
          {formatDateTime(sale.saleDate)}
        </div>
      ),
    },
    {
      key: 'customerName',
      header: 'Mijoz',
      render: (sale) => sale.customerName ? (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-base-content/50" />
          <div>
            <div className="font-medium">{sale.customerName}</div>
            {sale.customerPhone && <div className="text-xs text-base-content/60">{sale.customerPhone}</div>}
          </div>
        </div>
      ) : <span className="text-base-content/50">-</span>,
    },
    {
      key: 'totalAmount',
      header: 'Summa',
      render: (sale) => (
        <div>
          <div className="font-semibold">{formatCurrency(sale.totalAmount)}</div>
          {sale.debtAmount > 0 && <div className="text-xs text-error">Qarz: {formatCurrency(sale.debtAmount)}</div>}
        </div>
      ),
    },
    {
      key: 'paymentMethod',
      header: "To'lov usuli",
      render: (sale) => (
        <div className="flex items-center gap-1.5">
          {paymentMethodIcons[sale.paymentMethod]}
          <span className="text-sm">{PAYMENT_METHODS[sale.paymentMethod]?.label}</span>
        </div>
      ),
    },
    {
      key: 'paymentStatus',
      header: "To'lov holati",
      render: (sale) => getPaymentStatusBadge(sale.paymentStatus),
    },
    {
      key: 'status',
      header: 'Holat',
      render: (sale) => getSaleStatusBadge(sale.status),
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      render: (sale) => (
        <div className="flex items-center gap-1">
          <PermissionGate permission={PermissionCode.SALES_VIEW}>
            <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); handleViewSale(sale); }} title="Ko'rish">
              <Eye className="h-4 w-4" />
            </button>
          </PermissionGate>
          {sale.status === 'COMPLETED' && (
            <PermissionGate permission={PermissionCode.SALES_UPDATE}>
              <button className="btn btn-ghost btn-sm text-error" onClick={(e) => { e.stopPropagation(); handleOpenCancelModal(sale); }} title="Bekor qilish">
                <XCircle className="h-4 w-4" />
              </button>
            </PermissionGate>
          )}
        </div>
      ),
    },
  ], []);

  const loadSales = useCallback(async (isInitial = false) => {
    if (!isInitial) {
      setRefreshing(true);
    }
    try {
      const dateRange = getDateRangeValues(dateRangePreset);
      const data = await salesApi.getAll({
        page,
        size: pageSize,
        sort: 'saleDate,desc',
        startDate: dateRange?.start,
        endDate: dateRange?.end,
      });
      setSales(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (error) {
      console.error('Failed to load sales:', error);
      toast.error('Sotuvlarni yuklashda xatolik');
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, dateRangePreset, getDateRangeValues]);

  useEffect(() => {
    loadSales(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when page/pageSize or date range changes
  useEffect(() => {
    void loadSales();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, dateRangePreset, customRange.start, customRange.end]);

  // WebSocket orqali yangi notification kelganda sotuvlarni yangilash
  useEffect(() => {
    if (notifications.length > 0) {
      void loadSales();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.length]);

  const handleResetFilters = () => {
    setSearch('');
    setPaymentStatusFilter('');
    setStatusFilter('');
    setDateRangePreset('all');
    setCustomRange({ start: '', end: '' });
    setPage(0);
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    const dateRange = getDateRangeValues(dateRangePreset);
    await salesApi.export.exportData(format, {
      startDate: dateRange?.start,
      endDate: dateRange?.end,
    });
  };

  const handleCancelSale = async () => {
    if (!selectedSale) return;

    // Check permission before API call
    if (!hasPermission(PermissionCode.SALES_UPDATE)) {
      toast.error("Sizda bu amalni bajarish huquqi yo'q", {
        icon: '🔒',
      });
      return;
    }

    setCancelling(true);
    try {
      await salesApi.cancel(selectedSale.id);
      toast.success('Sotuv bekor qilindi');
      setShowCancelModal(false);
      setSelectedSale(null);
      void loadSales();
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { message?: string } } };
      // Skip toast for 403 errors (axios interceptor handles them)
      if (err.response?.status !== 403) {
        toast.error(err.response?.data?.message || 'Sotuvni bekor qilishda xatolik');
      }
      console.error('Failed to cancel sale:', error);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">Sotuvlar</h1>
          <p className="section-subtitle">Sotuvlar tarixi</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill">{totalElements} ta sotuv</span>
          <ExportButtons
            onExportExcel={() => handleExport('excel')}
            onExportPdf={() => handleExport('pdf')}
            disabled={sales.length === 0}
            loading={refreshing}
          />
          <PermissionGate permission={PermissionCode.SALES_CREATE}>
            <Link to="/pos" className="btn btn-primary">
              <ShoppingCart className="h-5 w-5" />
              Kassa (POS)
            </Link>
          </PermissionGate>
        </div>
      </div>

      {/* Filters */}
      <div className="surface-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/50">Filtrlar</h2>
            <p className="text-xs text-base-content/60">{hasFilters ? "Filtrlangan natijalar ko'rsatilmoqda" : 'Barcha sotuvlar'}</p>
          </div>
          {hasFilters && (
            <button className="btn btn-ghost btn-sm" onClick={handleResetFilters}>
              <X className="h-4 w-4" />
              Tozalash
            </button>
          )}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="block mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
              Davr
            </span>
            <DateRangePicker
              value={dateRangePreset}
              customRange={customRange}
              onChange={handleDateRangeChange}
            />
          </div>
          <SearchInput
            value={search}
            onValueChange={setSearch}
            label="Faktura raqami"
            placeholder="INV... bo'yicha qidirish"
          />
          <Select
            label="To'lov holati"
            value={paymentStatusFilter || undefined}
            onChange={(val) => setPaymentStatusFilter((val as PaymentStatus | '') || '')}
            options={[
              { value: '', label: 'Barchasi' },
              ...Object.values(PAYMENT_STATUSES).map((status) => ({
                value: status.value,
                label: status.label,
              })),
            ]}
            placeholder="Barchasi"
          />
          <Select
            label="Sotuv holati"
            value={statusFilter || undefined}
            onChange={(val) => setStatusFilter((val as SaleStatus | '') || '')}
            options={[
              { value: '', label: 'Barchasi' },
              ...Object.values(SALE_STATUSES).map((status) => ({
                value: status.value,
                label: status.label,
              })),
            ]}
            placeholder="Barchasi"
          />
        </div>
      </div>

      {/* Sales Table */}
      <div className="relative">
        {refreshing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-base-100/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <span className="text-sm font-medium text-base-content/70">Yangilanmoqda...</span>
            </div>
          </div>
        )}
        <DataTable
          data={filteredSales}
          columns={columns}
          keyExtractor={(sale) => sale.id}
          loading={initialLoading && !refreshing}
          highlightId={highlightId}
          onHighlightComplete={clearHighlight}
          emptyIcon={<Receipt className="h-12 w-12" />}
          emptyTitle="Sotuvlar topilmadi"
          emptyDescription="Filtrlarni o'zgartiring yoki yangi sotuv qiling"
          rowClassName={(sale) => (sale.status === 'CANCELLED' ? 'opacity-60' : '')}
        currentPage={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        renderMobileCard={(sale) => (
          <div className={clsx('surface-panel flex flex-col gap-3 rounded-xl p-4', sale.status === 'CANCELLED' && 'opacity-60')}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  <span className="font-mono text-sm font-medium">{sale.invoiceNumber}</span>
                </div>
                <p className="mt-1 text-xs text-base-content/60">{formatDateTime(sale.saleDate)}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {getPaymentStatusBadge(sale.paymentStatus)}
                {getSaleStatusBadge(sale.status)}
              </div>
            </div>
            {sale.customerName && (
              <div className="flex items-center gap-2 text-sm text-base-content/70">
                <User className="h-4 w-4" />
                {sale.customerName}
              </div>
            )}
            <div className="flex items-center justify-between border-t border-base-200 pt-3">
              <div>
                <div className="font-semibold">{formatCurrency(sale.totalAmount)}</div>
                {sale.debtAmount > 0 && <div className="text-xs text-error">Qarz: {formatCurrency(sale.debtAmount)}</div>}
              </div>
              <div className="flex items-center gap-1">
                <button className="btn btn-ghost btn-sm" onClick={() => handleViewSale(sale)}>
                  <Eye className="h-4 w-4" />
                  Ko'rish
                </button>
                {sale.status === 'COMPLETED' && (
                  <PermissionGate permission={PermissionCode.SALES_REFUND}>
                    <button className="btn btn-ghost btn-sm text-error" onClick={() => handleOpenCancelModal(sale)}>
                      <XCircle className="h-4 w-4" />
                    </button>
                  </PermissionGate>
                )}
              </div>
            </div>
          </div>
        )}
      />
      </div>

      {/* Sale Detail Modal */}
      <ModalPortal isOpen={showDetailModal && !!selectedSale} onClose={() => { setShowDetailModal(false); setSelectedSale(null); }}>
        {selectedSale && (
          <div className="w-full max-w-2xl bg-base-100 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <button className="btn btn-circle btn-ghost btn-sm absolute right-4 top-4" onClick={() => { setShowDetailModal(false); setSelectedSale(null); }}>
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-lg font-bold">Sotuv tafsilotlari</h3>
              <p className="text-sm text-base-content/60">Faktura: {selectedSale.invoiceNumber}</p>

              <div className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="surface-soft rounded-lg p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-base-content/50">Sana</p>
                    <p className="mt-1 font-medium">{formatDateTime(selectedSale.saleDate)}</p>
                  </div>
                  <div className="surface-soft rounded-lg p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-base-content/50">Mijoz</p>
                    <p className="mt-1 font-medium">{selectedSale.customerName || "Noma'lum mijoz"}</p>
                    {selectedSale.customerPhone && <p className="text-sm text-base-content/60">{selectedSale.customerPhone}</p>}
                  </div>
                  <div className="surface-soft rounded-lg p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-base-content/50">To'lov usuli</p>
                    <div className="mt-1 flex items-center gap-2">
                      {paymentMethodIcons[selectedSale.paymentMethod]}
                      <span className="font-medium">{PAYMENT_METHODS[selectedSale.paymentMethod]?.label}</span>
                    </div>
                  </div>
                  <div className="surface-soft rounded-lg p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-base-content/50">Sotuvchi</p>
                    <p className="mt-1 font-medium">{selectedSale.createdByName || '-'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-base-content/50">Mahsulotlar</h4>
                  {loadingDetails ? (
                    <div className="flex items-center justify-center py-8"><span className="loading loading-spinner" /></div>
                  ) : selectedSale.items && selectedSale.items.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Mahsulot</th>
                            <th className="text-right">Narx</th>
                            <th className="text-right">Soni</th>
                            <th className="text-right">Jami</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedSale.items.map((item, index) => (
                            <tr key={item.id || index}>
                              <td>
                                <div>
                                  <div className="font-medium">{item.productName}</div>
                                  {item.sizeString && <div className="text-xs text-base-content/60">{item.sizeString}</div>}
                                </div>
                              </td>
                              <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                              <td className="text-right">{item.quantity}</td>
                              <td className="text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-sm text-base-content/50 py-4">Mahsulotlar mavjud emas</p>
                  )}
                </div>

                <div className="border-t border-base-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-base-content/70">Jami:</span>
                    <span>{formatCurrency(selectedSale.subtotal)}</span>
                  </div>
                  {(selectedSale.discountAmount > 0 || selectedSale.discountPercent > 0) && (
                    <div className="flex justify-between text-sm text-error">
                      <span>Chegirma{selectedSale.discountPercent > 0 && ` (${selectedSale.discountPercent}%)`}:</span>
                      <span>-{formatCurrency(selectedSale.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold">
                    <span>Umumiy:</span>
                    <span>{formatCurrency(selectedSale.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-base-content/70">To'langan:</span>
                    <span className="text-success">{formatCurrency(selectedSale.paidAmount)}</span>
                  </div>
                  {selectedSale.debtAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-base-content/70">Qarz:</span>
                      <span className="text-error">{formatCurrency(selectedSale.debtAmount)}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {getPaymentStatusBadge(selectedSale.paymentStatus)}
                  {getSaleStatusBadge(selectedSale.status)}
                </div>

                {selectedSale.notes && (
                  <div className="surface-soft rounded-lg p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-base-content/50">Izoh</p>
                    <p className="mt-1 text-sm">{selectedSale.notes}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button className="btn" onClick={() => { setShowDetailModal(false); setSelectedSale(null); }}>Yopish</button>
              </div>
            </div>
          </div>
        )}
      </ModalPortal>

      {/* Cancel Confirmation Modal */}
      <ModalPortal isOpen={showCancelModal && !!selectedSale} onClose={() => { if (!cancelling) { setShowCancelModal(false); setSelectedSale(null); } }}>
        {selectedSale && (
          <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl relative">
            <div className="p-4 sm:p-6">
              <button
                className="btn btn-circle btn-ghost btn-sm absolute right-4 top-4"
                onClick={() => { setShowCancelModal(false); setSelectedSale(null); }}
                disabled={cancelling}
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-lg font-bold text-error">Sotuvni bekor qilish</h3>
              <p className="mt-4 text-base-content/70">
                Haqiqatan ham <span className="font-semibold">{selectedSale.invoiceNumber}</span> raqamli sotuvni bekor qilmoqchimisiz?
              </p>
              <p className="mt-2 text-sm text-base-content/60">Bu amal mahsulotlar zahirasini qaytaradi va sotuvni bekor qilingan deb belgilaydi.</p>
              <div className="mt-6 flex justify-end gap-2">
                <button className="btn" onClick={() => { setShowCancelModal(false); setSelectedSale(null); }} disabled={cancelling}>Yo'q, ortga</button>
                <button className="btn btn-error" onClick={handleCancelSale} disabled={cancelling}>
                  {cancelling && <span className="loading loading-spinner loading-sm" />}
                  Ha, bekor qilish
                </button>
              </div>
            </div>
          </div>
        )}
      </ModalPortal>
    </div>
  );
}
