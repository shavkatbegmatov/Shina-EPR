import clsx from 'clsx';

/**
 * Protektor brend belgisi — yagona manba.
 * Eski placeholderlar o'rnini bosadi: Sidebar "S", Footer "SM", portal login 🚗, /vite.svg.
 *
 * - `mark`     — faqat logotip (P monogramma + protektor + kontakt-patch)
 * - `lockup`   — logotip + "Protektor" so'z belgisi (default)
 * - `wordmark` — faqat matn
 *
 * Monogramma va protektor `currentColor`'ni meros qiladi (text-primary), shuning
 * uchun temaga mos qayta bo'yaladi. Pastki "patch" `tone`'ga qarab: do'konda
 * orange (energiya), ERP'da xotirjam primary tint.
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
  const patchClass = tone === 'shop' ? 'fill-secondary' : 'fill-primary/30';

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-hidden="true"
      className={clsx('h-full w-full', className)}
    >
      {/* Compact tire arc: it also reads as a sturdy P at favicon size. */}
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M14 4.5h10.5C35 4.5 42.5 12 42.5 22S35 39.5 24.5 39.5H18v-9h6.5c5.7 0 9.5-3.3 9.5-8.5s-3.8-8.5-9.5-8.5H22V44h-8V4.5Z"
        clipRule="evenodd"
      />

      {/* Three tread blocks make the automotive cue specific without drawing a wheel. */}
      <path fill="currentColor" d="M5.5 10.5 13 6.2v6.5l-8.2 4.7.7-6.9Z" />
      <path fill="currentColor" d="m4.4 20 8.6-5v6.5l-9.2 5.3.6-6.8Z" />
      <path fill="currentColor" d="m3.6 29.6 9.4-5.4v6.5l-9.9 5.7.5-6.8Z" />

      {/* Contact patch: signal-orange in the shop, restrained in ERP. */}
      <path d="M14 38.5h8V44h-8z" className={patchClass} />
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
