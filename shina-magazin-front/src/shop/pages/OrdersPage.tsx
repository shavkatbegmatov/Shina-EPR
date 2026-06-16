import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, ChevronRight } from 'lucide-react';
import { Card, Badge, EmptyState, buttonVariants } from '@/ui';
import { formatCurrency } from '../../config/constants';
import { useOrderStore } from '../store/orderStore';

function formatDate(ts: number, lang: string): string {
  return new Date(ts).toLocaleString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function OrdersPage() {
  const { t, i18n } = useTranslation();
  const orders = useOrderStore((s) => s.orders);

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={Package}
          title={t('shop.orders.empty')}
          description={t('shop.orders.emptyHint')}
          action={<Link to="/magazin/katalog" className={buttonVariants({ variant: 'primary' })}>{t('shop.nav.catalog')}</Link>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="section-title mb-6">{t('shop.orders.title')}</h1>
      <ul className="space-y-4">
        {orders.map((o) => {
          const itemCount = o.items.reduce((s, i) => s + i.qty, 0);
          const firstNames = o.items.map((i) => i.product.name).slice(0, 2).join(', ');
          return (
            <li key={o.orderNo}>
              <Link to={`/magazin/buyurtma/${o.orderNo}`}>
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
                      {t('shop.orders.itemsCount', { count: itemCount })} · {firstNames}
                      {o.items.length > 2 ? '…' : ''}
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
    </div>
  );
}
