import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { Button } from '@/ui';
import { formatCurrency } from '../../config/constants';
import { useCartStore, selectCartSubtotal } from '../store/cartStore';
import { ProductImage } from './ProductImage';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const subtotal = useCartStore(selectCartSubtotal);

  return (
    <Dialog open={open} onClose={onClose} className="relative z-modal">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition duration-200 data-[closed]:opacity-0"
      />
      <div className="fixed inset-0 flex justify-end">
        <DialogPanel
          transition
          className="flex h-full w-full max-w-md flex-col border-l border-base-200 bg-base-100 shadow-strong transition duration-300 data-[closed]:translate-x-full"
        >
          <div className="flex items-center justify-between border-b border-base-200 px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <ShoppingBag size={20} className="text-primary" /> {t('shop.cart.title')}
            </DialogTitle>
            <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-square -mr-2" aria-label={t('common.close')}>
              <X size={20} />
            </button>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <ShoppingBag size={48} className="text-base-content/20" />
              <p className="font-medium">{t('shop.cart.empty')}</p>
              <p className="text-sm text-base-content/50">{t('shop.cart.emptyHint')}</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <ul className="space-y-4">
                  {items.map(({ product, qty }) => (
                    <li key={product.id} className="flex gap-3">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-base-200">
                        <ProductImage src={product.imageUrl} alt={product.name} />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-semibold">{product.name}</span>
                        <span className="font-mono text-xs text-base-content/60">{product.sizeString}</span>
                        <span className="mt-0.5 text-sm font-bold text-primary">{formatCurrency(product.sellingPrice)}</span>
                        <div className="mt-auto flex items-center gap-2 pt-2">
                          <div className="flex items-center rounded-lg border border-base-300">
                            <button type="button" onClick={() => setQty(product.id, qty - 1)} className="grid h-8 w-8 place-items-center hover:bg-base-200" aria-label={t('shop.cart.decrease')}>
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                            <button type="button" onClick={() => setQty(product.id, qty + 1)} className="grid h-8 w-8 place-items-center hover:bg-base-200" aria-label={t('shop.cart.increase')}>
                              <Plus size={14} />
                            </button>
                          </div>
                          <button type="button" onClick={() => remove(product.id)} className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-base-content/50 hover:bg-error/10 hover:text-error" aria-label={t('shop.cart.remove')}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-base-200 px-5 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-base-content/70">{t('shop.cart.total')}</span>
                  <span className="text-xl font-extrabold text-primary">{formatCurrency(subtotal)}</span>
                </div>
                <Button
                  block
                  onClick={() => { onClose(); navigate('/magazin/checkout'); }}
                >
                  {t('shop.cart.checkout')}
                </Button>
                <button type="button" onClick={onClose} className="mt-2 w-full text-center text-sm text-base-content/60 hover:text-primary">
                  {t('shop.cart.continue')}
                </button>
              </div>
            </>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
