import { useTranslation } from 'react-i18next';
import { cn } from '@/ui';
import { useStorefrontImageFallback } from '../data/useStorefrontImageFallback';

/** Rasm bo'lmaganda ko'rsatiladigan fallback turi (adminkadan sozlanadi). */
export type ImageFallbackMode = 'svg' | 'photo';

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
  /** Fallback: 'svg' (vektor pleysxolder) yoki 'photo' (shina rasmi + "rasm mavjud emas" yorlig'i). */
  fallback?: ImageFallbackMode;
}

/** Rasmsiz mahsulot uchun lokal shina fotosi (public/) — offline ham ishlaydi. */
const NO_IMAGE_PHOTO = '/no-image-tire.png';

/**
 * Mahsulot rasmi. Rasm bo'lsa uni ko'rsatadi; aks holda adminkada tanlangan
 * fallback'ni: 'svg' — brendga mos vektor pleysxolder (tashqi tarmoqqa bog'liq emas),
 * 'photo' — lokal shina fotosi + "Rasm mavjud emas" yorlig'i.
 */
export function ProductImage({ src, alt, className, fallback }: ProductImageProps) {
  const { t } = useTranslation();
  // Rejim: prop berilsa o'sha (override/test), aks holda adminka sozlamasi (public settings).
  const settingsFallback = useStorefrontImageFallback();
  const mode = fallback ?? settingsFallback;

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

  if (mode === 'photo') {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn('relative grid h-full w-full place-items-center overflow-hidden bg-base-200/60', className)}
      >
        <img
          src={NO_IMAGE_PHOTO}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <span className="absolute inset-x-0 bottom-0 bg-base-content/55 px-2 py-1 text-center text-[11px] font-medium text-base-100 backdrop-blur-sm">
          {t('shop.product.noImage')}
        </span>
      </div>
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
