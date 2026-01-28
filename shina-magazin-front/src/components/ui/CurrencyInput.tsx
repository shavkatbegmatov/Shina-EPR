import { useState, useRef, useCallback, useEffect } from 'react';
import clsx from 'clsx';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showQuickButtons?: boolean;
  className?: string;
  error?: string;
}

// Format number with thousand separators (1 234 567)
const formatNumber = (num: number): string => {
  if (num === 0) return '';
  return new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

// Parse formatted string to number (removes spaces and non-digits)
const parseNumber = (str: string): number => {
  const cleaned = str.replace(/[^\d]/g, '');
  return cleaned === '' ? 0 : parseInt(cleaned, 10);
};

// Quick add buttons configuration
const QUICK_BUTTONS = [
  { label: '+1K', value: 1000 },
  { label: '+10K', value: 10000 },
  { label: '+100K', value: 100000 },
  { label: '+1M', value: 1000000 },
];

export function CurrencyInput({
  value,
  onChange,
  label,
  placeholder = '0',
  min = 0,
  max,
  disabled = false,
  size = 'md',
  showQuickButtons = false,
  className,
  error,
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(formatNumber(value));
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync display value when external value changes
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatNumber(value));
    }
  }, [value, isFocused]);

  // Clamp value between min and max
  const clampValue = useCallback(
    (val: number): number => {
      let result = val;
      if (min !== undefined && result < min) result = min;
      if (max !== undefined && result > max) result = max;
      return result;
    },
    [min, max]
  );

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Allow empty input
    if (inputValue === '') {
      setDisplayValue('');
      onChange(0);
      return;
    }

    // Parse and format the input
    const numValue = parseNumber(inputValue);
    const formatted = formatNumber(numValue);

    setDisplayValue(formatted);
    onChange(numValue);
  };

  // Handle focus - show raw number for easier editing
  const handleFocus = () => {
    setIsFocused(true);
    // Select all text on focus for easy replacement
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  };

  // Handle blur - format and clamp
  const handleBlur = () => {
    setIsFocused(false);
    const clamped = clampValue(value);
    if (clamped !== value) {
      onChange(clamped);
    }
    setDisplayValue(formatNumber(clamped));
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Arrow up/down to increment/decrement by 1000
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newValue = clampValue(value + 1000);
      onChange(newValue);
      setDisplayValue(formatNumber(newValue));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newValue = clampValue(value - 1000);
      onChange(newValue);
      setDisplayValue(formatNumber(newValue));
    }
  };

  // Handle paste - accept formatted numbers
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const numValue = parseNumber(pastedText);
    const clamped = clampValue(numValue);
    setDisplayValue(formatNumber(clamped));
    onChange(clamped);
  };

  // Quick button click handler
  const handleQuickAdd = (amount: number) => {
    const newValue = clampValue(value + amount);
    onChange(newValue);
    setDisplayValue(formatNumber(newValue));
    inputRef.current?.focus();
  };

  // Standardized heights: sm=40px, md=48px (standard), lg=56px
  const sizeClasses = {
    sm: 'h-10 text-sm',
    md: 'h-12 text-base',  // Standard height matching other form elements
    lg: 'h-14 text-lg',
  };

  const quickButtonSizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-xs px-2.5 py-1.5',
    lg: 'text-sm px-3 py-2',
  };

  return (
    <div className={clsx('form-control', className)}>
      {label && (
        <label className="label py-1">
          <span className="label-text text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
            {label}
          </span>
        </label>
      )}

      <div
        className={clsx(
          'relative flex items-center rounded-xl border bg-base-100 transition-all duration-200',
          isFocused
            ? 'border-primary ring-2 ring-primary/20'
            : error
              ? 'border-error'
              : 'border-base-300 hover:border-base-content/30',
          disabled && 'opacity-50 pointer-events-none bg-base-200'
        )}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          className={clsx(
            'flex-1 min-w-0 bg-transparent text-right font-semibold outline-none px-4',
            'placeholder:text-base-content/30 placeholder:font-normal',
            sizeClasses[size]
          )}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={label}
          aria-invalid={!!error}
        />

        {/* Currency suffix */}
        <span className={clsx(
          'pr-4 text-base-content/50 font-medium select-none',
          size === 'sm' && 'text-sm',
          size === 'md' && 'text-base',
          size === 'lg' && 'text-lg'
        )}>
          so'm
        </span>
      </div>

      {/* Quick add buttons */}
      {showQuickButtons && !disabled && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {QUICK_BUTTONS.map((btn) => (
            <button
              key={btn.value}
              type="button"
              className={clsx(
                'rounded-lg font-medium transition-all',
                'bg-base-200 hover:bg-primary hover:text-primary-content',
                'active:scale-95',
                quickButtonSizeClasses[size]
              )}
              onClick={() => handleQuickAdd(btn.value)}
            >
              {btn.label}
            </button>
          ))}
          {value > 0 && (
            <button
              type="button"
              className={clsx(
                'rounded-lg font-medium transition-all',
                'bg-error/10 text-error hover:bg-error hover:text-error-content',
                'active:scale-95',
                quickButtonSizeClasses[size]
              )}
              onClick={() => {
                onChange(0);
                setDisplayValue('');
              }}
            >
              Tozalash
            </button>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <label className="label py-1">
          <span className="label-text-alt text-error">{error}</span>
        </label>
      )}
    </div>
  );
}
