import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Package, Phone, MapPin, CreditCard } from 'lucide-react';
import { Card, EmptyState, buttonVariants } from '@/ui';
import { formatCurrency } from '../../config/constants';
import { useOrderStore } from '../store/orderStore';
import { ProductImage } from '../components/ProductImage';

export function OrderConfirmationPage() {
  const { t } = useTranslation();
  const { orderNo } = useParams();
  const order = useOrderStore((s) => s.orders.find((o) => o.orderNo === orderNo));

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={Package}
          title={t('shop.order.notFound')}
          description={t('shop.order.notFoundHint')}
          action={<Link to="/magazin" className={buttonVariants({ variant: 'primary' })}>{t('shop.nav.home')}</Link>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {/* Success header */}
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-success/10 text-success">
          <CheckCircle2 size={36} />
        </span>
        <h1 className="text-2xl font-bold">{t('shop.order.success')}</h1>
        <p className="mt-2 text-base-content/60">{t('shop.order.thanks')}</p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-base-200 px-4 py-1.5 text-sm font-semibold">
          {t('shop.order.orderNo')}: <span className="font-mono text-primary">{order.orderNo}</span>
        </p>
      </div>

      {/* Items */}
      <Card className="mb-4 p-5">
        <h2 className="mb-4 font-semibold">{t('shop.order.items')}</h2>
        <ul className="space-y-3">
          {order.items.map(({ product, qty }) => (
            <li key={product.id} className="flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-base-200">
                <ProductImage src={product.imageUrl} alt={product.name} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{product.name}</p>
                <p className="text-xs text-base-content/50">{product.sizeString} · {qty} × {formatCurrency(product.sellingPrice)}</p>
              </div>
              <span className="text-sm font-semibold">{formatCurrency(product.sellingPrice * qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-base-200 pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-base-content/60">{t('shop.checkout.subtotal')}</dt><dd>{formatCurrency(order.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-base-content/60">{t('shop.checkout.deliveryFee')}</dt><dd>{order.deliveryFee === 0 ? <span className="text-success">{t('shop.checkout.free')}</span> : formatCurrency(order.deliveryFee)}</dd></div>
          <div className="flex justify-between border-t border-base-200 pt-2 text-base font-bold"><dt>{t('shop.checkout.total')}</dt><dd className="text-primary">{formatCurrency(order.total)}</dd></div>
        </dl>
      </Card>

      {/* Details */}
      <Card className="mb-6 grid gap-4 p-5 sm:grid-cols-3">
        <div className="flex items-start gap-2">
          <Phone size={16} className="mt-0.5 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-medium">{order.contact.name}</p>
            <p className="text-base-content/60">{order.contact.phone}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin size={16} className="mt-0.5 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-medium">{t(`shop.checkout.${order.delivery.method}`)}</p>
            {order.delivery.address && <p className="text-base-content/60">{order.delivery.address}</p>}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <CreditCard size={16} className="mt-0.5 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-medium">{t(`shop.checkout.pay.${order.payment}`)}</p>
          </div>
        </div>
      </Card>

      <div className="surface-soft mb-6 rounded-xl p-4 text-center text-sm text-base-content/70">
        {t('shop.order.contactSoon')}
      </div>

      <div className="flex justify-center gap-3">
        <Link to="/magazin/katalog" className={buttonVariants({ variant: 'outline' })}>{t('shop.order.continueShopping')}</Link>
        <Link to="/magazin" className={buttonVariants({ variant: 'primary' })}>{t('shop.order.backHome')}</Link>
      </div>
    </div>
  );
}
