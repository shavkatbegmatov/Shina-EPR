import { cn } from '@/ui';

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
}

/**
 * Mahsulot rasmi. Rasm bo'lsa uni ko'rsatadi, aks holda brendga mos
 * shina SVG pleysxolderi (teal halqa + protektor tishlari). Tashqi
 * tarmoqqa bog'liq emas — offline ham to'g'ri ko'rinadi.
 */
export function ProductImage({ src, alt, className }: ProductImageProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cn('h-full w-full object-cover', className)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className={cn('grid h-full w-full place-items-center bg-base-200/60', className)}
    >
      <svg viewBox="0 0 120 120" className="h-3/5 w-3/5" aria-hidden="true">
        {/* Tashqi protektor */}
        <circle cx="60" cy="60" r="54" className="fill-base-content/10" />
        <circle cx="60" cy="60" r="54" fill="none" className="stroke-base-content/20" strokeWidth="2" />
        {/* Protektor tishlari */}
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const x1 = 60 + Math.cos(a) * 54;
          const y1 = 60 + Math.sin(a) * 54;
          const x2 = 60 + Math.cos(a) * 44;
          const y2 = 60 + Math.sin(a) * 44;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-base-content/15" strokeWidth="3" />;
        })}
        {/* Disk halqasi (teal) */}
        <circle cx="60" cy="60" r="40" className="fill-base-100" />
        <circle cx="60" cy="60" r="40" fill="none" className="stroke-primary" strokeWidth="4" />
        <circle cx="60" cy="60" r="14" className="fill-primary/15 stroke-primary" strokeWidth="3" />
        {/* Disk spitsalari */}
        {Array.from({ length: 5 }).map((_, i) => {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          const x = 60 + Math.cos(a) * 36;
          const y = 60 + Math.sin(a) * 36;
          return <line key={i} x1="60" y1="60" x2={x} y2={y} className="stroke-primary/60" strokeWidth="4" strokeLinecap="round" />;
        })}
      </svg>
    </div>
  );
}
