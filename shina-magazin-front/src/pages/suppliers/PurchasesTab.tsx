import { useMemo } from 'react';
import { Calendar, Package, ShoppingCart, TrendingUp, Truck, Wallet } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate } from '../../config/constants';
import { DataTable, Column } from '../../components/ui/DataTable';
import { StatTile } from './StatTile';
import type { usePurchasesData } from './usePurchasesData';
import type { PurchaseOrder } from '../../types';

interface Props {
  data: ReturnType<typeof usePurchasesData>;
}

/** Holat rangi — jadval va mobil kartada bir xil. */
const statusBadge = (status: PurchaseOrder['status']) =>
  clsx(
    'badge badge-sm',
    status === 'RECEIVED' && 'badge-success',
    status === 'DRAFT' && 'badge-warning',
    status === 'CANCELLED' && 'badge-error'
  );

/** Xaridlar bo'limi: statistika va jadval. */
export function PurchasesTab({ data }: Props) {
  const { t } = useTranslation();

  const columns: Column<PurchaseOrder>[] = useMemo(
    () => [
      {
        key: 'orderDate',
        header: t('erp.suppliers.colDate'),
        render: (purchase) => (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-base-content/50" />
            <span>{formatDate(purchase.orderDate)}</span>
          </div>
        ),
      },
      {
        key: 'supplierName',
        header: t('erp.suppliers.colSupplier'),
        render: (purchase) => (
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-base-content/50" />
            <span className="font-medium">{purchase.supplierName}</span>
          </div>
        ),
      },
      {
        key: 'items',
        header: t('erp.suppliers.colProducts'),
        render: (purchase) => (
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-base-content/50" />
            <span>
              {t('erp.suppliers.itemsSummary', {
                types: purchase.itemCount,
                quantity: purchase.totalQuantity,
              })}
            </span>
          </div>
        ),
      },
      {
        key: 'totalAmount',
        header: t('common.amount'),
        getValue: (purchase) => purchase.totalAmount,
        render: (purchase) => (
          <span className="font-semibold">{formatCurrency(purchase.totalAmount)}</span>
        ),
      },
      {
        key: 'debtAmount',
        header: t('erp.suppliers.colDebt'),
        getValue: (purchase) => purchase.debtAmount,
        render: (purchase) => (
          <span
            className={clsx(
              'font-medium',
              purchase.debtAmount > 0 ? 'text-error' : 'text-success'
            )}
          >
            {purchase.debtAmount > 0
              ? formatCurrency(purchase.debtAmount)
              : t('erp.suppliers.paid')}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (purchase) => (
          <span className={statusBadge(purchase.status)}>
            {purchase.status === 'RECEIVED' && t('erp.suppliers.statusReceived')}
            {purchase.status === 'DRAFT' && t('erp.suppliers.statusDraft')}
            {purchase.status === 'CANCELLED' && t('erp.suppliers.statusCancelled')}
          </span>
        ),
      },
    ],
    [t]
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={ShoppingCart}
          tone="primary"
          label={t('erp.suppliers.statTotalPurchases')}
          value={data.stats?.totalPurchases || 0}
        />
        <StatTile
          icon={Calendar}
          tone="info"
          label={t('erp.suppliers.statTodayPurchases')}
          value={data.stats?.todayPurchases || 0}
        />
        <StatTile
          icon={TrendingUp}
          tone="success"
          label={t('erp.suppliers.statTotalAmount')}
          value={formatCurrency(data.stats?.totalAmount || 0)}
        />
        <StatTile
          icon={Wallet}
          tone="error"
          label={t('erp.suppliers.statTotalDebt')}
          value={formatCurrency(data.stats?.totalDebt || 0)}
          valueClassName="text-error"
        />
      </div>

      <div className="relative">
        {data.refreshing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-base-100/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <span className="text-sm font-medium text-base-content/70">
                {t('erp.suppliers.refreshing')}
              </span>
            </div>
          </div>
        )}
        <DataTable
          data={data.purchases}
          error={data.loadError}
          onRetry={() => data.load(true)}
          columns={columns}
          keyExtractor={(purchase) => purchase.id}
          loading={data.initialLoading}
          emptyIcon={<ShoppingCart className="h-12 w-12" />}
          emptyTitle={t('erp.suppliers.purchasesEmptyTitle')}
          emptyDescription={t('erp.suppliers.purchasesEmptyDescription')}
          currentPage={data.page}
          totalPages={data.totalPages}
          totalElements={data.totalElements}
          pageSize={data.pageSize}
          onPageChange={data.setPage}
          onPageSizeChange={data.changePageSize}
          renderMobileCard={(purchase) => (
            <div className="surface-panel flex flex-col gap-3 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{purchase.supplierName}</p>
                  <p className="text-xs text-base-content/60">{formatDate(purchase.orderDate)}</p>
                </div>
                <span className={statusBadge(purchase.status)}>
                  {purchase.status === 'RECEIVED' && t('erp.suppliers.statusReceivedShort')}
                  {purchase.status === 'DRAFT' && t('erp.suppliers.statusDraftShort')}
                  {purchase.status === 'CANCELLED' && t('erp.suppliers.statusCancelledShort')}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-base-content/70">
                <Package className="h-4 w-4" />
                {t('erp.suppliers.itemsSummary', {
                  types: purchase.itemCount,
                  quantity: purchase.totalQuantity,
                })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-base-200">
                <div>
                  <p className="text-sm font-semibold">{formatCurrency(purchase.totalAmount)}</p>
                  {purchase.debtAmount > 0 && (
                    <p className="text-xs text-error">
                      {t('erp.suppliers.debtLabel', {
                        amount: formatCurrency(purchase.debtAmount),
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        />
      </div>
    </>
  );
}
