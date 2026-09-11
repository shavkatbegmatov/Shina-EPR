import { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Repeat2, Trash2, X, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { getApiErrorMessage } from '../../utils/apiError';
import { tradeInsApi } from '../../api/tradeIns.api';
import { productsApi } from '../../api/products.api';
import { formatCurrency, formatDateTime } from '../../config/constants';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ModalPortal } from '../../components/common/Modal';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { NumberInput } from '../../components/ui/NumberInput';
import { CustomerSearchCombobox } from '../../components/common/NamePhoneSearchCombobox';
import { PermissionGate } from '../../components/common/PermissionGate';
import { PermissionCode } from '../../hooks/usePermission';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { queryKeys } from '../../lib/queryKeys';
import { invalidateAfter } from '../../lib/invalidation';
import {
  addTradeInLine,
  removeTradeInLine,
  suggestedUnitValue,
  toTradeInRequestItems,
  tradeInTotal,
  updateTradeInLine,
  type TradeInCartItem,
} from '../../shared/tradeInCart';
import type { Customer, Product, TradeIn, TradeInStatus } from '../../types';
import { Button } from '@/ui';

/**
 * Barter — mijoz eski shinasini QOLDIRIB ketgan holat.
 *
 * <p>Savdo paytida baholash uchun bu sahifa kerak emas: POS barterni savdo
 * so'roviga qo'shib yuboradi. Bu yerda mijoz bugun shinasini qoldiradi, baho
 * yoziladi, va u keyingi xaridida kassada tanlanadi.
 */
