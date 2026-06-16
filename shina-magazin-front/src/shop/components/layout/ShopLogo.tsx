import { cn } from '@/ui';

/** Protektor brend belgisi — protektor halqasi (teal) + harakat aksenti (orange). */
export function ShopLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn('shrink-0', className)} aria-hidden="true">
      <circle cx="20" cy="20" r="18" className="fill-primary/10" />
      <circle cx="20" cy="20" r="18" fill="none" className="stroke-primary" strokeWidth="2.5" />
      {/* Protektor tishlari */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const x1 = 20 + Math.cos(a) * 18;
        const y1 = 20 + Math.sin(a) * 18;
        const x2 = 20 + Math.cos(a) * 13;
        const y2 = 20 + Math.sin(a) * 13;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />;
      })}
      {/* Markaziy disk + harakat aksenti */}
      <circle cx="20" cy="20" r="7" className="fill-secondary" />
      <path d="M20 13 a7 7 0 0 1 0 14" fill="none" className="stroke-base-100" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
