import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Minus, Plus, ShoppingCart, Check, ArrowLeft } from 'lucide-react';
import { Card, Badge, Button, EmptyState, buttonVariants, cn } from '@/ui';
import { formatCurrency } from '../../config/constants';
import { ProductImage } from '../components/ProductImage';
import { ProductCard } from '../components/ProductCard';
import { useProduct, useRelatedProducts } from '../data/useCatalog';
import { useCartStore } from '../store/cartStore';

export function ProductDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const add = useCartStore((s) => s.add);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const { product } = useProduct(id);
  const related = useRelatedProducts(product);

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          title={t('shop.product.notFound')}
          description={t('shop.product.notFoundHint')}
          action={<Link to="/magazin/katalog" className={buttonVariants({ variant: 'primary' })}>{t('shop.nav.catalog')}</Link>}
        />
      </div>
    );
  }

  const outOfStock = product.quantity <= 0;
  const handleAdd = () => {
    add(product, qty);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  const specs: Array<[string, string | undefined]> = [
    [t('shop.product.size'), product.sizeString],
    [t('shop.product.season'), product.season ? t(`shop.season.${product.season}`) : undefined],
    [t('shop.product.loadSpeed'), product.loadIndex || product.speedRating ? `${product.loadIndex ?? ''}${product.speedRating ?? ''}` : undefined],
    [t('shop.product.brand'), product.brandName],
    [t('shop.product.category'), product.categoryName],
    [t('shop.product.sku'), product.sku],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-base-content/50">
        <Link to="/magazin/katalog" className="hover:text-primary">{t('shop.nav.catalog')}</Link>
        <ChevronRight size={14} />
        <span className="truncate text-base-content/80">{product.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Image */}
        <Card padding="none" className="overflow-hidden">
          <div className="relative aspect-square">
            <ProductImage src={product.imageUrl} alt={product.name} />
            {product.season && (
              <Badge tone="primary" className="absolute left-4 top-4">{t(`shop.season.${product.season}`)}</Badge>
            )}
          </div>
        </Card>

        {/* Info */}
        <div>
          <span className="text-sm font-medium uppercase tracking-wide text-base-content/50">{product.brandName}</span>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">{product.name}</h1>
          <p className="mt-1 font-mono text-base-content/70">{product.sizeString}</p>

          <div className="mt-5 flex items-center gap-3">
            <span className="text-3xl font-extrabold text-primary">{formatCurrency(product.sellingPrice)}</span>
            {outOfStock ? (
              <Badge tone="neutral">{t('shop.product.outOfStock')}</Badge>
            ) : product.lowStock ? (
              <Badge tone="error">{t('shop.product.lowStock')}</Badge>
            ) : (
              <Badge tone="success">{t('shop.product.inStock')}</Badge>
            )}
          </div>

          {product.description && (
            <p className="mt-4 text-sm leading-relaxed text-base-content/70">{product.description}</p>
          )}

          {/* Add to cart */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-xl border border-base-300">
              <button type="button" onClick={() => setQty((n) => Math.max(1, n - 1))} className="grid h-12 w-12 place-items-center hover:bg-base-200" aria-label={t('shop.cart.decrease')} disabled={outOfStock}>
                <Minus size={16} />
              </button>
              <span className="w-10 text-center font-semibold">{qty}</span>
              <button type="button" onClick={() => setQty((n) => n + 1)} className="grid h-12 w-12 place-items-center hover:bg-base-200" aria-label={t('shop.cart.increase')} disabled={outOfStock}>
                <Plus size={16} />
              </button>
            </div>
            <Button size="lg" variant={added ? 'success' : 'primary'} disabled={outOfStock} onClick={handleAdd} className="flex-1 gap-2 sm:flex-none">
              {added ? <Check size={18} /> : <ShoppingCart size={18} />}
              {added ? t('shop.cart.added') : t('shop.product.addToCart')}
            </Button>
          </div>

          {/* Specs */}
          <Card className="mt-8 p-0">
            <h2 className="border-b border-base-200 px-5 py-3 font-semibold">{t('shop.product.specs')}</h2>
            <dl className="divide-y divide-base-200">
              {specs.filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 px-5 py-3 text-sm">
                  <dt className="text-base-content/60">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Link to="/magazin/katalog" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mt-6 gap-1')}>
            <ArrowLeft size={15} /> {t('shop.product.backToCatalog')}
          </Link>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="section-title mb-6">{t('shop.product.related')}</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
