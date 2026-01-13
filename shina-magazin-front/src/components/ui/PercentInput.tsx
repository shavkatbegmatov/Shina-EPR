import { useState, useRef, useCallback, useEffect } from 'react';
import clsx from 'clsx';

interface PercentInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  error?: string;
  required?: boolean;
}

export function PercentInput({
  value,
  onChange,
  label,
  placeholder = '0',
  min = 0,
  max = 100,
  disabled = false,
  size = 'md',
  className,
  error,
  required,
}: PercentInputProps) {
  const [displayValue, setDisplayValue] = useState(value === 0 ? '' : String(value));
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync display value when external value changes
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value === 0 ? '' : String(value));
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

    // Allow decimal point
    if (inputValue === '.') {
      setDisplayValue('0.');
      return;
    }

    // Parse and validate
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      setDisplayValue(inputValue);
      onChange(parsed);
    }
  };

  // Handle focus
  const handleFocus = () => {
    setIsFocused(true);
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  };

  // Handle blur - clamp value
  const handleBlur = () => {
    setIsFocused(false);
    const clamped = clampValue(value);
    if (clamped !== value) {
      onChange(clamped);
    }
    setDisplayValue(clamped === 0 ? '' : String(clamped));
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newValue = clampValue(value + 1);
      onChange(newValue);
      setDisplayValue(String(newValue));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newValue = clampValue(value - 1);
      onChange(newValue);
      setDisplayValue(newValue === 0 ? '' : String(newValue));
    }
  };

  const sizeClasses = {
    sm: 'h-9 text-sm',
    md: 'h-11 text-base',
    lg: 'h-13 text-lg',
  };

  return (
    <div className={clsx('form-control', className)}>
      {label && (
        <label className="label py-1">
          <span className="label-text text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
            {label} {required && <span className="text-error">*</span>}
          </span>
        </label>
      )}

      <div
        className={clsx(
          'relative flex items-center rounded-xl border bg-base-100 transition-all duration-200 cursor-text',
          isFocused
            ? 'border-primary ring-2 ring-primary/20'
            : error
              ? 'border-error'
              : 'border-base-300 hover:border-base-content/30',
          disabled && 'opacity-50 pointer-events-none bg-base-200'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
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
          placeholder={placeholder}
          disabled={disabled}
          aria-label={label}
          aria-invalid={!!error}
        />

        {/* Percent suffix */}
        <span className={clsx(
          'pr-4 text-base-content/50 font-medium select-none',
          size === 'sm' && 'text-sm',
          size === 'md' && 'text-base',
          size === 'lg' && 'text-lg'
        )}>
          %
        </span>
      </div>

      {/* Error message */}
      {error && (
        <label className="label py-1">
          <span className="label-text-alt text-error">{error}</span>
        </label>
      )}
    </div>
  );
}