export function TradeInsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<TradeInStatus | ''>('');

  const [showAccept, setShowAccept] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [lines, setLines] = useState<TradeInCartItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [cancelTarget, setCancelTarget] = useState<TradeIn | null>(null);

  const listQuery = useQuery({
    queryKey: queryKeys.tradeIns.list({ page, size: pageSize, status: statusFilter || undefined }),
    queryFn: () =>
      tradeInsApi.getAll({ page, size: pageSize, status: statusFilter || undefined }),
    placeholderData: keepPreviousData,
  });

  const debouncedProductSearch = useDebouncedValue(productSearch.trim(), 300);
  const productsQuery = useQuery({
    queryKey: queryKeys.products.list({
      page: 0,
      size: 20,
      search: debouncedProductSearch || undefined,
    }),
    queryFn: () =>
      productsApi.getAll({ page: 0, size: 20, search: debouncedProductSearch || undefined }),
    enabled: showAccept,
    placeholderData: keepPreviousData,
  });

  const total = useMemo(() => tradeInTotal(lines), [lines]);

  const acceptMutation = useMutation({
    mutationFn: () =>
      tradeInsApi.accept({
        customerId: customer?.id,
        items: toTradeInRequestItems(lines),
      }),
    onSuccess: () => {
      toast.success(t('erp.tradeIns.accepted'));
      invalidateAfter.tradeIn(queryClient);
      closeAccept();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => tradeInsApi.cancel(id),
    onSuccess: () => {
      toast.success(t('erp.tradeIns.cancelled'));
      invalidateAfter.tradeIn(queryClient);
      setCancelTarget(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const closeAccept = () => {
    setShowAccept(false);
    setLines([]);
    setCustomer(null);
    setCustomerSearch('');
    setProductSearch('');
  };

  const statusBadge = (status: TradeInStatus) => (
    <span
      className={clsx('badge badge-sm', {
        'badge-info': status === 'NEW',
        'badge-success': status === 'APPLIED',
        'badge-ghost': status === 'CANCELLED',
      })}
    >
      {t(`erp.tradeIns.status.${status}`)}
    </span>
  );

  const columns: Column<TradeIn>[] = [
    {
      key: 'documentNumber',
      header: t('erp.tradeIns.colDocument'),
      render: (item) => <span className="font-medium">{item.documentNumber}</span>,
    },
    {
      key: 'acceptedAt',
      header: t('erp.tradeIns.colDate'),
      render: (item) => formatDateTime(item.acceptedAt),
    },
    {
      key: 'customerName',
      header: t('erp.tradeIns.colCustomer'),
      render: (item) => item.customerName || '—',
    },
    {
      key: 'totalAmount',
      header: t('erp.tradeIns.colAmount'),
      className: 'text-right',
      render: (item) => <span className="font-semibold">{formatCurrency(item.totalAmount)}</span>,
    },
    {
      key: 'status',
      header: t('erp.tradeIns.colStatus'),
      render: (item) => statusBadge(item.status),
    },
    {
      key: 'invoiceNumber',
      header: t('erp.tradeIns.colSale'),
      render: (item) => item.invoiceNumber || '—',
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (item) => (
        // Bekor qilish omborga kirimni qaytaradi — shuning uchun alohida
        // ruxsat va faqat ishlatilmagan hujjatlarda ko'rinadi.
        <PermissionGate permission={PermissionCode.TRADE_INS_CANCEL}>
          {item.status === 'NEW' && (
            <Button variant="ghost" size="sm" onClick={() => setCancelTarget(item)}>
              <XCircle className="h-4 w-4" />
              {t('common.cancel')}
            </Button>
          )}
        </PermissionGate>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Repeat2 className="h-6 w-6 text-primary" />
            {t('erp.tradeIns.title')}
          </h1>
          <p className="text-sm text-base-content/60">{t('erp.tradeIns.subtitle')}</p>
        </div>
        <PermissionGate permission={PermissionCode.TRADE_INS_CREATE}>
          <Button variant="primary" onClick={() => setShowAccept(true)}>
            <Plus className="h-4 w-4" />
            {t('erp.tradeIns.accept')}
          </Button>
        </PermissionGate>
      </div>

      <div className="max-w-xs">
        <Select
          label={t('erp.tradeIns.colStatus')}
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value as TradeInStatus | '');
            setPage(0);
          }}
          options={[
            { value: '', label: t('common.all') },
            { value: 'NEW', label: t('erp.tradeIns.status.NEW') },
            { value: 'APPLIED', label: t('erp.tradeIns.status.APPLIED') },
            { value: 'CANCELLED', label: t('erp.tradeIns.status.CANCELLED') },
          ]}
        />
      </div>

      <DataTable
        data={listQuery.data?.content ?? []}
        columns={columns}
        keyExtractor={(item) => item.id}
        loading={listQuery.isPending}
        error={listQuery.isError ? getApiErrorMessage(listQuery.error) : null}
        onRetry={() => listQuery.refetch()}
        totalElements={listQuery.data?.totalElements}
        totalPages={listQuery.data?.totalPages}
        currentPage={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(0);
        }}
      />

      {/* Qabul qilish oynasi */}
      <ModalPortal isOpen={showAccept} onClose={closeAccept}>
        <div className="w-full max-w-2xl rounded-2xl bg-base-100 shadow-2xl">
          <div className="flex items-center justify-between border-b border-base-200 p-4">
            <h3 className="text-lg font-semibold">{t('erp.tradeIns.acceptTitle')}</h3>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-circle"
              onClick={closeAccept}
              aria-label={t('common.close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
            <p className="text-sm text-base-content/60">{t('erp.tradeIns.acceptHint')}</p>

            <CustomerSearchCombobox
              value={customerSearch}
              onChange={setCustomerSearch}
              onSelect={(selected) => {
                setCustomer(selected);
                setCustomerSearch(selected.fullName);
              }}
              label={t('erp.tradeIns.colCustomer')}
            />

            {lines.map((line) => (
              <div key={line.product.id} className="surface-soft rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{line.product.name}</p>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs btn-circle"
                    onClick={() => setLines(removeTradeInLine(lines, line.product.id))}
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <NumberInput
                    label={t('erp.pos.tradeInQuantity')}
                    value={line.quantity}
                    onChange={(val) =>
                      setLines(
                        updateTradeInLine(lines, line.product.id, { quantity: Number(val) || 1 })
                      )
                    }
                    min={1}
                    size="sm"
                  />
                  <CurrencyInput
                    label={t('erp.pos.tradeInUnitValue')}
                    value={line.unitValue}
                    onChange={(val) =>
                      setLines(updateTradeInLine(lines, line.product.id, { unitValue: val }))
                    }
                    min={0}
                    size="sm"
                  />
                </div>
              </div>
            ))}

            <div className="space-y-2">
              <SearchInput
                value={productSearch}
                onValueChange={setProductSearch}
                label={t('erp.pos.tradeInSearchLabel')}
                placeholder={t('erp.pos.tradeInSearchPlaceholder')}
              />
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {productsQuery.data?.content?.map((product: Product) => (
                  <button
                    key={product.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-base-200"
                    onClick={() =>
                      setLines(addTradeInLine(lines, product, suggestedUnitValue(product)))
                    }
                  >
                    <span>
                      <span className="font-medium">{product.name}</span>
                      <span className="ml-2 text-xs text-base-content/50">{product.sku}</span>
                    </span>
                    <span className="text-sm text-base-content/60">
                      {formatCurrency(suggestedUnitValue(product))}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-base-200 pt-3 text-lg">
              <span>{t('erp.tradeIns.colAmount')}</span>
              <span className="font-bold">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-base-200 p-4">
            <Button variant="ghost" onClick={closeAccept}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              disabled={lines.length === 0}
              loading={acceptMutation.isPending}
              onClick={() => acceptMutation.mutate()}
            >
              {t('erp.tradeIns.accept')}
            </Button>
          </div>
        </div>
      </ModalPortal>

      {/* Bekor qilishni tasdiqlash */}
      <ModalPortal isOpen={cancelTarget !== null} onClose={() => setCancelTarget(null)}>
        <div className="w-full max-w-md rounded-2xl bg-base-100 p-6 shadow-2xl">
          <h3 className="text-lg font-semibold">{t('erp.tradeIns.cancelTitle')}</h3>
          <p className="mt-2 text-sm text-base-content/70">{t('erp.tradeIns.cancelHint')}</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCancelTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              loading={cancelMutation.isPending}
              onClick={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
            >
              {t('common.confirm')}
            </Button>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
