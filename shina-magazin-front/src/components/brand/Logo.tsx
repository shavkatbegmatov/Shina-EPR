import clsx from 'clsx';

/**
 * Protektor brend belgisi — yagona manba.
 * Eski placeholderlar o'rnini bosadi: Sidebar "S", Footer "SM", portal login 🚗, /vite.svg.
 *
 * - `mark`     — faqat logotip (shina halqasi + protektor + kontakt-patch)
 * - `lockup`   — logotip + "Protektor" so'z belgisi (default)
 * - `wordmark` — faqat matn
 *
 * Halqa va protektor `currentColor`'ni meros qiladi (text-primary), shuning uchun
 * temaga mos qayta bo'yaladi. Ichki "patch" `tone`'ga qarab: do'konda orange
 * (energiya), ERP'da xotirjam teal.
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
  const hubClass = tone === 'shop' ? 'fill-secondary' : 'fill-primary/25';
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-hidden="true"
      className={clsx('h-full w-full', className)}
    >
      <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="3.5" />
      <g fill="currentColor">
        {Array.from({ length: 8 }).map((_, i) => (
          <rect
            key={i}
            x="22.7"
            y="3.4"
            width="2.6"
            height="5"
            rx="1.3"
            transform={`rotate(${i * 45} 24 24)`}
          />
        ))}
      </g>
      <circle cx="24" cy="24" r="6" className={hubClass} />
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
