import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, Check, Eye } from 'lucide-react';
import { useState } from 'react';
import { Card, Badge, Button, cn } from '@/ui';
import type { Product } from '../../types';
import { formatCurrency } from '../../config/constants';
import { ProductImage } from './ProductImage';
import { WishlistButton } from './WishlistButton';
import { useCartStore } from '../store/cartStore';
import { useQuickViewStore } from '../store/quickViewStore';

interface ProductCardProps {
  product: Product;
}

const SEASON_TONE: Record<string, 'info' | 'warning' | 'success'> = {
  SUMMER: 'warning',
  WINTER: 'info',
  ALL_SEASON: 'success',
};

export function ProductCard({ product }: ProductCardProps) {
  const { t } = useTranslation();
  const add = useCartStore((s) => s.add);
  const openQuickView = useQuickViewStore((s) => s.open);
  const [justAdded, setJustAdded] = useState(false);

  const outOfStock = product.quantity <= 0;
  const href = `/magazin/mahsulot/${product.id}`;

  const handleAdd = () => {
    add(product);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1400);
  };

  return (
    <Card padding="none" className="group flex flex-col overflow-hidden transition-shadow hover:shadow-strong">
      <div className="relative aspect-square overflow-hidden bg-base-200/40">
        <Link to={href} className="block h-full w-full">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            className="transition-transform duration-300 group-hover:scale-105"
          />
        </Link>
        <div className="absolute left-3 top-3 flex flex-col items-start gap-2">
          {product.season && (
            <Badge tone={SEASON_TONE[product.season]}>{t(`shop.season.${product.season}`)}</Badge>
          )}
          {outOfStock ? (
            <Badge tone="neutral">{t('shop.product.outOfStock')}</Badge>
          ) : product.lowStock ? (
            <Badge tone="error">{t('shop.product.lowStock')}</Badge>
          ) : null}
        </div>
        <WishlistButton productId={product.id} className="absolute right-3 top-3 z-10" />
        <button
          type="button"
          onClick={() => openQuickView(product.id)}
          className="absolute inset-x-0 bottom-0 z-10 flex translate-y-full items-center justify-center gap-1.5 border-t border-base-200 bg-base-100/95 py-2.5 text-sm font-medium backdrop-blur transition-transform duration-200 group-hover:translate-y-0"
        >
          <Eye size={16} /> {t('shop.quickView.button')}
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-base-content/50">
          {product.brandName}
        </span>
        <Link to={href} className="line-clamp-2 font-semibold leading-snug hover:text-primary">
          {product.name}
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/60">
          <span className="font-mono font-semibold text-base-content/80">{product.sizeString}</span>
          {(product.loadIndex || product.speedRating) && (
            <span className="pill">{product.loadIndex}{product.speedRating}</span>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <span className="text-lg font-bold text-primary">{formatCurrency(product.sellingPrice)}</span>
          <Button
            size="sm"
            variant={justAdded ? 'success' : 'primary'}
            disabled={outOfStock}
            onClick={handleAdd}
            aria-label={t('shop.product.addToCart')}
            className={cn('shrink-0', outOfStock && 'opacity-60')}
          >
            {justAdded ? <Check size={16} /> : <ShoppingCart size={16} />}
            <span className="hidden sm:inline">{justAdded ? t('shop.cart.added') : t('shop.product.addToCart')}</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
