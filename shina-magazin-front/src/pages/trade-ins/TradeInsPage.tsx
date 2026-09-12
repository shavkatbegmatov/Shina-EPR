import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, Plus, Recycle, Trash2, X, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { getApiErrorMessage } from '../../utils/apiError';
import { tradeInsApi } from '../../api/tradeIns.api';
import { formatCurrency, formatDateTime } from '../../config/constants';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ModalPortal } from '../../components/common/Modal';
import { Select } from '../../components/ui/Select';
import { CustomerSearchCombobox } from '../../components/common/NamePhoneSearchCombobox';
import { PermissionGate } from '../../components/common/PermissionGate';
import { usePermission, PermissionCode } from '../../hooks/usePermission';
import { queryKeys } from '../../lib/queryKeys';
import { invalidateAfter } from '../../lib/invalidation';
import { TradeInModal } from '../sales/TradeInModal';
import { toTradeInItemRequest } from '../../shared/tradeIn';
import type { Customer, TradeIn, TradeInLine, TradeInStatus } from '../../types';
import { Button } from '@/ui';

const STATUSES: TradeInStatus[] = ['NEW', 'APPLIED', 'CANCELLED'];

/**
 * Barter hujjatlari — mijozdan qabul qilingan eski shinalar.
 *
 * <p>Kassada savdo ichida qabul qilingan barterlar ham shu ro'yxatga tushadi,
 * lekin sahifaning asosiy vazifasi — mijoz shinasini QOLDIRIB ketgan holat:
 * bugun qabul qilinadi (hujjat "Kutmoqda"), keyingi xaridda kassada
 * tanlanadi. Bekor qilish (shinalar mijozga qaytadi) alohida ruxsat —
 * kassirda yo'q.
 */
