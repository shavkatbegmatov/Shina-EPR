import { useCallback, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import clsx from 'clsx';

interface NumberInputProps {
  value: number | string;
  onChange: (value: number | string) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  allowEmpty?: boolean;
  showButtons?: boolean;
  label?: string;
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder = '0',
  disabled = false,
  className,
  size = 'md',
  allowEmpty = true,
  showButtons = true,
  label,
}: NumberInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdActivatedRef = useRef(false);
  const holdDirectionRef = useRef<'increment' | 'decrement' | null>(null);

  const numValue = typeof value === 'string' ? (value === '' ? NaN : parseFloat(value)) : value;
  const valueRef = useRef(numValue);
  valueRef.current = numValue; // Always keep ref in sync

  const clampValue = useCallback(
    (val: number): number => {
      let result = val;
      if (min !== undefined && result < min) result = min;
      if (max !== undefined && result > max) result = max;
      return result;
    },
    [min, max]
  );

  const increment = useCallback(() => {
    const current = isNaN(numValue) ? 0 : numValue;
    const newValue = clampValue(current + step);
    onChange(newValue);
  }, [numValue, step, clampValue, onChange]);

  const decrement = useCallback(() => {
    const current = isNaN(numValue) ? 0 : numValue;
    const newValue = clampValue(current - step);
    onChange(newValue);
  }, [numValue, step, clampValue, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    if (inputValue === '' && allowEmpty) {
      onChange('');
      return;
    }

    // Allow typing negative sign or decimal point
    if (inputValue === '-' || inputValue === '.' || inputValue === '-.') {
      onChange(inputValue);
      return;
    }

    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      onChange(inputValue);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Clamp value on blur
    if (typeof value === 'string' && value !== '') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        onChange(clampValue(parsed));
      }
    } else if (typeof value === 'number') {
      onChange(clampValue(value));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      increment();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      decrement();
    }
  };

  // Execute action using current value from ref
  const executeAction = useCallback((direction: 'increment' | 'decrement') => {
    const current = isNaN(valueRef.current) ? 0 : valueRef.current;
    const newValue = direction === 'increment'
      ? clampValue(current + step)
      : clampValue(current - step);
    onChange(newValue);
  }, [step, clampValue, onChange]);

  // Hold to repeat functionality
  const startHold = (direction: 'increment' | 'decrement') => {
    holdActivatedRef.current = false;
    holdDirectionRef.current = direction;
    holdTimerRef.current = setTimeout(() => {
      holdActivatedRef.current = true;
      executeAction(direction);
      holdIntervalRef.current = setInterval(() => {
        if (holdDirectionRef.current) {
          executeAction(holdDirectionRef.current);
        }
      }, 75);
    }, 400);
  };

  const stopHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    holdDirectionRef.current = null;
  };

  const handleClick = (action: () => void) => {
    // Only fire if hold wasn't activated (normal click)
    if (!holdActivatedRef.current) {
      action();
    }
    holdActivatedRef.current = false;
  };

  const sizeClasses = {
    sm: 'h-9 text-sm',
    md: 'h-11 text-base',
    lg: 'h-13 text-lg',
  };

  const buttonSizeClasses = {
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-13 h-13',
  };

  const iconSizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const canDecrement = min === undefined || (typeof numValue === 'number' && numValue > min);
  const canIncrement = max === undefined || (typeof numValue === 'number' && numValue < max);

  return (
    <div className={clsx('form-control', className)}>
      {label && (
        <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
          {label}
        </span>
      )}
      <div
        className={clsx(
          'number-input-wrapper flex items-stretch rounded-xl border bg-base-100 transition-all duration-200',
          isFocused
            ? 'border-primary ring-2 ring-primary/20'
            : 'border-base-300 hover:border-base-content/30',
          disabled && 'opacity-50 pointer-events-none bg-base-200'
        )}
      >
        {showButtons && (
          <button
            type="button"
            className={clsx(
              'number-input-btn flex items-center justify-center rounded-l-[10px] border-r border-base-300 bg-base-200/50 transition-colors',
              'hover:bg-base-300 active:bg-base-300/80',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-base-200/50',
              buttonSizeClasses[size]
            )}
            onClick={() => handleClick(decrement)}
            onMouseDown={() => startHold('decrement')}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            onTouchStart={() => startHold('decrement')}
            onTouchEnd={stopHold}
            disabled={disabled || !canDecrement}
            tabIndex={-1}
            aria-label="Kamaytirish"
          >
            <Minus className={clsx(iconSizeClasses[size], 'text-base-content/70')} />
          </button>
        )}

        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          className={clsx(
            'number-input-field flex-1 min-w-0 bg-transparent text-center font-medium outline-none',
            'placeholder:text-base-content/40',
            sizeClasses[size],
            !showButtons && 'px-3 rounded-xl'
          )}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={label}
        />

        {showButtons && (
          <button
            type="button"
            className={clsx(
              'number-input-btn flex items-center justify-center rounded-r-[10px] border-l border-base-300 bg-base-200/50 transition-colors',
              'hover:bg-base-300 active:bg-base-300/80',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-base-200/50',
              buttonSizeClasses[size]
            )}
            onClick={() => handleClick(increment)}
            onMouseDown={() => startHold('increment')}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            onTouchStart={() => startHold('increment')}
            onTouchEnd={stopHold}
            disabled={disabled || !canIncrement}
            tabIndex={-1}
            aria-label="Oshirish"
          >
            <Plus className={clsx(iconSizeClasses[size], 'text-base-content/70')} />
          </button>
        )}
      </div>
    </div>
  );
}
