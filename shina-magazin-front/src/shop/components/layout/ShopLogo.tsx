import { Logo } from '@/components/brand/Logo';

/** Do'kon ham yagona Protektor brend belgisidan foydalanadi. */
export function ShopLogo({ className }: { className?: string }) {
  return <Logo variant="mark" tone="shop" className={className} />;
}