export function TradeInsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermission();
  const [searchParams, setSearchParams] = useSearchParams();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<TradeInStatus | ''>('');

  // Qabul qilish oynasi
  const [showAccept, setShowAccept] = useState(false);
  const [showLineModal, setShowLineModal] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [lines, setLines] = useState<TradeInLine[]>([]);
  const [notes, setNotes] = useState('');

  const [selected, setSelected] = useState<TradeIn | null>(null);
  const [cancelTarget, setCancelTarget] = useState<TradeIn | null>(null);

  const listQuery = useQuery({
    queryKey: queryKeys.tradeIns.list({ page, size: pageSize, status: statusFilter || undefined }),
    queryFn: () => tradeInsApi.getAll({ page, size: pageSize, status: statusFilter || undefined }),
    placeholderData: keepPreviousData,
  });

  // Kutayotgan hujjatlar soni — sarlavhadagi belgi uchun
  const waitingQuery = useQuery({
    queryKey: queryKeys.tradeIns.list({ page: 0, size: 1, status: 'NEW' }),
    queryFn: () => tradeInsApi.getAll({ page: 0, size: 1, status: 'NEW' }),
  });

  // Savdo tafsilotidan `?doc=ID` bilan kelinsa hujjat darhol ochiladi
  const docParam = Number(searchParams.get('doc'));
  const docFromUrl = Number.isFinite(docParam) && docParam > 0 ? docParam : 0;
  const detailQuery = useQuery({
    queryKey: queryKeys.tradeIns.detail(docFromUrl),
    queryFn: () => tradeInsApi.getById(docFromUrl),
    enabled: docFromUrl > 0,
  });
  const detail = selected ?? (docFromUrl > 0 ? (detailQuery.data ?? null) : null);

  const closeDetail = () => {
    setSelected(null);
    if (searchParams.has('doc')) {
      const next = new URLSearchParams(searchParams);
      next.delete('doc');
      setSearchParams(next, { replace: true });
    }
  };

  const total = lines.reduce((sum, line) => sum + line.quantity * line.unitValue, 0);

  const closeAccept = () => {
    setShowAccept(false);
    setShowLineModal(false);
    setLines([]);
    setCustomer(null);
    setCustomerSearch('');
    setNotes('');
  };

  const acceptMutation = useMutation({
    mutationFn: () =>
      tradeInsApi.accept({
        customerId: (customer as Customer).id,
        items: lines.map(toTradeInItemRequest),
        notes: notes.trim() || undefined,
      }),
    onSuccess: (doc) => {
      toast.success(t('erp.tradeIns.accepted', { number: doc.documentNumber }));
      // Eski shinalar B/U kartochkaga kirdi — ombor, mahsulotlar, hisobotlar eskiradi
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
      setSelected(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const handleAccept = () => {
    if (!customer) {
      toast.error(t('erp.tradeIns.customerRequired'));
      return;
    }
    if (lines.length === 0) {
      toast.error(t('erp.tradeIns.linesRequired'));
      return;
    }
    acceptMutation.mutate();
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

  const canCancel = hasPermission(PermissionCode.TRADE_INS_CANCEL);

  const columns: Column<TradeIn>[] = [
    {
      key: 'documentNumber',
      header: t('erp.tradeIns.colDocument'),
      render: (item) => (
        <div>
          <p className="font-medium">{item.documentNumber}</p>
          <p className="text-xs text-base-content/60">
            {t(item.acceptedInSale ? 'erp.tradeIns.inSale' : 'erp.tradeIns.before')}
          </p>
        </div>
      ),
    },
    {
      key: 'acceptedAt',
      header: t('erp.tradeIns.colDate'),
      render: (item) => formatDateTime(item.acceptedAt),
    },
    {
      key: 'customerName',
      header: t('erp.tradeIns.colCustomer'),
      render: (item) => (
        <div>
          <p className="font-medium">{item.customerName || '—'}</p>
          {item.customerPhone && <p className="text-xs text-base-content/60">{item.customerPhone}</p>}
        </div>
      ),
    },
    {
      key: 'items',
      header: t('erp.tradeIns.colItems'),
      render: (item) => (
        <div>
          <p>{t('erp.tradeIns.qty', { count: item.totalQuantity ?? 0 })}</p>
          {item.items && item.items.length > 0 && (
            <p className="max-w-[16rem] truncate text-xs text-base-content/60">
              {item.items.map((line) => line.productName).join(', ')}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'totalAmount',
      header: t('erp.tradeIns.colAmount'),
      className: 'text-right',
      render: (item) => <span className="font-semibold tabular-nums">{formatCurrency(item.totalAmount)}</span>,
    },
    {
      key: 'status',
      header: t('erp.tradeIns.colStatus'),
      render: (item) => statusBadge(item.status),
    },
    {
      key: 'invoiceNumber',
      header: t('erp.tradeIns.colSale'),
      render: (item) =>
        item.saleId ? (
          <Link to={`/admin/sales/${item.saleId}`} className="link link-primary">
            {item.invoiceNumber}
          </Link>
        ) : (
          <span className="text-base-content/50">{t('erp.tradeIns.notApplied')}</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (item) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setSelected(item)} aria-label={t('erp.tradeIns.view')}>
            <Eye className="h-4 w-4" />
          </Button>
          {/* Bekor qilish omborga kirimni qaytaradi — alohida ruxsat, faqat kutayotgan hujjatlarda */}
          {canCancel && item.status === 'NEW' && (
            <Button variant="ghost" size="sm" className="text-error" onClick={() => setCancelTarget(item)}>
              <XCircle className="h-4 w-4" />
              {t('erp.tradeIns.cancelAction')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const waiting = waitingQuery.data?.totalElements ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Recycle className="h-6 w-6 text-primary" />
            {t('erp.tradeIns.title')}
            {waiting > 0 && (
              <span className="badge badge-info badge-sm">{t('erp.tradeIns.waiting', { count: waiting })}</span>
            )}
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
          label={t('erp.tradeIns.filterStatus')}
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter((value as TradeInStatus | undefined) ?? '');
            setPage(0);
          }}
          options={[
            { value: '', label: t('erp.tradeIns.all') },
            ...STATUSES.map((status) => ({ value: status, label: t(`erp.tradeIns.status.${status}`) })),
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
        emptyIcon={<Recycle className="h-10 w-10 text-base-content/30" />}
        emptyTitle={t('erp.tradeIns.empty')}
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

      {/* Qabul qilish oynasi — mijoz shinasini qoldirib ketadi */}
      <ModalPortal
        isOpen={showAccept}
        onClose={() => {
          // Ichki (o'lcham) oynasi ochiq bo'lsa Esc faqat uni yopadi
          if (!showLineModal) closeAccept();
        }}
      >
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

            {/* Kassadagi kabi: tanlangan mijoz kartochka bo'lib turadi, X — boshqasini tanlash */}
            {customer ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/10 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-base-content/50">
                    {t('erp.tradeIns.customer')}
                  </p>
                  <p className="truncate font-medium">{customer.fullName}</p>
                  {customer.phone && <p className="text-xs text-base-content/60">{customer.phone}</p>}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-circle"
                  onClick={() => {
                    setCustomer(null);
                    setCustomerSearch('');
                  }}
                  aria-label={t('common.delete')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <CustomerSearchCombobox
                value={customerSearch}
                onChange={setCustomerSearch}
                onSelect={(picked) => {
                  setCustomer(picked);
                  setCustomerSearch('');
                }}
                label={t('erp.tradeIns.customer')}
              />
            )}

            <div className="surface-soft space-y-2 rounded-xl p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{t('erp.pos.barterTitle')}</span>
                <Button variant="ghost" size="sm" onClick={() => setShowLineModal(true)}>
                  <Plus className="h-4 w-4" />
                  {t('erp.pos.barterAdd')}
                </Button>
              </div>
              {lines.length === 0 ? (
                <p className="text-xs text-base-content/60">{t('erp.tradeIns.linesEmpty')}</p>
              ) : (
                <ul className="space-y-1">
                  {lines.map((line) => (
                    <li key={line.key} className="flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {line.brandName ? `${line.brandName} ` : ''}
                          {line.width}/{line.profile} R{line.diameter}
                          {line.condition && (
                            <span className="ml-1 text-xs text-base-content/60">· {line.condition}</span>
                          )}
                        </p>
                        <p className="text-xs text-base-content/70">
                          {line.quantity} × {formatCurrency(line.unitValue)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(line.quantity * line.unitValue)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="btn-circle text-error"
                          aria-label={t('erp.pos.tradeInRemove')}
                          onClick={() => setLines(lines.filter((l) => l.key !== line.key))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <label className="form-control">
              <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                {t('erp.tradeIns.notes')}
              </span>
              <textarea
                className="textarea textarea-bordered w-full"
                rows={2}
                maxLength={500}
                placeholder={t('erp.tradeIns.notesPh')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                aria-label={t('erp.tradeIns.notes')}
              />
            </label>

            <div className="flex items-center justify-between rounded-xl bg-base-200 px-4 py-3">
              <span className="font-medium">{t('erp.tradeIns.total')}</span>
              <span className="text-lg font-semibold tabular-nums">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-base-200 p-4">
            <Button variant="ghost" onClick={closeAccept}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              disabled={!customer || lines.length === 0}
              loading={acceptMutation.isPending}
              onClick={handleAccept}
            >
              {t('erp.tradeIns.accept')}
            </Button>
          </div>
        </div>
      </ModalPortal>

      {/* Eski shina qatori — kassadagi bilan bir xil oyna (o'lcham, holat, soni, kredit) */}
      <TradeInModal
        isOpen={showLineModal}
        onClose={() => setShowLineModal(false)}
        onAdd={(line) =>
          setLines((prev) => [
            ...prev,
            { ...line, key: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` },
          ])
        }
      />

      {/* Hujjat tafsiloti */}
      <ModalPortal isOpen={detail !== null} onClose={closeDetail}>
        {detail && (
          <div className="w-full max-w-2xl rounded-2xl bg-base-100 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-base-200 p-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {t('erp.tradeIns.detailTitle', { number: detail.documentNumber })}
                </h3>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-base-content/60">
                  {statusBadge(detail.status)}
                  <span>{formatDateTime(detail.acceptedAt)}</span>
                  <span>· {t(detail.acceptedInSale ? 'erp.tradeIns.inSale' : 'erp.tradeIns.before')}</span>
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-circle"
                onClick={closeDetail}
                aria-label={t('common.close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-base-content/50">{t('erp.tradeIns.colCustomer')}</p>
                  <p className="font-medium">{detail.customerName || '—'}</p>
                  {detail.customerPhone && <p className="text-base-content/60">{detail.customerPhone}</p>}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-base-content/50">{t('erp.tradeIns.colSale')}</p>
                  {detail.saleId ? (
                    <Link to={`/admin/sales/${detail.saleId}`} className="link link-primary font-medium">
                      {detail.invoiceNumber}
                    </Link>
                  ) : (
                    <p className="text-base-content/60">{t('erp.tradeIns.status.NEW')}</p>
                  )}
                </div>
                {detail.createdByName && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-base-content/50">{t('erp.tradeIns.acceptedBy')}</p>
                    <p className="font-medium">{detail.createdByName}</p>
                  </div>
                )}
                {detail.notes && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-base-content/50">{t('erp.tradeIns.notes')}</p>
                    <p>{detail.notes}</p>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>{t('erp.saleDetail.tradeInProduct')}</th>
                      <th>{t('erp.saleDetail.tradeInDescription')}</th>
                      <th className="text-right">{t('erp.saleDetail.quantity')}</th>
                      <th className="text-right">{t('erp.saleDetail.tradeInUnitValue')}</th>
                      <th className="text-right">{t('common.sum')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.items ?? []).map((item, index) => (
                      <tr key={item.id ?? index}>
                        <td>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-xs text-base-content/60">
                            {item.productSku}
                            {item.sizeString && ` • ${item.sizeString}`}
                          </p>
                        </td>
                        <td className="text-base-content/70">{item.description || '—'}</td>
                        <td className="text-right">{t('erp.saleDetail.qtyPcs', { count: item.quantity })}</td>
                        <td className="text-right">{formatCurrency(item.unitValue)}</td>
                        <td className="text-right font-semibold">{formatCurrency(item.totalValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} className="text-right font-semibold">{t('erp.tradeIns.total')}</td>
                      <td className="text-right font-bold text-info">{formatCurrency(detail.totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-base-200 p-4">
              {canCancel && detail.status === 'NEW' && (
                <Button variant="ghost" className="text-error" onClick={() => setCancelTarget(detail)}>
                  <XCircle className="h-4 w-4" />
                  {t('erp.tradeIns.cancelAction')}
                </Button>
              )}
              <Button variant="primary" onClick={closeDetail}>
                {t('common.close')}
              </Button>
            </div>
          </div>
        )}
      </ModalPortal>

      {/* Bekor qilishni tasdiqlash */}
      <ModalPortal isOpen={cancelTarget !== null} onClose={() => setCancelTarget(null)}>
        <div className="w-full max-w-md rounded-2xl bg-base-100 p-6 shadow-2xl">
          <h3 className="text-lg font-semibold">
            {t('erp.tradeIns.cancelTitle')}
            {cancelTarget && <span className="ml-2 text-base-content/60">{cancelTarget.documentNumber}</span>}
          </h3>
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
