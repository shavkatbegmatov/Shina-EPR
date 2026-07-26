import { useMemo } from 'react';
import { AlertTriangle, CreditCard, Mail, MapPin, Phone, Truck, Users, Wallet } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui';
import { formatCurrency } from '../../config/constants';
import { DataTable, Column } from '../../components/ui/DataTable';
import { SearchInput } from '../../components/ui/SearchInput';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import { StatTile } from './StatTile';
import type { useSuppliersData } from './useSuppliersData';
import type { Supplier } from '../../types';

interface Props {
  data: ReturnType<typeof useSuppliersData>;
  /** `useHighlight` string ham qaytarishi mumkin (URL parametridan). */
  highlightId: string | number | null;
  onHighlightComplete: () => void;
  onEdit: (supplier: Supplier) => void;
}

/** Ta'minotchilar bo'limi: statistika, qidiruv va jadval. */
export function SuppliersTab({ data, highlightId, onHighlightComplete, onEdit }: Props) {
  const { t } = useTranslation();
  const hasSearch = data.search.trim().length > 0;

  const columns: Column<Supplier>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('erp.suppliers.colSupplier'),
        render: (supplier) => (
          <div className="flex items-center gap-3">
            <div className="avatar placeholder">
              <div className="w-10 rounded-full bg-primary/15 text-primary">
                <span>{supplier.name.charAt(0).toUpperCase()}</span>
              </div>
            </div>
            <div>
              <div className="font-medium">{supplier.name}</div>
              {supplier.contactPerson && (
                <div className="text-sm text-base-content/70">{supplier.contactPerson}</div>
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'phone',
        header: t('erp.suppliers.colContact'),
        render: (supplier) => (
          <div className="space-y-1">
            {supplier.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-base-content/50" />
                <span className="text-sm">{supplier.phone}</span>
              </div>
            )}
            {supplier.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-base-content/50" />
                <span className="text-sm text-base-content/70">{supplier.email}</span>
              </div>
            )}
            {!supplier.phone && !supplier.email && (
              <span className="text-sm text-base-content/50">—</span>
            )}
          </div>
        ),
      },
      {
        key: 'address',
        header: t('erp.suppliers.colAddress'),
        className: 'max-w-xs',
        render: (supplier) =>
          supplier.address ? (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-base-content/50 mt-0.5 shrink-0" />
              <span className="text-sm truncate">{supplier.address}</span>
            </div>
          ) : (
            <span className="text-sm text-base-content/50">—</span>
          ),
      },
      {
        key: 'balance',
        header: t('erp.suppliers.colBalance'),
        getValue: (supplier) => supplier.balance,
        render: (supplier) => (
          <div>
            <span
              className={clsx(
                'font-medium',
                supplier.balance > 0 && 'text-error',
                supplier.balance < 0 && 'text-success',
                supplier.balance === 0 && 'text-base-content/70'
              )}
            >
              {supplier.balance > 0 && '+'}
              {formatCurrency(supplier.balance)}
            </span>
            {supplier.hasDebt && (
              <span className="badge badge-error badge-sm ml-2">
                {t('erp.suppliers.debtBadge')}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'actions',
        header: '',
        sortable: false,
        render: (supplier) => (
          <PermissionGate permission={PermissionCode.SUPPLIERS_UPDATE}>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(supplier);
              }}
            >
              {t('common.edit')}
            </Button>
          </PermissionGate>
        ),
      },
    ],
    [t, onEdit]
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={Users}
          tone="primary"
          label={t('erp.suppliers.statTotalSuppliers')}
          value={data.totalElements}
        />
        <StatTile
          icon={AlertTriangle}
          tone="warning"
          label={t('erp.suppliers.statDebtSuppliers')}
          value={data.suppliersWithDebt.length}
        />
        <StatTile
          icon={Wallet}
          tone="error"
          label={t('erp.suppliers.statTotalDebt')}
          value={formatCurrency(data.totalDebt)}
          valueClassName="text-error"
        />
        <StatTile
          icon={CreditCard}
          tone="success"
          label={t('erp.suppliers.statActivePartners')}
          value={data.totalElements - data.suppliersWithDebt.length}
          valueClassName="text-success"
        />
      </div>

      <div className="surface-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/50">
              {t('erp.suppliers.searchHeading')}
            </h2>
            <p className="text-xs text-base-content/60">
              {hasSearch ? t('erp.suppliers.searchResultsShown') : t('erp.suppliers.allSuppliers')}
            </p>
          </div>
        </div>
        <SearchInput
          value={data.search}
          onValueChange={data.changeSearch}
          label={t('erp.suppliers.searchLabel')}
          placeholder={t('common.search')}
          className="mt-4 max-w-md"
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
          data={data.suppliers}
          error={data.loadError}
          onRetry={() => data.load(true)}
          columns={columns}
          keyExtractor={(supplier) => supplier.id}
          loading={data.initialLoading && !data.refreshing}
          highlightId={highlightId}
          onHighlightComplete={onHighlightComplete}
          emptyIcon={<Truck className="h-12 w-12" />}
          emptyTitle={t('erp.suppliers.emptyTitle')}
          emptyDescription={t('erp.suppliers.emptyDescription')}
          rowClassName={(supplier) => (supplier.hasDebt ? 'bg-error/5' : '')}
          currentPage={data.page}
          totalPages={data.totalPages}
          totalElements={data.totalElements}
          pageSize={data.pageSize}
          onPageChange={data.setPage}
          onPageSizeChange={data.changePageSize}
          renderMobileCard={(supplier) => (
            <div className="surface-panel flex flex-col gap-3 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="avatar placeholder">
                    <div className="w-10 rounded-full bg-primary/15 text-primary">
                      <span>{supplier.name.charAt(0).toUpperCase()}</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold">{supplier.name}</p>
                    <p className="text-xs text-base-content/60">
                      {supplier.contactPerson || t('erp.suppliers.contactNotSet')}
                    </p>
                  </div>
                </div>
                <span
                  className={clsx(
                    'badge badge-sm',
                    supplier.hasDebt ? 'badge-error' : 'badge-success'
                  )}
                >
                  {supplier.hasDebt ? t('erp.suppliers.debtBadge') : t('erp.suppliers.cleanBadge')}
                </span>
              </div>

              <div className="space-y-1.5">
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-sm text-base-content/70">
                    <Phone className="h-4 w-4" />
                    {supplier.phone}
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2 text-sm text-base-content/70">
                    <Mail className="h-4 w-4" />
                    {supplier.email}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-base-200">
                <span
                  className={clsx(
                    'font-semibold',
                    supplier.balance > 0 && 'text-error',
                    supplier.balance <= 0 && 'text-success'
                  )}
                >
                  {supplier.balance > 0 && '+'}
                  {formatCurrency(supplier.balance)}
                </span>
                <PermissionGate permission={PermissionCode.SUPPLIERS_UPDATE}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-[44px]"
                    onClick={() => onEdit(supplier)}
                  >
                    {t('common.edit')}
                  </Button>
                </PermissionGate>
              </div>
            </div>
          )}
        />
      </div>
    </>
  );
}
