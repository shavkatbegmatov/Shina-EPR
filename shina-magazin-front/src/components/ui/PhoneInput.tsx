import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { Phone } from 'lucide-react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  required?: boolean;
}

// Format phone number: XX XXX XX XX
const formatPhoneNumber = (digits: string): string => {
  const cleaned = digits.replace(/\D/g, '').slice(0, 9);

  if (cleaned.length === 0) return '';
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
  if (cleaned.length <= 7) return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`;
  return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7)}`;
};

// Extract digits from formatted string
const extractDigits = (str: string): string => {
  return str.replace(/\D/g, '').slice(0, 9);
};

// Parse full phone number (+998XXXXXXXXX) to just digits (XXXXXXXXX)
const parseFullPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  // If starts with 998, remove it
  if (cleaned.startsWith('998')) {
    return cleaned.slice(3, 12);
  }
  return cleaned.slice(0, 9);
};

// Convert digits to full phone format (+998XXXXXXXXX)
const toFullPhone = (digits: string): string => {
  const cleaned = digits.replace(/\D/g, '').slice(0, 9);
  if (cleaned.length === 0) return '';
  return `+998${cleaned}`;
};

export function PhoneInput({
  value,
  onChange,
  label,
  placeholder = '90 123 45 67',
  disabled = false,
  error,
  className,
  required,
}: PhoneInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync display value when external value changes
  useEffect(() => {
    const digits = parseFullPhone(value);
    setDisplayValue(formatPhoneNumber(digits));
  }, [value]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const digits = extractDigits(inputValue);
    const formatted = formatPhoneNumber(digits);

    setDisplayValue(formatted);
    onChange(toFullPhone(digits));
  };

  // Handle focus
  const handleFocus = () => {
    setIsFocused(true);
  };

  // Handle blur
  const handleBlur = () => {
    setIsFocused(false);
  };

  // Handle paste - accept various formats
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const digits = parseFullPhone(pastedText);
    const formatted = formatPhoneNumber(digits);

    setDisplayValue(formatted);
    onChange(toFullPhone(digits));
  };

  // Handle key down - only allow digits and control keys
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow: backspace, delete, tab, escape, enter, arrows
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'Escape' ||
      e.key === 'Enter' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'Home' ||
      e.key === 'End' ||
      (e.ctrlKey && (e.key === 'a' || e.key === 'c' || e.key === 'v' || e.key === 'x'))
    ) {
      return;
    }

    // Block non-digit keys
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const isComplete = extractDigits(displayValue).length === 9;
  const isEmpty = displayValue.length === 0;

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
          'relative flex items-center rounded-xl border bg-base-100 transition-all duration-200 h-12',
          isFocused
            ? 'border-primary ring-2 ring-primary/20'
            : error
              ? 'border-error'
              : 'border-base-300 hover:border-base-content/30',
          disabled && 'opacity-50 pointer-events-none bg-base-200'
        )}
      >
        {/* Phone icon */}
        <div className="pl-3 text-base-content/40">
          <Phone className="h-5 w-5" />
        </div>

        {/* Country code prefix */}
        <span className={clsx(
          'pl-2 pr-1 font-semibold select-none',
          isEmpty && !isFocused ? 'text-base-content/30' : 'text-base-content'
        )}>
          +998
        </span>

        {/* Input field */}
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          className={clsx(
            'flex-1 min-w-0 bg-transparent outline-none px-2 font-semibold',
            'placeholder:text-base-content/30 placeholder:font-normal'
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

        {/* Status indicator */}
        {!isEmpty && (
          <div className={clsx(
            'pr-3 text-sm font-medium',
            isComplete ? 'text-success' : 'text-base-content/30'
          )}>
            {isComplete ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <span>{9 - extractDigits(displayValue).length}</span>
            )}
          </div>
        )}
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
