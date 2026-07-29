import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Receipt,
  Calendar,
  User,
  Phone,
  Wallet,
  CreditCard,
  Package,
  FileText,
  AlertCircle,
  Hash,
  Printer,
  Undo2,
} from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/ui';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../../utils/apiError';
import { ModalPortal } from '../../components/common/Modal';
import { PermissionGate } from '../../components/common/PermissionGate';
import { PermissionCode } from '../../hooks/usePermission';
import { salesApi } from '../../api/sales.api';
import { formatCurrency, formatDate } from '../../config/constants';
import { useSaleReceipt } from '../../components/receipt/useSaleReceipt';
import { queryKeys } from '../../lib/queryKeys';
import { invalidateAfter } from '../../lib/invalidation';

export function SaleDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const { printReceipt, receipt } = useSaleReceipt();

  // Qaytarish
  const [showReturn, setShowReturn] = useState(false);
  const [returnQty, setReturnQty] = useState<Record<number, number>>({});
  const [returnReason, setReturnReason] = useState('');
  const [returning, setReturning] = useState(false);

  const saleQuery = useQuery({
    queryKey: queryKeys.sales.detail(Number(id)),
    queryFn: () => salesApi.getById(Number(id)),
    enabled: !!id,
  });

  // Qaytarishlar tarixi ALOHIDA so'rov: qaytarish rasmiylashtirilganda
  // faqat shu ro'yxat emas, savdoning qoldiq summasi ham o'zgaradi —
  // ikkalasi bitta prefiks (`sales`) ostida birga bekor qilinadi.
  const returnsQuery = useQuery({
    queryKey: queryKeys.sales.returns(Number(id)),
    queryFn: () => salesApi.getReturns(Number(id)),
    enabled: !!id,
  });

  const sale = saleQuery.data ?? null;
  const returns = useMemo(() => returnsQuery.data ?? [], [returnsQuery.data]);
  const loading = saleQuery.isPending;

  useEffect(() => {
    if (saleQuery.isError) {
      console.error('Failed to load sale:', saleQuery.error);
      toast.error(getApiErrorMessage(saleQuery.error));
    }
  }, [saleQuery.isError, saleQuery.error]);

  /** Qatordan qancha qaytarish mumkin — avvalgi qaytarishlar hisobga olinadi. */
  const returnableQty = (item: { id?: number; quantity: number }) => {
    const alreadyReturned = returns
      .flatMap((r) => r.items)
      .filter((ri) => ri.saleItemId === item.id)
      .reduce((sum, ri) => sum + ri.quantity, 0);
    return item.quantity - alreadyReturned;
  };

  /**
   * Kutilayotgan qaytarish summasi — server bilan bir xil formula.
   *
   * <p>Savdoga umumiy chegirma berilgan bo'lsa qatordagi narx mijoz to'lagan
   * narx EMAS. Buni ko'rsatmasa, kassir jadvalda 2 000 000 ni ko'rib, keyin
   * 1 800 000 qaytganini xato deb o'ylardi.
   */
  const estimatedRefund = useMemo(() => {
    if (!sale) return 0;
    const ratio = sale.subtotal > 0 ? sale.totalAmount / sale.subtotal : 1;

    return (sale.items ?? []).reduce((sum, item) => {
      const qty = returnQty[item.id!] ?? 0;
      if (qty <= 0 || !item.quantity) return sum;
      return sum + (item.totalPrice * ratio * qty) / item.quantity;
    }, 0);
  }, [sale, returnQty]);

  const handleReturn = async () => {
    if (!sale) return;
    const items = Object.entries(returnQty)
      .filter(([, qty]) => qty > 0)
      .map(([saleItemId, quantity]) => ({ saleItemId: Number(saleItemId), quantity }));
    if (items.length === 0) return;

    setReturning(true);
    try {
      await salesApi.createReturn(sale.id, { items, reason: returnReason.trim() || undefined });
      toast.success(t('erp.returns.created'));
      setShowReturn(false);
      setReturnQty({});
      setReturnReason('');
      // Savdo va qaytarishlar tarixi bitta prefiks ostida — ikkalasi birga
      // yangilanadi. Ilgari faqat `loadSale()` chaqirilardi va u ikkalasini
      // birga olardi; endi bu bog'liqlik kalitlar ierarxiyasida ifodalangan.
      invalidateAfter.saleReturn(queryClient);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setReturning(false);
    }
  };

  // Status helpers
  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return t('erp.saleDetail.statusCompleted');
      case 'CANCELLED':
        return t('erp.saleDetail.statusCancelled');
      case 'REFUNDED':
        return t('erp.saleDetail.statusRefunded');
      default:
        return '—';
    }
  };

  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'badge-success';
      case 'CANCELLED':
        return 'badge-error';
      case 'REFUNDED':
        return 'badge-warning';
      default:
        return 'badge-ghost';
    }
  };

  const getPaymentStatusLabel = (status?: string) => {
    switch (status) {
      case 'PAID':
        return t('erp.saleDetail.payStatusPaid');
      case 'PARTIAL':
        return t('erp.saleDetail.payStatusPartial');
      case 'UNPAID':
        return t('erp.saleDetail.payStatusUnpaid');
      default:
        return '—';
    }
  };

  const getPaymentStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'PAID':
        return 'badge-success';
      case 'PARTIAL':
        return 'badge-warning';
      case 'UNPAID':
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  };

  const getPaymentMethodLabel = (method?: string) => {
    switch (method) {
      case 'CASH':
        return t('erp.saleDetail.payMethodCash');
      case 'CARD':
        return t('erp.saleDetail.payMethodCard');
      case 'TRANSFER':
        return t('erp.saleDetail.payMethodTransfer');
      case 'MIXED':
        return t('erp.saleDetail.payMethodMixed');
      default:
        return '—';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-32 w-full" />
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-error mb-4" />
        <h2 className="text-xl font-semibold">{t('erp.saleDetail.notFound')}</h2>
        <Button variant="primary" className="mt-4" onClick={() => navigate('/admin/sales')}>
          {t('common.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/sales')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="section-title flex items-center gap-2">
              <Hash className="h-6 w-6" />
              {sale.invoiceNumber}
            </h1>
            <p className="section-subtitle">{formatDate(sale.saleDate)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={clsx('badge', getStatusBadgeClass(sale.status))}>
            {getStatusLabel(sale.status)}
          </span>
          <span className={clsx('badge', getPaymentStatusBadgeClass(sale.paymentStatus))}>
            {getPaymentStatusLabel(sale.paymentStatus)}
          </span>
          {/* Chekni qayta chop etish — mijoz yo'qotgan yoki printer ishlamagan holat */}
          <Button variant="ghost" size="sm" onClick={() => printReceipt(sale)}>
            <Printer className="mr-2 h-4 w-4" />
            {t('erp.receipt.print')}
          </Button>
          {/* Qaytarish faqat SALES_REFUND bilan — bu firibgarlik yo'li,
              shuning uchun V11 da u SELLER'ga berilmagan. */}
          {sale.status !== 'CANCELLED' && sale.status !== 'REFUNDED' && (
            <PermissionGate permission={PermissionCode.SALES_REFUND}>
              <Button variant="ghost" size="sm" onClick={() => setShowReturn(true)}>
                <Undo2 className="mr-2 h-4 w-4" />
                {t('erp.returns.action')}
              </Button>
            </PermissionGate>
          )}
        </div>
      </div>

      {/* Yashirin chek — faqat chop etishda ko'rinadi (@media print) */}
      {receipt}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">{t('erp.saleDetail.date')}</p>
              <p className="font-semibold">{formatDate(sale.saleDate)}</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2.5">
              <Wallet className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">{t('erp.saleDetail.totalSum')}</p>
              <p className="font-semibold">{formatCurrency(sale.totalAmount)}</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-info/10 p-2.5">
              <CreditCard className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">{t('erp.saleDetail.paid')}</p>
              <p className="font-semibold text-success">{formatCurrency(sale.paidAmount)}</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className={clsx(
              'rounded-lg p-2.5',
              sale.debtAmount > 0 ? 'bg-error/10' : 'bg-success/10'
            )}>
              <Receipt className={clsx(
                'h-5 w-5',
                sale.debtAmount > 0 ? 'text-error' : 'text-success'
              )} />
            </div>
            <div>
              <p className="text-xs text-base-content/60">{t('erp.saleDetail.debt')}</p>
              <p className={clsx(
                'font-semibold',
                sale.debtAmount > 0 ? 'text-error' : 'text-success'
              )}>
                {sale.debtAmount > 0 ? formatCurrency(sale.debtAmount) : t('common.no')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer & Payment Info */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Customer Information */}
        <div className="surface-card p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4">
            {t('erp.saleDetail.customerInfo')}
          </h3>
          <div className="space-y-4">
            {sale.customerName ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-base-200 p-2">
                    <User className="h-4 w-4 text-base-content/60" />
                  </div>
                  <div>
                    <p className="text-xs text-base-content/60">{t('erp.saleDetail.customer')}</p>
                    <p className="font-semibold">{sale.customerName}</p>
                  </div>
                </div>
                {sale.customerPhone && (
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-base-200 p-2">
                      <Phone className="h-4 w-4 text-base-content/60" />
                    </div>
                    <div>
                      <p className="text-xs text-base-content/60">{t('erp.saleDetail.phone')}</p>
                      <p className="font-semibold">{sale.customerPhone}</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-base-content/50 text-center py-4">
                {t('erp.saleDetail.anonymousSale')}
              </p>
            )}
          </div>
        </div>

        {/* Payment Information */}
        <div className="surface-card p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4">
            {t('erp.saleDetail.paymentInfo')}
          </h3>
          <div className="space-y-4">
            {/* Subtotal */}
            <div className="flex items-center justify-between py-2 border-b border-base-200">
              <span className="text-base-content/70">{t('erp.saleDetail.subtotal')}</span>
              <span className="font-semibold">{formatCurrency(sale.subtotal)}</span>
            </div>

            {/* Discount */}
            {(sale.discountAmount > 0 || sale.discountPercent > 0) && (
              <div className="flex items-center justify-between py-2 border-b border-base-200">
                <span className="text-base-content/70">{t('erp.saleDetail.discount')}</span>
                <span className="font-semibold text-warning">
                  -{formatCurrency(sale.discountAmount)}
                  {sale.discountPercent > 0 && ` (${sale.discountPercent}%)`}
                </span>
              </div>
            )}

            {/* Total */}
            <div className="flex items-center justify-between py-2 border-b border-base-200">
              <span className="text-base-content/70 font-medium">{t('erp.saleDetail.total')}</span>
              <span className="font-bold text-lg">{formatCurrency(sale.totalAmount)}</span>
            </div>

            {/* Paid Amount */}
            <div className="flex items-center justify-between py-2 border-b border-base-200">
              <span className="text-base-content/70">{t('erp.saleDetail.paid')}</span>
              <span className="font-semibold text-success">{formatCurrency(sale.paidAmount)}</span>
            </div>

            {/* Debt Amount */}
            {sale.debtAmount > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-base-200">
                <span className="text-base-content/70">{t('erp.saleDetail.debt')}</span>
                <span className="font-semibold text-error">{formatCurrency(sale.debtAmount)}</span>
              </div>
            )}

            {/* Payment Method */}
            <div className="flex items-center justify-between py-2">
              <span className="text-base-content/70">{t('erp.saleDetail.paymentMethod')}</span>
              <span className="badge badge-ghost">{getPaymentMethodLabel(sale.paymentMethod)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      {sale.items && sale.items.length > 0 && (
        <div className="surface-card">
          <div className="p-4 border-b border-base-200">
            <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 flex items-center gap-2">
              <Package className="h-4 w-4" />
              {t('erp.saleDetail.productsCount', { count: sale.items.length })}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('erp.saleDetail.product')}</th>
                  <th className="text-right">{t('erp.saleDetail.quantity')}</th>
                  <th className="text-right">{t('erp.saleDetail.price')}</th>
                  <th className="text-right">{t('erp.saleDetail.discount')}</th>
                  <th className="text-right">{t('common.sum')}</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, index) => (
                  <tr key={item.id || index}>
                    <td className="text-base-content/60">{index + 1}</td>
                    <td>
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-xs text-base-content/60">{item.productSku}</p>
                        {item.sizeString && (
                          <p className="text-xs text-base-content/50">{item.sizeString}</p>
                        )}
                      </div>
                    </td>
                    <td className="text-right">{t('erp.saleDetail.qtyPcs', { count: item.quantity })}</td>
                    <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="text-right">
                      {item.discount > 0 ? (
                        <span className="text-warning">-{formatCurrency(item.discount)}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="text-right font-semibold">{formatCurrency(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="text-right font-semibold">{t('erp.saleDetail.totalColon')}</td>
                  <td className="text-right font-bold text-lg">{formatCurrency(sale.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Additional Info */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Notes */}
        {sale.notes && (
          <div className="surface-card p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('erp.saleDetail.notes')}
            </h3>
            <p className="text-base-content/80 whitespace-pre-wrap">{sale.notes}</p>
          </div>
        )}

        {/* Created By */}
        {sale.createdByName && (
          <div className="surface-card p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-2">
              {t('erp.saleDetail.seller')}
            </h3>
            <p className="font-semibold">{sale.createdByName}</p>
          </div>
        )}
      </div>

      {/* Qaytarishlar tarixi */}
      {returns.length > 0 && (
        <div className="surface-card p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60">
            {t('erp.returns.title')}
          </h3>
          <div className="space-y-2">
            {returns.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-base-200/60 p-3">
                <div>
                  <span className="font-mono text-sm">{r.returnNumber}</span>
                  <span className="ml-3 text-sm text-base-content/60">{formatDate(r.returnDate)}</span>
                  {r.reason && <p className="mt-1 text-sm text-base-content/70">{r.reason}</p>}
                </div>
                <div className="text-right text-sm">
                  <div className="font-semibold">{formatCurrency(r.refundAmount)}</div>
                  {r.cashRefunded > 0 && (
                    <div className="text-base-content/60">
                      {t('erp.returns.cashRefunded')}: {formatCurrency(r.cashRefunded)}
                    </div>
                  )}
                  {r.debtReduced > 0 && (
                    <div className="text-base-content/60">
                      {t('erp.returns.debtReduced')}: {formatCurrency(r.debtReduced)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Back Button */}
      <div className="flex justify-start">
        <Button variant="ghost" onClick={() => navigate('/admin/sales')}>
          <ArrowLeft className="h-4 w-4" />
          {t('erp.saleDetail.backToSales')}
        </Button>
      </div>

      {/* Qaytarish modali */}
      <ModalPortal isOpen={showReturn} onClose={() => setShowReturn(false)}>
        <div className="w-full max-w-lg rounded-2xl bg-base-100 p-6 shadow-2xl">
          <h3 className="text-lg font-semibold">{t('erp.returns.modalTitle')}</h3>
          <p className="mt-1 text-sm text-base-content/60">{t('erp.returns.modalHint')}</p>

          <div className="mt-4 space-y-3">
            {(sale.items ?? []).map((item) => {
              const max = returnableQty(item);
              return (
                <div key={item.id} className="flex items-center gap-3 rounded-xl bg-base-200/60 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.productName}</p>
                    <p className="text-xs text-base-content/60">
                      {t('erp.returns.available')}: {max} / {item.quantity}
                    </p>
                  </div>
                  <input
                    type="number"
                    className="input input-bordered w-24"
                    min={0}
                    max={max}
                    disabled={max === 0}
                    value={returnQty[item.id!] ?? 0}
                    onChange={(e) =>
                      setReturnQty((prev) => ({
                        ...prev,
                        [item.id!]: Math.max(0, Math.min(max, Number(e.target.value) || 0)),
                      }))
                    }
                  />
                </div>
              );
            })}
            <label className="form-control">
              <span className="label-text mb-1">{t('erp.returns.reason')}</span>
              <input
                className="input input-bordered"
                maxLength={500}
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
              />
            </label>
          </div>

          {estimatedRefund > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-base-200 px-4 py-3">
              <span className="font-medium">{t('erp.returns.estimatedRefund')}</span>
              <span className="text-lg font-semibold">{formatCurrency(estimatedRefund)}</span>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowReturn(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleReturn}
              loading={returning}
              disabled={Object.values(returnQty).every((q) => !q)}
            >
              {t('erp.returns.submit')}
            </Button>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
