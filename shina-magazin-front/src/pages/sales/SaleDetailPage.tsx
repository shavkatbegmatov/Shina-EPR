import { useCallback, useEffect, useState } from 'react';
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
} from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/ui';
import { salesApi } from '../../api/sales.api';
import { formatCurrency, formatDate } from '../../config/constants';
import type { Sale } from '../../types';

export function SaleDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSale = useCallback(async () => {
    if (!id) return;
    try {
      const data = await salesApi.getById(Number(id));
      setSale(data);
    } catch (error) {
      console.error('Failed to load sale:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadSale();
  }, [loadSale]);

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
        </div>
      </div>

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

      {/* Back Button */}
      <div className="flex justify-start">
        <Button variant="ghost" onClick={() => navigate('/admin/sales')}>
          <ArrowLeft className="h-4 w-4" />
          {t('erp.saleDetail.backToSales')}
        </Button>
      </div>
    </div>
  );
}
