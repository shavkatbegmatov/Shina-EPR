import clsx from 'clsx';

/**
 * Protektor brend belgisi — yagona manba.
 * Eski placeholderlar o'rnini bosadi: Sidebar "S", Footer "SM", portal login 🚗, /vite.svg.
 *
 * - `mark`     — faqat logotip (ikki track ribbon + kontakt wedge)
 * - `lockup`   — logotip + "Protektor" so'z belgisi (default)
 * - `wordmark` — faqat matn
 *
 * Birinchi ribbon `currentColor`'ni meros qiladi (text-primary), ikkinchisi
 * accent, kontakt wedge esa secondary token bilan bo'yaladi. Shu sababli belgi
 * shina / shina-dark temalariga avtomatik moslashadi.
 */

type LogoVariant = 'mark' | 'lockup' | 'wordmark';
type LogoTone = 'shop' | 'erp';

interface LogoProps {
  variant?: LogoVariant;
  tone?: LogoTone;
  /** so'z belgisi matni (default "Protektor") */
  label?: string;
  className?: string;
  /** belgi (SVG) o'lchami uchun qo'shimcha klasslar, masalan "h-9 w-9" */
  markClassName?: string;
  /** so'z belgisi matni uchun qo'shimcha klasslar */
  labelClassName?: string;
}

function LogoMark({ tone = 'erp', className }: { tone?: LogoTone; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-hidden="true"
      data-tone={tone}
      className={clsx('h-full w-full', className)}
    >
      {/* Primary track: tire contact path and forward business flow. */}
      <path
        fill="currentColor"
        d="M17 4h27l-4 12H24l-5 13H3L10 9c1.2-3.1 3.6-5 7-5Z"
      />
      {/* Secondary track: synced inventory / sales lane. */}
      <path
        className="fill-accent"
        d="M31 18h14l-7 21c-1.1 3.2-3.5 5-7 5H4l4-12h15l5-14h3Z"
      />
      {/* Signal point where rubber, road and transaction meet. */}
      <path className="fill-secondary" d="m4 44 4-12 4 5-3 7H4Z" />
    </svg>
  );
}

export function Logo({
  variant = 'lockup',
  tone = 'erp',
  label = 'Protektor',
  className,
  markClassName,
  labelClassName,
}: LogoProps) {
  if (variant === 'wordmark') {
    return (
      <span
        className={clsx('font-bold tracking-tight', className)}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {label}
      </span>
    );
  }

  if (variant === 'mark') {
    return (
      <span className={clsx('inline-grid place-items-center text-primary', className)}>
        <LogoMark tone={tone} className={markClassName} />
      </span>
    );
  }

  return (
    <span className={clsx('inline-flex items-center gap-2.5 text-primary', className)}>
      <span className={clsx('grid h-9 w-9 place-items-center', markClassName)}>
        <LogoMark tone={tone} />
      </span>
      <span
        className={clsx('text-base font-bold tracking-tight text-base-content', labelClassName)}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {label}
      </span>
    </span>
  );
}

export default Logo;
