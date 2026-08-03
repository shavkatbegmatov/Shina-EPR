import { forwardRef, useId, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/ui';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: ReactNode;
  actions?: ReactNode;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  {
    label,
    error,
    actions,
    containerClassName,
    labelClassName,
    inputClassName,
    className,
    id,
    disabled,
    ...props
  },
  ref,
) {
  const { t } = useTranslation();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const hasError = Boolean(error);

  return (
    <label className={cn('form-control', containerClassName)} htmlFor={inputId}>
      <span
        className={cn(
          'label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50',
          labelClassName,
        )}
      >
        {label}
      </span>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <input
            ref={ref}
            id={inputId}
            type={visible ? 'text' : 'password'}
            disabled={disabled}
            aria-invalid={hasError || undefined}
            className={cn('input input-bordered w-full pr-10', hasError && 'input-error', inputClassName, className)}
            {...props}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 transition-colors hover:text-base-content disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={visible ? t('erp.passwordPolicy.hidePassword') : t('erp.passwordPolicy.showPassword')}
            aria-pressed={visible}
            title={visible ? t('erp.passwordPolicy.hidePassword') : t('erp.passwordPolicy.showPassword')}
            onClick={() => setVisible((current) => !current)}
            disabled={disabled}
          >
            {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {error && <span className="mt-1 text-xs text-error">{error}</span>}
    </label>
  );
});
