import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Package } from 'lucide-react';
import { portalApiClient } from '../api/portal.api';
import PortalHeader from '../components/layout/PortalHeader';
import type { PortalSale } from '../types/portal.types';
import { format } from 'date-fns';

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount);
}

export default function PortalPurchaseDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [purchase, setPurchase] = useState<PortalSale | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      portalApiClient.getPurchaseDetails(parseInt(id))
        .then(setPurchase)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id]);

  const getPaymentBadge = (status: string) => {
    const styles = {
      PAID: 'badge-success',
      PARTIAL: 'badge-warning',
      UNPAID: 'badge-error',
    };
    return styles[status as keyof typeof styles] || 'badge-ghost';
  };

  if (loading) {
    return (
      <div className="flex flex-col">
        <PortalHeader title={t('purchases.title')} showBack />
        <div className="flex items-center justify-center h-64">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="flex flex-col">
        <PortalHeader title={t('purchases.title')} showBack />
        <div className="text-center py-12">
          <p className="text-base-content/60">{t('common.noData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PortalHeader title={purchase.invoiceNumber} showBack />

      <div className="p-4 space-y-4">
        {/* Header Info */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-base-content/60">{t('purchases.date')}</p>
                <p className="font-medium">
                  {format(new Date(purchase.saleDate), 'dd.MM.yyyy HH:mm')}
                </p>
              </div>
              <span className={`badge ${getPaymentBadge(purchase.paymentStatus)}`}>
                {t(`payment.${purchase.paymentStatus.toLowerCase()}`)}
              </span>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Package size={18} />
              {t('purchases.items')}
            </h3>
            <div className="space-y-3">
              {purchase.items?.map((item, index) => (
                <div key={index} className="flex justify-between items-start py-2 border-b border-base-200 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.productName}</p>
                    <p className="text-xs text-base-content/60">{item.sizeString}</p>
                    <p className="text-xs text-base-content/60">
                      {item.quantity} x {formatMoney(item.unitPrice)} {t('common.sum')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      {formatMoney(item.totalPrice)} {t('common.sum')}
                    </p>
                    {item.discount > 0 && (
                      <p className="text-xs text-success">-{formatMoney(item.discount)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-base-content/60">{t('purchases.subtotal')}</span>
                <span>{formatMoney(purchase.subtotal)} {t('common.sum')}</span>
              </div>
              {purchase.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>{t('purchases.discount')}</span>
                  <span>-{formatMoney(purchase.discountAmount)} {t('common.sum')}</span>
                </div>
              )}
              <div className="divider my-1"></div>
              <div className="flex justify-between font-bold">
                <span>{t('purchases.total')}</span>
                <span>{formatMoney(purchase.totalAmount)} {t('common.sum')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-base-content/60">{t('purchases.paid')}</span>
                <span className="text-success">{formatMoney(purchase.paidAmount)} {t('common.sum')}</span>
              </div>
              {purchase.debtAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/60">{t('purchases.debt')}</span>
                  <span className="text-error">{formatMoney(purchase.debtAmount)} {t('common.sum')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {purchase.notes && (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <p className="text-sm text-base-content/60">{purchase.notes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
