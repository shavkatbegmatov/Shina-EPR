import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Package, ChevronRight } from 'lucide-react';
import { Card, Badge, EmptyState, buttonVariants } from '@/ui';
import { formatCurrency } from '../../config/constants';
import { useOrderStore } from '../store/orderStore';
import { usePortalAuthStore } from '../../portal/store/portalAuthStore';
import { accountApi, type AccountOrder } from '../data/accountApi';

function formatDate(d: number | string, lang: string): string {
  return new Date(d).toLocaleString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info';
const STATUS_TONE: Record<string, Tone> = {
  NEW: 'info', CONFIRMED: 'success', COMPLETED: 'success', CANCELLED: 'error',
};
const PAY_TONE: Record<string, Tone> = {
  PAID: 'success', PENDING: 'warning', PROCESSING: 'warning',
  FAILED: 'error', CANCELLED: 'error', REFUNDED: 'neutral',
};

/**
 * Buyurtmalarim. Login qilgan mijoz uchun backend'dan (`/v1/account/orders`);
 * guest yoki backend xato (soft-401) bo'lsa client-side localStorage + login taklifi.
 */
export function OrdersPage() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = usePortalAuthStore();
  const localOrders = useOrderStore((s) => s.orders);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['account-orders'],
    queryFn: () => accountApi.myOrders(0, 50),
    enabled: isAuthenticated,
  });

  // --- Login qilgan + backend OK: backend buyurtmalari ---
  if (isAuthenticated && !isError) {
    if (isLoading) {
      return (
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <h1 className="section-title mb-6">{t('shop.orders.title')}</h1>
          <p className="text-sm text-base-content/60">{t('shop.orders.loading')}</p>
        </div>
      );
    }
    const orders = data?.content ?? [];
    if (orders.length === 0) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <EmptyState
            icon={Package}
            title={t('shop.orders.empty')}
            description={t('shop.orders.emptyHint')}
            action={<Link to="/katalog" className={buttonVariants({ variant: 'primary' })}>{t('shop.nav.catalog')}</Link>}
          />
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="section-title mb-6">{t('shop.orders.title')}</h1>
        <ul className="space-y-4">
          {orders.map((o: AccountOrder) => {
            const itemCount = o.items.reduce((s, i) => s + i.quantity, 0);
            const firstNames = o.items.map((i) => i.productName).slice(0, 2).join(', ');
            return (
              <li key={o.orderNo}>
                <Link to={`/buyurtma/${o.orderNo}`}>
                  <Card className="flex items-center gap-4 p-5 transition-shadow hover:shadow-strong">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <Package size={22} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-semibold text-primary">{o.orderNo}</span>
                        <Badge tone={STATUS_TONE[o.status] ?? 'neutral'}>{t('shop.orders.status.' + o.status, { defaultValue: o.status })}</Badge>
                        <Badge tone={PAY_TONE[o.paymentStatus] ?? 'neutral'}>{t('shop.order.payStatus.' + o.paymentStatus, { defaultValue: o.paymentStatus })}</Badge>
                      </div>
                      <p className="mt-1 truncate text-sm text-base-content/60">
                        {t('shop.orders.itemsCount', { count: itemCount })} · {firstNames}{o.items.length > 2 ? '…' : ''}
                      </p>
                      <p className="mt-0.5 text-xs text-base-content/40">{formatDate(o.createdAt, i18n.language)}</p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="font-bold text-primary">{formatCurrency(o.totalAmount)}</p>
                    </div>
                    <ChevronRight size={18} className="shrink-0 text-base-content/30" />
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // --- Guest (yoki backend xato): localStorage + login taklifi ---
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {!isAuthenticated && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-base-200 bg-base-200/40 p-4">
          <p className="text-sm text-base-content/70">{t('shop.account.loginPrompt')}</p>
          <Link to="/kirish?redirect=/buyurtmalarim" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
            {t('shop.account.loginCta')}
          </Link>
        </div>
      )}
      {localOrders.length === 0 ? (
        <EmptyState
          icon={Package}
          title={t('shop.orders.empty')}
          description={t('shop.orders.emptyHint')}
          action={<Link to="/katalog" className={buttonVariants({ variant: 'primary' })}>{t('shop.nav.catalog')}</Link>}
        />
      ) : (
        <>
          <h1 className="section-title mb-6">{t('shop.orders.title')}</h1>
          <ul className="space-y-4">
            {localOrders.map((o) => {
              const itemCount = o.items.reduce((s, i) => s + i.qty, 0);
              const firstNames = o.items.map((i) => i.product.name).slice(0, 2).join(', ');
              return (
                <li key={o.orderNo}>
                  <Link to={`/buyurtma/${o.orderNo}`}>
                    <Card className="flex items-center gap-4 p-5 transition-shadow hover:shadow-strong">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                        <Package size={22} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-semibold text-primary">{o.orderNo}</span>
                          <Badge tone="success">{t('shop.orders.statusAccepted')}</Badge>
                        </div>
                        <p className="mt-1 truncate text-sm text-base-content/60">
                          {t('shop.orders.itemsCount', { count: itemCount })} · {firstNames}{o.items.length > 2 ? '…' : ''}
                        </p>
                        <p className="mt-0.5 text-xs text-base-content/40">{formatDate(o.createdAt, i18n.language)}</p>
                      </div>
                      <div className="hidden text-right sm:block">
                        <p className="font-bold text-primary">{formatCurrency(o.total)}</p>
                      </div>
                      <ChevronRight size={18} className="shrink-0 text-base-content/30" />
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
