import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, Check, Minus, Plus, ArrowRight } from 'lucide-react';
import { Modal, Button, Badge, buttonVariants, cn } from '@/ui';
import { formatCurrency } from '../../config/constants';
import { useQuickViewStore } from '../store/quickViewStore';
import { useCatalogProducts } from '../data/useCatalog';
import { useCartStore } from '../store/cartStore';
import { ProductImage } from './ProductImage';
import { WishlistButton } from './WishlistButton';

/** Tezkor ko'rish modali — katalogdan chiqmasdan mahsulotni ko'rish va savatga qo'shish. */
export function QuickViewModal() {
  const { t } = useTranslation();
  const openId = useQuickViewStore((s) => s.openId);
  const close = useQuickViewStore((s) => s.close);
  const { products } = useCatalogProducts();
  const add = useCartStore((s) => s.add);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  // Boshqa mahsulot ochilganda holatni tiklash
  useEffect(() => {
    setQty(1);
    setAdded(false);
  }, [openId]);

  const product = products.find((p) => p.id === openId);
  const outOfStock = product ? product.quantity <= 0 : false;

  const handleAdd = () => {
    if (!product) return;
    add(product, qty);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  };

  return (
    <Modal open={openId !== null} onClose={close} size="lg" closeButton>
      {product && (
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-xl border border-base-200">
            <ProductImage src={product.imageUrl} alt={product.name} />
            {product.season && (
              <Badge tone="primary" className="absolute left-3 top-3">{t(`shop.season.${product.season}`)}</Badge>
            )}
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-medium uppercase tracking-wide text-base-content/50">{product.brandName}</span>
            <h2 className="mt-1 text-xl font-bold leading-tight">{product.name}</h2>
            <p className="mt-0.5 font-mono text-sm text-base-content/70">{product.sizeString}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-2xl font-extrabold text-primary">{formatCurrency(product.sellingPrice)}</span>
              {outOfStock ? (
                <Badge tone="neutral">{t('shop.product.outOfStock')}</Badge>
              ) : product.lowStock ? (
                <Badge tone="error">{t('shop.product.lowStock')}</Badge>
              ) : (
                <Badge tone="success">{t('shop.product.inStock')}</Badge>
              )}
            </div>

            {product.description && (
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-base-content/70">{product.description}</p>
            )}

            <div className="mt-auto pt-5">
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-xl border border-base-300">
                  <button type="button" onClick={() => setQty((n) => Math.max(1, n - 1))} className="grid h-11 w-11 place-items-center hover:bg-base-200" aria-label={t('shop.cart.decrease')} disabled={outOfStock}>
                    <Minus size={16} />
                  </button>
                  <span className="w-9 text-center font-semibold">{qty}</span>
                  <button type="button" onClick={() => setQty((n) => n + 1)} className="grid h-11 w-11 place-items-center hover:bg-base-200" aria-label={t('shop.cart.increase')} disabled={outOfStock}>
                    <Plus size={16} />
                  </button>
                </div>
                <Button variant={added ? 'success' : 'primary'} disabled={outOfStock} onClick={handleAdd} className="flex-1 gap-2">
                  {added ? <Check size={18} /> : <ShoppingCart size={18} />}
                  {added ? t('shop.cart.added') : t('shop.product.addToCart')}
                </Button>
                <WishlistButton productId={product.id} variant="inline" />
              </div>
              <Link to={`/mahsulot/${product.id}`} onClick={close} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mt-3 w-full gap-1')}>
                {t('shop.quickView.details')} <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
