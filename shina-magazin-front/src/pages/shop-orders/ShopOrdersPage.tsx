import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ShoppingBag, RefreshCw } from 'lucide-react';
import { Badge, Button, cn } from '@/ui';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Select } from '../../components/ui/Select';
import { formatCurrency } from '../../config/constants';
import { shopOrdersApi, type ShopOrderDto, type ShopOrderStatus } from '../../api/shopOrders.api';

const STATUSES: ShopOrderStatus[] = ['NEW', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
const STATUS_TONE: Record<ShopOrderStatus, 'warning' | 'info' | 'success' | 'neutral'> = {
  NEW: 'warning',
  CONFIRMED: 'info',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
};

function formatDate(iso: string, lang: string): string {
  return new Date(iso).toLocaleString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function ShopOrdersPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [status, setStatus] = useState<ShopOrderStatus | ''>('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['shop-orders', status, page, size],
    queryFn: () => shopOrdersApi.getAll({ status: status || undefined, page, size }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ orderNo, next }: { orderNo: string; next: ShopOrderStatus }) =>
      shopOrdersApi.updateStatus(orderNo, next),
    onSuccess: () => {
      toast.success(t('erp.shopOrders.statusUpdated'));
      qc.invalidateQueries({ queryKey: ['shop-orders'] });
    },
    onError: () => toast.error(t('common.error')),
  });

  const setFilter = (s: ShopOrderStatus | '') => { setStatus(s); setPage(0); };

  const columns: Column<ShopOrderDto>[] = [
    {
      key: 'orderNo',
      header: t('erp.shopOrders.orderNo'),
      render: (o) => <span className="font-mono font-semibold text-primary">{o.orderNo}</span>,
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
      render: (o) => <span className="font-bold text-primary">{formatCurrency(o.totalAmount)}</span>,
    },
    {
      key: 'status',
      header: t('erp.shopOrders.statusLabel'),
      render: (o) => <Badge tone={STATUS_TONE[o.status]}>{t(`erp.shopOrders.status.${o.status}`)}</Badge>,
    },
    {
      key: 'action',
      header: t('erp.shopOrders.changeStatus'),
      sortable: false,
      render: (o) => (
        <Select
          value={o.status}
          onChange={(val) => statusMutation.mutate({ orderNo: o.orderNo, next: val as ShopOrderStatus })}
          options={STATUSES.map((s) => ({ value: s, label: t(`erp.shopOrders.status.${s}`) }))}
          className="w-40"
        />
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
              <span className="font-mono font-semibold text-primary">{o.orderNo}</span>
              <Badge tone={STATUS_TONE[o.status]}>{t(`erp.shopOrders.status.${o.status}`)}</Badge>
            </div>
            <p className="text-sm font-medium">{o.customerName} · <span className="text-base-content/60">{o.customerPhone}</span></p>
            <p className="text-xs text-base-content/50">{formatDate(o.createdAt, i18n.language)}</p>
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="font-bold text-primary">{formatCurrency(o.totalAmount)}</span>
              <Select
                value={o.status}
                onChange={(val) => statusMutation.mutate({ orderNo: o.orderNo, next: val as ShopOrderStatus })}
                options={STATUSES.map((s) => ({ value: s, label: t(`erp.shopOrders.status.${s}`) }))}
                className="w-36"
              />
            </div>
          </div>
        )}
      />
    </div>
  );
}
