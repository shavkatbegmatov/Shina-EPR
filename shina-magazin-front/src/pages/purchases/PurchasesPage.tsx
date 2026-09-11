import { useCallback, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../utils/apiError';
import { queryKeys } from '../../lib/queryKeys';
import { useInvalidateOnNotification } from '../../hooks/useInvalidateOnNotification';
import {
  Calendar,
  ClipboardCheck,
  FileText,
  Hash,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  ShoppingCart,
  TrendingUp,
  Truck,
  Wallet,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { purchasesApi, type PurchaseFilters } from '../../api/purchases.api';
import { suppliersApi } from '../../api/suppliers.api';
import {
  formatCurrency,
  formatDate,
  formatForeign,
  getTashkentToday,
  getDateDaysAgo,
  getDateMonthsAgo,
  getDateYearsAgo,
  PURCHASE_STATUSES,
} from '../../config/constants';
import { enumLabel } from '@/shared/enumLabel';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ExportButtons } from '../../components/common/ExportButtons';
import { DateRangePicker, type DateRangePreset, type DateRange } from '../../components/common/DateRangePicker';
import { Select } from '../../components/ui/Select';
import { Button } from '@/ui';
import { useHighlight } from '../../hooks/useHighlight';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import { PurchaseFormModal } from '../../components/purchases/PurchaseFormModal';
import type { PurchaseOrder, PurchaseStatus, PaymentStatus } from '../../types';

/** Holat belgisi — rang va matn `PURCHASE_STATUSES` dan (ikkala tilda). */
function StatusBadge({ status, size = 'sm' }: { status: PurchaseStatus; size?: 'sm' | 'md' }) {
  const meta = PURCHASE_STATUSES[status];
  return (
    <span className={clsx('badge', size === 'sm' && 'badge-sm', meta?.color ?? 'badge-ghost')}>
      {enumLabel('purchaseStatus', status)}
    </span>
  );
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={clsx(
        'badge badge-sm',
        status === 'PAID' && 'badge-success',
        status === 'PARTIAL' && 'badge-warning',
        status === 'UNPAID' && 'badge-error'
      )}
    >
      {enumLabel('paymentStatus', status)}
    </span>
  );
}

