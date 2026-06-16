import { useTranslation } from 'react-i18next';
import { Heart } from 'lucide-react';
import { cn } from '@/ui';
import { useWishlistStore } from '../store/wishlistStore';

interface WishlistButtonProps {
  productId: number;
  /** 'overlay' = karta ustidagi dumaloq tugma; 'inline' = oddiy tugma (PDP) */
  variant?: 'overlay' | 'inline';
  size?: number;
  className?: string;
}

export function WishlistButton({ productId, variant = 'overlay', size = 18, className }: WishlistButtonProps) {
  const { t } = useTranslation();
  const saved = useWishlistStore((s) => s.ids.includes(productId));
  const toggle = useWishlistStore((s) => s.toggle);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(productId);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={saved ? t('shop.wishlist.remove') : t('shop.wishlist.add')}
      title={saved ? t('shop.wishlist.remove') : t('shop.wishlist.add')}
      className={cn(
        'grid place-items-center transition-colors',
        variant === 'overlay'
          ? 'h-9 w-9 rounded-full border border-base-200 bg-base-100/90 shadow-soft backdrop-blur hover:bg-base-100'
          : 'h-12 w-12 rounded-xl border border-base-300 hover:bg-base-200',
        className
      )}
    >
      <Heart
        size={size}
        className={cn('transition-colors', saved ? 'fill-error text-error' : 'text-base-content/50')}
      />
    </button>
  );
}
