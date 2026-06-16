import { useTranslation } from 'react-i18next';
import type { Product } from '../../types';
import { ProductCard } from './ProductCard';
import { useRecentStore } from '../store/recentStore';
import { useCatalogProducts } from '../data/useCatalog';

interface RecentlyViewedProps {
  /** PDP'da joriy mahsulotni ro'yxatdan chiqarish uchun */
  excludeId?: number;
  className?: string;
  limit?: number;
}

export function RecentlyViewed({ excludeId, className, limit = 4 }: RecentlyViewedProps) {
  const { t } = useTranslation();
  const ids = useRecentStore((s) => s.ids);
  const { products } = useCatalogProducts();

  const items = ids
    .filter((id) => id !== excludeId)
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p))
    .slice(0, limit);

  if (items.length === 0) return null;

  return (
    <section className={className}>
      <h2 className="section-title mb-6">{t('shop.recent.title')}</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}
