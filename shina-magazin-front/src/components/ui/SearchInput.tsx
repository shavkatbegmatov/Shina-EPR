import { useId, useRef, useState } from 'react';
import clsx from 'clsx';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  iconClassName?: string;
  disabled?: boolean;
  id?: string;
  onClear?: () => void;
  hideLabel?: boolean;
  ariaLabel?: string;
}

export function SearchInput({
  value,
  onValueChange,
  label = 'Ism yoki telefon',
  placeholder = "Ism yoki telefon bo'yicha qidirish...",
  className,
  inputClassName,
  iconClassName,
  disabled = false,
  id,
  onClear,
  hideLabel = false,
  ariaLabel,
}: SearchInputProps) {
  const inputId = id ?? useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value.trim().length > 0;
  const accessibleLabel = ariaLabel ?? label;

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onValueChange('');
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && hasValue) {
      event.preventDefault();
      handleClear();
    }
  };

  return (
    <div className={clsx('form-control', className)}>
      {label && !hideLabel && (
        <label
          htmlFor={inputId}
          className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50"
        >
          {label}
        </label>
      )}
      <div
        className={clsx(
          'relative flex items-center rounded-xl border bg-base-100 transition-all duration-200 h-12 cursor-text',
          isFocused
            ? 'border-primary ring-2 ring-primary/20'
            : 'border-base-300 hover:border-base-content/30',
          disabled && 'opacity-50 pointer-events-none bg-base-200'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <div className="absolute left-3 text-base-content/40">
          <Search className={clsx('h-5 w-5', iconClassName)} />
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className={clsx(
            'w-full bg-transparent py-3 pl-10 pr-10 text-sm font-medium outline-none',
            'placeholder:text-base-content/40 placeholder:font-normal',
            inputClassName
          )}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label={accessibleLabel}
          autoComplete="off"
        />
        {hasValue && !disabled && (
          <button
            type="button"
            className="absolute right-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-base-content/40 transition-colors hover:bg-base-200 hover:text-base-content"
            onClick={handleClear}
            aria-label="Tozalash"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
