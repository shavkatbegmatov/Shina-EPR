import { useDeferredValue, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { CreditCard, Eye, Mail, MapPin, Phone, RefreshCw, Search, ShoppingBag, Truck, X } from 'lucide-react';
import { Badge, Button, cn } from '@/ui';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Select } from '../../components/ui/Select';
import { formatCurrency } from '../../config/constants';
import { shopOrdersApi, type ShopOrderDto, type ShopOrderStatus, type ShopPaymentStatus } from '../../api/shopOrders.api';
import { Modal } from '../../components/common/Modal';
import { usePermission } from '../../hooks/usePermission';

const STATUSES: ShopOrderStatus[] = ['NEW', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
const STATUS_TONE: Record<ShopOrderStatus, 'warning' | 'info' | 'success' | 'neutral'> = {
  NEW: 'warning',
  CONFIRMED: 'info',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
};
const PAY_TONE: Record<ShopPaymentStatus, 'warning' | 'info' | 'success' | 'error' | 'neutral'> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  PAID: 'success',
  FAILED: 'error',
  CANCELLED: 'neutral',
  REFUNDED: 'neutral',
};

function formatDate(iso: string, lang: string): string {
  return new Date(iso).toLocaleString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function ShopOrdersPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const { canUpdateSales } = usePermission();
  const [urlParams, setUrlParams] = useSearchParams();
  const [status, setStatus] = useState<ShopOrderStatus | ''>('');
  const [customerId, setCustomerId] = useState<number | undefined>(() => {
    const value = Number(urlParams.get('customerId'));
    return Number.isFinite(value) && value > 0 ? value : undefined;
  });
  const [search, setSearch] = useState(urlParams.get('search') ?? '');
  const deferredSearch = useDeferredValue(search.trim());
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [selectedOrder, setSelectedOrder] = useState<ShopOrderDto | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['shop-orders', status, customerId, deferredSearch, page, size],
    queryFn: () => shopOrdersApi.getAll({
      status: status || undefined,
      customerId,
      search: deferredSearch || undefined,
      page,
      size,
    }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ orderNo, next }: { orderNo: string; next: ShopOrderStatus }) =>
      shopOrdersApi.updateStatus(orderNo, next),
    onSuccess: (updated) => {
      toast.success(t('erp.shopOrders.statusUpdated'));
      qc.invalidateQueries({ queryKey: ['shop-orders'] });
      setSelectedOrder((current) => current?.orderNo === updated.orderNo ? updated : current);
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || t('common.error'));
    },
  });

  const setFilter = (s: ShopOrderStatus | '') => { setStatus(s); setPage(0); };

  const clearCustomerFilter = () => {
    setCustomerId(undefined);
    setPage(0);
    const next = new URLSearchParams(urlParams);
    next.delete('customerId');
    setUrlParams(next, { replace: true });
  };

  const columns: Column<ShopOrderDto>[] = [
    {
      key: 'orderNo',
      header: t('erp.shopOrders.orderNo'),
      render: (o) => (
        <button
          type="button"
          className="font-mono font-semibold text-primary hover:underline"
          onClick={() => setSelectedOrder(o)}
        >
          {o.orderNo}
        </button>
      ),
    },
    {
      key: 'createdAt',
      header: t('erp.shopOrders.date'),
      render: (o) => <span className="whitespace-nowrap text-sm text-base-content/70">{formatDate(o.createdAt, i18n.language)}</span>,
    },
    {
      key: 'customer',
      header: t('erp.shopOrders.customer'),
      sortable: false,
      render: (o) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{o.customerName}</p>
          <p className="text-xs text-base-content/50">{o.customerPhone}</p>
        </div>
      ),
    },
    {
      key: 'items',
      header: t('erp.shopOrders.items'),
      sortable: false,
      render: (o) => <span className="text-sm">{t('erp.shopOrders.itemsCount', { count: o.items.reduce((s, i) => s + i.quantity, 0) })}</span>,
    },
    {
      key: 'total',
      header: t('erp.shopOrders.total'),
      className: 'text-right',
      headerClassName: 'text-right',
      sortable: false,
      render: (o) => (
        <div className="flex flex-col items-end gap-1">
          <span className="font-bold text-primary">{formatCurrency(o.totalAmount)}</span>
          <Badge tone={PAY_TONE[o.paymentStatus]} className="text-[10px]">{t(`erp.shopOrders.payStatus.${o.paymentStatus}`)}</Badge>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('erp.shopOrders.statusLabel'),
      render: (o) => <Badge tone={STATUS_TONE[o.status]}>{t(`erp.shopOrders.status.${o.status}`)}</Badge>,
    },
    {
      key: 'action',
      header: t('erp.shopOrders.actions'),
      sortable: false,
      render: (o) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(o)} aria-label={t('erp.shopOrders.viewDetails')}>
            <Eye className="h-4 w-4" />
          </Button>
          {canUpdateSales && (
            <Select
              value={o.status}
              onChange={(val) => statusMutation.mutate({ orderNo: o.orderNo, next: val as ShopOrderStatus })}
              options={STATUSES.map((s) => ({ value: s, label: t(`erp.shopOrders.status.${s}`) }))}
              className="w-40"
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" /> {t('erp.shopOrders.title')}
          </h1>
          <p className="section-subtitle">{t('erp.shopOrders.subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} loading={isFetching} className="gap-2">
          <RefreshCw className="h-4 w-4" /> {t('common.refresh')}
        </Button>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter('')}
          className={cn('rounded-full border px-4 py-1.5 text-sm font-medium transition', status === '' ? 'border-primary bg-primary/10 text-primary' : 'border-base-300 text-base-content/70 hover:bg-base-200')}
        >
          {t('erp.shopOrders.all')}
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={cn('rounded-full border px-4 py-1.5 text-sm font-medium transition', status === s ? 'border-primary bg-primary/10 text-primary' : 'border-base-300 text-base-content/70 hover:bg-base-200')}
          >
            {t(`erp.shopOrders.status.${s}`)}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block w-full max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/40" />
          <input
            type="search"
            className="input input-bordered w-full pl-10 pr-10"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(0); }}
            placeholder={t('erp.shopOrders.searchPlaceholder')}
          />
          {search && (
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-circle absolute right-3 top-1/2 -translate-y-1/2"
              onClick={() => { setSearch(''); setPage(0); }}
              aria-label={t('common.clear')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </label>
        {customerId && (
          <button type="button" className="badge badge-primary badge-outline h-9 gap-2 px-3" onClick={clearCustomerFilter}>
            {t('erp.shopOrders.customerFilter', { id: customerId })}
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <DataTable<ShopOrderDto>
        data={data?.content ?? []}
        columns={columns}
        keyExtractor={(o) => o.orderNo}
        loading={isLoading}
        error={isError ? t('common.error') : null}
        onRetry={() => refetch()}
        emptyIcon={<ShoppingBag className="h-10 w-10" />}
        emptyTitle={t('erp.shopOrders.empty')}
        emptyDescription={t('erp.shopOrders.emptyHint')}
        totalElements={data?.totalElements ?? 0}
        totalPages={data?.totalPages ?? 1}
        currentPage={data?.page ?? 0}
        pageSize={size}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setSize(s); setPage(0); }}
        renderMobileCard={(o) => (
          <div className="surface-card space-y-2 p-4">
            <div className="flex items-center justify-between gap-2">
              <button type="button" className="font-mono font-semibold text-primary hover:underline" onClick={() => setSelectedOrder(o)}>
                {o.orderNo}
              </button>
              <Badge tone={STATUS_TONE[o.status]}>{t(`erp.shopOrders.status.${o.status}`)}</Badge>
            </div>
            <p className="text-sm font-medium">{o.customerName} · <span className="text-base-content/60">{o.customerPhone}</span></p>
            <p className="text-xs text-base-content/50">{formatDate(o.createdAt, i18n.language)}</p>
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex flex-col gap-1">
                <span className="font-bold text-primary">{formatCurrency(o.totalAmount)}</span>
                <Badge tone={PAY_TONE[o.paymentStatus]} className="text-[10px]">{t(`erp.shopOrders.payStatus.${o.paymentStatus}`)}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(o)}>
                  <Eye className="h-4 w-4" />
                </Button>
                {canUpdateSales && (
                  <Select
                    value={o.status}
                    onChange={(val) => statusMutation.mutate({ orderNo: o.orderNo, next: val as ShopOrderStatus })}
                    options={STATUSES.map((s) => ({ value: s, label: t(`erp.shopOrders.status.${s}`) }))}
                    className="w-36"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      />

      <Modal
        isOpen={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder?.orderNo}
        subtitle={selectedOrder ? formatDate(selectedOrder.createdAt, i18n.language) : undefined}
        maxWidth="4xl"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[selectedOrder.status]}>{t(`erp.shopOrders.status.${selectedOrder.status}`)}</Badge>
              <Badge tone={PAY_TONE[selectedOrder.paymentStatus]}>{t(`erp.shopOrders.payStatus.${selectedOrder.paymentStatus}`)}</Badge>
              {canUpdateSales && (
                <Select
                  value={selectedOrder.status}
                  onChange={(value) => statusMutation.mutate({ orderNo: selectedOrder.orderNo, next: value as ShopOrderStatus })}
                  options={STATUSES.map((value) => ({ value, label: t(`erp.shopOrders.status.${value}`) }))}
                  className="ml-auto w-44"
                />
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="surface-soft space-y-3 rounded-card p-4">
                <h4 className="font-semibold">{t('erp.shopOrders.customerInfo')}</h4>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /><span>{selectedOrder.customerPhone}</span></div>
                {selectedOrder.customerEmail && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /><span>{selectedOrder.customerEmail}</span></div>}
                <p className="font-medium">{selectedOrder.customerName}</p>
                {selectedOrder.customerId && (
                  <Link to={`/admin/customers/${selectedOrder.customerId}`} className="link link-primary text-sm">
                    {t('erp.shopOrders.openCustomer')}
                  </Link>
                )}
              </section>

              <section className="surface-soft space-y-3 rounded-card p-4">
                <h4 className="font-semibold">{t('erp.shopOrders.fulfillment')}</h4>
                <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /><span>{t(`erp.shopOrders.deliveryMethod.${selectedOrder.deliveryMethod}`)}</span></div>
                <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /><span>{t(`erp.shopOrders.paymentMethod.${selectedOrder.paymentMethod}`)}</span></div>
                {selectedOrder.deliveryAddress && <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{selectedOrder.deliveryAddress}</span></div>}
                {selectedOrder.deliveryNote && <p className="rounded-lg bg-base-100 p-3 text-sm text-base-content/70">{selectedOrder.deliveryNote}</p>}
              </section>
            </div>

            <section>
              <h4 className="mb-3 font-semibold">{t('erp.shopOrders.items')}</h4>
              <div className="overflow-x-auto rounded-card border border-base-200">
                <table className="table">
                  <thead><tr><th>{t('erp.shopOrders.product')}</th><th>{t('erp.shopOrders.quantity')}</th><th className="text-right">{t('erp.shopOrders.unitPrice')}</th><th className="text-right">{t('erp.shopOrders.total')}</th></tr></thead>
                  <tbody>
                    {selectedOrder.items.map((item) => (
                      <tr key={`${selectedOrder.orderNo}-${item.productId}`}>
                        <td><p className="font-medium">{item.productName}</p>{item.sizeString && <p className="text-xs text-base-content/50">{item.sizeString}</p>}</td>
                        <td>{item.quantity}</td>
                        <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <dl className="ml-auto grid max-w-sm gap-2 text-sm">
              <div className="flex justify-between gap-8"><dt className="text-base-content/60">{t('erp.shopOrders.subtotal')}</dt><dd>{formatCurrency(selectedOrder.subtotal)}</dd></div>
              <div className="flex justify-between gap-8"><dt className="text-base-content/60">{t('erp.shopOrders.deliveryFee')}</dt><dd>{formatCurrency(selectedOrder.deliveryFee)}</dd></div>
              <div className="flex justify-between gap-8 border-t border-base-200 pt-2 text-base font-bold"><dt>{t('erp.shopOrders.total')}</dt><dd className="text-primary">{formatCurrency(selectedOrder.totalAmount)}</dd></div>
            </dl>
          </div>
        )}
      </Modal>
    </div>
  );
}
