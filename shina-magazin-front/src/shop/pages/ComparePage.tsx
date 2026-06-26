import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Scale, Trash2, ShoppingCart, X } from 'lucide-react';
import { EmptyState, Button, Badge, buttonVariants } from '@/ui';
import type { Product } from '../../types';
import { formatCurrency } from '../../config/constants';
import { useCompareStore } from '../store/compareStore';
import { useCatalogProducts } from '../data/useCatalog';
import { useCartStore } from '../store/cartStore';
import { ProductImage } from '../components/ProductImage';

export function ComparePage() {
  const { t } = useTranslation();
  const ids = useCompareStore((s) => s.ids);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);
  const { products } = useCatalogProducts();
  const add = useCartStore((s) => s.add);

  const items = ids
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={Scale}
          title={t('shop.compare.empty')}
          description={t('shop.compare.emptyHint')}
          action={<Link to="/katalog" className={buttonVariants({ variant: 'primary' })}>{t('shop.nav.catalog')}</Link>}
        />
      </div>
    );
  }

  const rows: Array<{ label: string; render: (p: Product) => ReactNode }> = [
    { label: t('shop.product.brand'), render: (p) => p.brandName ?? '—' },
    { label: t('shop.product.size'), render: (p) => <span className="font-mono">{p.sizeString}</span> },
    { label: t('shop.product.season'), render: (p) => (p.season ? t(`shop.season.${p.season}`) : '—') },
    { label: t('shop.product.loadSpeed'), render: (p) => `${p.loadIndex ?? ''}${p.speedRating ?? ''}` || '—' },
    {
      label: t('shop.compare.priceRow'),
      render: (p) => <span className="font-bold text-primary">{formatCurrency(p.sellingPrice)}</span>,
    },
    {
      label: t('shop.compare.stockRow'),
      render: (p) =>
        p.quantity <= 0 ? (
          <Badge tone="neutral">{t('shop.product.outOfStock')}</Badge>
        ) : p.lowStock ? (
          <Badge tone="error">{t('shop.product.lowStock')}</Badge>
        ) : (
          <Badge tone="success">{t('shop.product.inStock')}</Badge>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="section-title">{t('shop.compare.title')}</h1>
        <Button variant="ghost" size="sm" onClick={clear} className="gap-1">
          <Trash2 size={15} /> {t('shop.compare.clear')}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-base-200">
        <table className="w-full min-w-[640px] border-collapse bg-base-100">
          <thead>
            <tr>
              <th className="w-32 bg-base-100 p-3" />
              {items.map((p) => (
                <th key={p.id} className="border-l border-base-200 p-3 align-top font-normal">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => remove(p.id)}
                      aria-label={t('shop.compare.remove')}
                      className="absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-full border border-base-200 bg-base-100 text-base-content/50 hover:text-error"
                    >
                      <X size={14} />
                    </button>
                    <Link to={`/mahsulot/${p.id}`} className="block">
                      <div className="mx-auto h-28 w-28 overflow-hidden rounded-xl border border-base-200">
                        <ProductImage src={p.imageUrl} alt={p.name} />
                      </div>
                      <p className="mx-auto mt-2 line-clamp-2 max-w-[10rem] text-sm font-semibold hover:text-primary">{p.name}</p>
                    </Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-base-200">
                <td className="p-3 text-sm font-medium text-base-content/60">{row.label}</td>
                {items.map((p) => (
                  <td key={p.id} className="border-l border-base-200 p-3 text-center text-sm">{row.render(p)}</td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-base-200">
              <td className="p-3" />
              {items.map((p) => (
                <td key={p.id} className="border-l border-base-200 p-3 text-center">
                  <Button size="sm" disabled={p.quantity <= 0} onClick={() => add(p)} className="gap-1">
                    <ShoppingCart size={15} /> {t('shop.product.addToCart')}
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
