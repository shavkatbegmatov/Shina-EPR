import { useTranslation } from 'react-i18next';
import { Scale } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/ui';
import { useCompareStore, COMPARE_MAX } from '../store/compareStore';

interface CompareButtonProps {
  productId: number;
  variant?: 'overlay' | 'inline';
  size?: number;
  className?: string;
}

export function CompareButton({ productId, variant = 'overlay', size = 18, className }: CompareButtonProps) {
  const { t } = useTranslation();
  const inCompare = useCompareStore((s) => s.ids.includes(productId));
  const count = useCompareStore((s) => s.ids.length);
  const toggle = useCompareStore((s) => s.toggle);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inCompare && count >= COMPARE_MAX) {
      toast(t('shop.compare.max', { count: COMPARE_MAX }));
      return;
    }
    toggle(productId);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={inCompare}
      aria-label={inCompare ? t('shop.compare.remove') : t('shop.compare.add')}
      title={inCompare ? t('shop.compare.remove') : t('shop.compare.add')}
      className={cn(
        'grid place-items-center transition-colors',
        variant === 'overlay'
          ? 'h-9 w-9 rounded-full border border-base-200 bg-base-100/90 shadow-soft backdrop-blur hover:bg-base-100'
          : 'h-12 w-12 rounded-xl border border-base-300 hover:bg-base-200',
        className
      )}
    >
      <Scale size={size} className={cn('transition-colors', inCompare ? 'text-primary' : 'text-base-content/50')} />
    </button>
  );
}
