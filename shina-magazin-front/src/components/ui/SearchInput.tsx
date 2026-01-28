import { useCallback, useId, useRef, useState } from 'react';
import clsx from 'clsx';
import { Search, X } from 'lucide-react';
import * as React from "react";

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
  leadingIcon?: React.ReactNode;
  inputRef?: React.Ref<HTMLInputElement>;
  inputProps?: Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'placeholder' | 'disabled' | 'type'
  >;
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
  leadingIcon,
  inputRef,
  inputProps,
}: SearchInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const internalInputRef = useRef<HTMLInputElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value.trim().length > 0;
  const accessibleLabel = ariaLabel ?? label;

  const setRefs = useCallback(
    (node: HTMLInputElement | null) => {
      internalInputRef.current = node;
      if (!inputRef) return;
      if (typeof inputRef === 'function') {
        inputRef(node);
      } else {
        (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
      }
    },
    [inputRef]
  );

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onValueChange('');
    }
    internalInputRef.current?.focus();
  };

  const {
    onKeyDown: inputOnKeyDown,
    onFocus: inputOnFocus,
    onBlur: inputOnBlur,
    autoComplete: inputAutoComplete,
    ...restInputProps
  } = inputProps ?? {};

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (inputOnKeyDown) {
      inputOnKeyDown(event);
    }
    if (event.defaultPrevented) return;
    if (event.key === 'Escape' && hasValue) {
      event.preventDefault();
      handleClear();
    }
  };

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (inputOnFocus) {
      inputOnFocus(event);
    }
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (inputOnBlur) {
      inputOnBlur(event);
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
        onClick={() => internalInputRef.current?.focus()}
      >
        <div className="absolute left-3 text-base-content/40">
          {leadingIcon ?? <Search className={clsx('h-5 w-5', iconClassName)} />}
        </div>
        <input
          ref={setRefs}
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
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label={accessibleLabel}
          autoComplete={inputAutoComplete ?? 'off'}
          {...restInputProps}
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
