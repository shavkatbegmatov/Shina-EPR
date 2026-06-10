import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

/**
 * DaisyUI `btn` ustidan tipli, variant-asosli Button primitivi.
 * Loyihadagi 284+ xom `btn` satrini almashtirish uchun.
 *
 * Linklar/anchorlar uchun `buttonVariants(...)` ni className sifatida ishlating:
 *   <Link className={buttonVariants({ variant: 'primary' })}>...</Link>
 */
export const buttonVariants = cva('btn', {
  variants: {
    variant: {
      default: '', // oddiy DaisyUI btn (rangsiz)
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      accent: 'btn-accent',
      neutral: 'btn-neutral',
      ghost: 'btn-ghost',
      outline: 'btn-outline',
      danger: 'btn-error',
      success: 'btn-success',
      warning: 'btn-warning',
      info: 'btn-info',
      link: 'btn-link',
    },
    size: {
      xs: 'btn-xs',
      sm: 'btn-sm',
      md: '',
      lg: 'btn-lg',
    },
    block: { true: 'btn-block' },
    iconOnly: { true: 'btn-square' },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** yuklanish holati: spinner ko'rsatadi va tugmani o'chiradi */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, iconOnly, loading = false, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, block, iconOnly }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className="loading loading-spinner loading-sm" aria-hidden="true" />}
      {children}
    </button>
  );
});
