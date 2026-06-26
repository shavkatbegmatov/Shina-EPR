import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, Trash2 } from 'lucide-react';
import { EmptyState, Button, buttonVariants } from '@/ui';
import type { Product } from '../../types';
import { ProductCard } from '../components/ProductCard';
import { useWishlistStore } from '../store/wishlistStore';
import { useCatalogProducts } from '../data/useCatalog';

export function WishlistPage() {
  const { t } = useTranslation();
  const ids = useWishlistStore((s) => s.ids);
  const clear = useWishlistStore((s) => s.clear);
  const { products } = useCatalogProducts();

  // Saqlangan tartibda (eng yangi birinchi) — ids tartibi bo'yicha
  const saved = ids
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));

  if (saved.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={Heart}
          title={t('shop.wishlist.empty')}
          description={t('shop.wishlist.emptyHint')}
          action={<Link to="/katalog" className={buttonVariants({ variant: 'primary' })}>{t('shop.nav.catalog')}</Link>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="section-title">{t('shop.wishlist.title')}</h1>
        <Button variant="ghost" size="sm" onClick={clear} className="gap-1">
          <Trash2 size={15} /> {t('shop.wishlist.clear')}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {saved.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