export function PurchasesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Pagination state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Filter state
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('all');
  const [customRange, setCustomRange] = useState<DateRange>({ start: '', end: '' });
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<PurchaseStatus | ''>('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<PaymentStatus | ''>('');

  // Kirim hujjati oynasi — forma holati oynaning o'zida (yopilganda tozalanadi)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const { highlightId, clearHighlight } = useHighlight();

  // Toshkent timezone da sana oralig'ini hisoblash
  const getDateRangeValues = useCallback((preset: DateRangePreset): { start: string; end: string } | null => {
    if (preset === 'all') {
      return null; // Barcha vaqt uchun - sana filtri yo'q
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

  // Load purchases
  const dateRange = getDateRangeValues(dateRangePreset);
  const listParams: PurchaseFilters = {
    page,
    size: pageSize,
    supplierId: selectedSupplierId,
    status: selectedStatus || undefined,
    startDate: dateRange?.start,
    endDate: dateRange?.end,
  };

  /**
   * Maxsus sana oralig'i to'liq tanlanmaguncha so'rov yubormaymiz.
   *
   * <p>Aks holda foydalanuvchi boshlanish sanasini tanlagan zahoti
   * yarim-tayyor filtr bilan so'rov ketardi.
   */
  const rangeReady = dateRangePreset !== 'custom' || (!!customRange.start && !!customRange.end);

  const purchasesQuery = useQuery({
    queryKey: queryKeys.purchases.list(listParams as never),
    queryFn: () => purchasesApi.getAll(listParams),
    enabled: rangeReady,
    placeholderData: keepPreviousData,
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.purchases.stats(),
    queryFn: () => purchasesApi.getStats(),
  });

  const suppliersQuery = useQuery({
    queryKey: queryKeys.suppliers.active(),
    queryFn: () => suppliersApi.getActive(),
  });

  const purchases = purchasesQuery.data?.content ?? [];
  const totalPages = purchasesQuery.data?.totalPages ?? 0;
  const totalElements = purchasesQuery.data?.totalElements ?? 0;
  const purchaseStats = statsQuery.data ?? null;
  const suppliers = useMemo(() => suppliersQuery.data ?? [], [suppliersQuery.data]);
  const loadError = purchasesQuery.isError ? getApiErrorMessage(purchasesQuery.error) : null;
  const initialLoading = rangeReady && purchasesQuery.isPending;
  const refreshing = purchasesQuery.isFetching && !purchasesQuery.isPending;

  useInvalidateOnNotification([queryKeys.purchases.all]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  const handleDateRangeChange = (preset: DateRangePreset, range?: DateRange) => {
    setDateRangePreset(preset);
    if (range) {
      setCustomRange(range);
    }
    setPage(0);
  };

  const handleClearFilters = () => {
    setSelectedSupplierId(undefined);
    setSelectedStatus('');
    setSelectedPaymentStatus('');
    setDateRangePreset('all');
    setCustomRange({ start: '', end: '' });
    setPage(0);
  };

  const hasActiveFilters = useMemo(() =>
    selectedSupplierId !== undefined ||
    selectedStatus !== '' ||
    selectedPaymentStatus !== '' ||
    dateRangePreset !== 'all',
    [selectedSupplierId, selectedStatus, selectedPaymentStatus, dateRangePreset]
  );

  // Export handler
  const handleExport = async (format: 'excel' | 'pdf') => {
    const dateRange = getDateRangeValues(dateRangePreset);
    await purchasesApi.export.exportData(format, {
      supplierId: selectedSupplierId,
      status: selectedStatus || undefined,
      startDate: dateRange?.start,
      endDate: dateRange?.end,
    });
  };

  // Navigate to detail page
  const handleRowClick = (purchase: PurchaseOrder) => {
    navigate(`/admin/purchases/${purchase.id}`);
  };

  // Table columns
  const columns: Column<PurchaseOrder>[] = useMemo(() => [
    {
      key: 'orderNumber',
      header: t('erp.purchases.colNumber'),
      render: (purchase) => (
        <div>
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-base-content/50" />
            <span className="font-mono font-medium">{purchase.orderNumber}</span>
          </div>
          {purchase.supplierDocNumber && (
            <p className="mt-0.5 pl-6 text-xs text-base-content/60">
              {t('erp.purchases.docNumberShort')}: {purchase.supplierDocNumber}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'orderDate',
      header: t('erp.purchases.colDate'),
      render: (purchase) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-base-content/50" />
          <span>{formatDate(purchase.orderDate)}</span>
        </div>
      ),
    },
    {
      key: 'supplierName',
      header: t('erp.purchases.colSupplier'),
      render: (purchase) => (
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-base-content/50" />
          <span className="font-medium">{purchase.supplierName}</span>
        </div>
      ),
    },
    {
      key: 'items',
      header: t('erp.purchases.colItems'),
      render: (purchase) => (
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-base-content/50" />
            <span>{t('erp.purchases.itemsSummary', { types: purchase.itemCount, units: purchase.totalQuantity })}</span>
          </div>
          {purchase.shortageQuantity > 0 && (
            <span className="mt-1 badge badge-warning badge-xs badge-outline">
              {t('erp.purchases.shortageBadge', { count: purchase.shortageQuantity })}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'totalAmount',
      header: t('common.amount'),
      getValue: (purchase) => purchase.totalAmount,
      render: (purchase) => (
        <div className="text-right sm:text-left">
          <span className="font-semibold">{formatCurrency(purchase.totalAmount)}</span>
          {purchase.currency && purchase.currency !== 'UZS' && purchase.foreignTotalAmount != null && (
            <p className="text-xs text-base-content/60">
              {formatForeign(purchase.foreignTotalAmount, purchase.currency)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'paidAmount',
      header: t('erp.purchases.colPaid'),
      getValue: (purchase) => purchase.paidAmount,
      render: (purchase) => (
        <span className="text-success">{formatCurrency(purchase.paidAmount)}</span>
      ),
    },
    {
      key: 'debtAmount',
      header: t('erp.purchases.colDebt'),
      getValue: (purchase) => purchase.debtAmount,
      render: (purchase) => (
        <span className={clsx(
          'font-medium',
          purchase.debtAmount > 0 ? 'text-error' : 'text-success'
        )}>
          {purchase.debtAmount > 0 ? formatCurrency(purchase.debtAmount) : t('erp.purchases.paidLabel')}
        </span>
      ),
    },
    {
      key: 'paymentStatus',
      header: t('erp.purchases.colPayment'),
      render: (purchase) => <PaymentBadge status={purchase.paymentStatus} />,
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (purchase) => <StatusBadge status={purchase.status} />,
    },
  ], [t]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">{t('erp.purchases.title')}</h1>
          <p className="section-subtitle">{t('erp.purchases.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="pill">{t('erp.purchases.countPill', { count: totalElements })}</span>
          <ExportButtons
            onExportExcel={() => handleExport('excel')}
            onExportPdf={() => handleExport('pdf')}
            disabled={purchases.length === 0}
            loading={refreshing}
          />
          <PermissionGate permission={PermissionCode.PURCHASES_CREATE}>
            <Button variant="primary" onClick={() => setShowPurchaseModal(true)}>
              <Plus className="h-5 w-5" />
              {t('erp.purchases.newPurchase')}
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">{t('erp.purchases.statTotalPurchases')}</p>
              <p className="text-xl font-bold">{purchaseStats?.totalPurchases || 0}</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-info/10 p-2.5">
              <Calendar className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">{t('erp.purchases.statToday')}</p>
              <p className="text-xl font-bold">{purchaseStats?.todayPurchases || 0}</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-secondary/10 p-2.5">
              <FileText className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">{t('erp.purchases.statMonthly')}</p>
              <p className="text-xl font-bold">{purchaseStats?.monthPurchases || 0}</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2.5">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">{t('erp.purchases.statTotalAmount')}</p>
              <p className="text-lg font-bold">{formatCurrency(purchaseStats?.totalAmount || 0)}</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-error/10 p-2.5">
              <Wallet className="h-5 w-5 text-error" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">{t('erp.purchases.statTotalDebt')}</p>
              <p className="text-lg font-bold text-error">{formatCurrency(purchaseStats?.totalDebt || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mol qabul qilishni kutayotgan hujjatlar — omborchi uchun eslatma */}
      {purchaseStats && purchaseStats.awaitingReceipt > 0 && (
        <div className="alert alert-info">
          <ClipboardCheck className="h-5 w-5" />
          <span>
            <strong>{purchaseStats.awaitingReceipt}</strong> {t('erp.purchases.awaitingReceiptSuffix')}
          </span>
        </div>
      )}

      {/* Pending Returns Info */}
      {purchaseStats && purchaseStats.pendingReturns > 0 && (
        <div className="alert alert-warning">
          <RotateCcw className="h-5 w-5" />
          <span>
            <strong>{purchaseStats.pendingReturns}</strong> {t('erp.purchases.pendingReturnsSuffix')}
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="surface-card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            {/* Date Range */}
            <div>
              <span className="block mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                {t('erp.purchases.periodLabel')}
              </span>
              <DateRangePicker
                value={dateRangePreset}
                customRange={customRange}
                onChange={handleDateRangeChange}
              />
            </div>

            {/* Supplier Filter */}
            <Select
              label={t('erp.purchases.supplierLabel')}
              value={selectedSupplierId || ''}
              onChange={(value) => {
                setSelectedSupplierId(value ? Number(value) : undefined);
                setPage(0);
              }}
              placeholder={t('common.all')}
              options={suppliers.map(supplier => ({
                value: supplier.id,
                label: supplier.name,
              }))}
              className="w-44"
            />

            {/* Status Filter */}
            <Select
              label={t('common.status')}
              value={selectedStatus}
              onChange={(value) => {
                setSelectedStatus(value as PurchaseStatus | '');
                setPage(0);
              }}
              placeholder={t('common.all')}
              options={(['ORDERED', 'PARTIAL', 'RECEIVED', 'DRAFT', 'CANCELLED'] as PurchaseStatus[]).map(
                (status) => ({ value: status, label: enumLabel('purchaseStatus', status) })
              )}
              className="w-44"
            />

            {/* Payment Status Filter */}
            <Select
              label={t('erp.purchases.colPayment')}
              value={selectedPaymentStatus}
              onChange={(value) => {
                setSelectedPaymentStatus(value as PaymentStatus | '');
                setPage(0);
              }}
              placeholder={t('common.all')}
              options={[
                { value: 'PAID', label: t('erp.purchases.paymentPaid') },
                { value: 'PARTIAL', label: t('erp.purchases.paymentPartial') },
                { value: 'UNPAID', label: t('erp.purchases.paymentUnpaid') },
              ]}
              className="w-36"
            />
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
              >
                <X className="h-4 w-4" />
                {t('common.clear')}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void purchasesQuery.refetch()}
            >
              <RefreshCw className="h-4 w-4" />
              {t('common.refresh')}
            </Button>
          </div>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="relative">
        {refreshing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-base-100/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <span className="text-sm font-medium text-base-content/70">{t('erp.purchases.refreshing')}</span>
            </div>
          </div>
        )}
        <DataTable
          data={purchases}
          error={loadError}
          onRetry={() => void purchasesQuery.refetch()}
          columns={columns}
          keyExtractor={(purchase) => purchase.id}
          loading={initialLoading && !refreshing}
          highlightId={highlightId}
          onHighlightComplete={clearHighlight}
          emptyIcon={<ShoppingCart className="h-12 w-12" />}
          emptyTitle={t('erp.purchases.emptyTitle')}
          emptyDescription={t('erp.purchases.emptyDescription')}
          onRowClick={handleRowClick}
          rowClassName={(purchase) => clsx(
            'cursor-pointer hover:bg-base-200/50',
            purchase.debtAmount > 0 && 'bg-error/5',
            (purchase.status === 'ORDERED' || purchase.status === 'PARTIAL') && 'bg-info/5'
          )}
          currentPage={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          renderMobileCard={(purchase) => (
            <div
              className="surface-panel flex flex-col gap-3 rounded-xl p-4 cursor-pointer"
              onClick={() => handleRowClick(purchase)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono font-semibold">{purchase.orderNumber}</p>
                  <p className="text-sm font-medium text-base-content/80">{purchase.supplierName}</p>
                  <p className="text-xs text-base-content/60">
                    {formatDate(purchase.orderDate)}
                    {purchase.supplierDocNumber && ` • ${t('erp.purchases.docNumberShort')}: ${purchase.supplierDocNumber}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={purchase.status} />
                  <PaymentBadge status={purchase.paymentStatus} />
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-base-content/70">
                <Package className="h-4 w-4" />
                {t('erp.purchases.itemsSummary', { types: purchase.itemCount, units: purchase.totalQuantity })}
                {purchase.shortageQuantity > 0 && (
                  <span className="badge badge-warning badge-xs badge-outline">
                    {t('erp.purchases.shortageBadge', { count: purchase.shortageQuantity })}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-base-200">
                <div>
                  <p className="text-sm font-semibold">
                    {formatCurrency(purchase.totalAmount)}
                    {purchase.currency && purchase.currency !== 'UZS' && purchase.foreignTotalAmount != null && (
                      <span className="ml-2 text-xs font-normal text-base-content/60">
                        {formatForeign(purchase.foreignTotalAmount, purchase.currency)}
                      </span>
                    )}
                  </p>
                  {purchase.debtAmount > 0 && (
                    <p className="text-xs text-error">{t('erp.purchases.colDebt')}: {formatCurrency(purchase.debtAmount)}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        />
      </div>

      {/* Kirim hujjati — Ta'minotchilar sahifasi bilan bitta oyna */}
      <PurchaseFormModal
        isOpen={showPurchaseModal}
        suppliers={suppliers}
        onClose={() => setShowPurchaseModal(false)}
      />
    </div>
  );
}
