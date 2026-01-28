import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string | number | undefined;
  onChange: (value: string | number | undefined) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  required?: boolean;
  icon?: React.ReactNode;
}

export function Select({
  value,
  onChange,
  options,
  label,
  placeholder = 'Tanlang...',
  disabled = false,
  error,
  className,
  required,
  icon,
}: SelectProps) {
  const maxDropdownHeight = 240;
  const dropdownOffset = 4;
  const viewportMargin = 8;
  const estimatedItemHeight = 41; // Each option height ~41px (py-2.5 + text)
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    overflowY: 'auto' | 'visible';
  }>({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: maxDropdownHeight,
    overflowY: 'auto',
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Calculate dropdown position
  const updateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = Math.max(viewportHeight - rect.bottom - viewportMargin, 0);
    const spaceAbove = Math.max(rect.top - viewportMargin, 0);

    // Calculate actual content height
    let contentHeight: number;
    if (listRef.current && listRef.current.scrollHeight > 0) {
      // Portal has rendered, use actual measurement
      contentHeight = listRef.current.scrollHeight;
    } else {
      // Initial estimate based on option count
      contentHeight = options.length * estimatedItemHeight;
    }

    const preferredHeight = Math.min(contentHeight, maxDropdownHeight);
    const openUp = spaceBelow < preferredHeight && spaceAbove > spaceBelow;
    const availableSpace = openUp ? spaceAbove : spaceBelow;
    const maxHeight = availableSpace > 0 ? Math.min(preferredHeight, availableSpace) : preferredHeight;
    const shouldScroll = contentHeight > maxHeight;
    const effectiveHeight = shouldScroll ? maxHeight : contentHeight;
    const minWidth = Math.max(rect.width, 200);

    const left = Math.min(
      Math.max(rect.left, viewportMargin),
      Math.max(viewportMargin, viewportWidth - minWidth - viewportMargin)
    );
    const top = openUp
      ? Math.max(viewportMargin, rect.top - effectiveHeight - dropdownOffset)
      : rect.bottom + dropdownOffset;

    setDropdownPosition({
      top,
      left,
      width: rect.width,
      maxHeight: shouldScroll ? maxHeight : effectiveHeight,
      overflowY: shouldScroll ? 'auto' : 'visible',
    });
  }, [dropdownOffset, maxDropdownHeight, viewportMargin, options.length, estimatedItemHeight]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        listRef.current &&
        !listRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update position when opening and on scroll/resize
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      const rafId = window.requestAnimationFrame(updateDropdownPosition);

      const handleUpdate = () => updateDropdownPosition();
      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('resize', handleUpdate);

      return () => {
        window.cancelAnimationFrame(rafId);
        window.removeEventListener('scroll', handleUpdate, true);
        window.removeEventListener('resize', handleUpdate);
      };
    }
  }, [isOpen, options.length, updateDropdownPosition]);

  // Scroll selected option into view when dropdown opens
  useEffect(() => {
    if (isOpen && listRef.current && value) {
      const selectedEl = listRef.current.querySelector('[data-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen, value]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        setIsOpen(!isOpen);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          const currentIndex = options.findIndex((opt) => opt.value === value);
          const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
          const nextOption = options[nextIndex];
          if (nextOption && !nextOption.disabled) {
            onChange(nextOption.value);
          }
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          const currentIndex = options.findIndex((opt) => opt.value === value);
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
          const prevOption = options[prevIndex];
          if (prevOption && !prevOption.disabled) {
            onChange(prevOption.value);
          }
        }
        break;
    }
  };

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={clsx('form-control', className)} ref={containerRef}>
      {label && (
        <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
          {label} {required && <span className="text-error">*</span>}
        </span>
      )}

      <div
        ref={triggerRef}
        className={clsx(
          'relative flex items-center rounded-xl border bg-base-100 transition-all duration-200 h-12 cursor-pointer select-none',
          isFocused || isOpen
            ? 'border-primary ring-2 ring-primary/20'
            : error
              ? 'border-error'
              : 'border-base-300 hover:border-base-content/30',
          disabled && 'opacity-50 pointer-events-none bg-base-200'
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => !isOpen && setIsFocused(false)}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
      >
        {/* Icon */}
        {icon && (
          <div className="pl-3 text-base-content/40">
            {icon}
          </div>
        )}

        {/* Selected value or placeholder */}
        <div className={clsx(
          'flex-1 min-w-0 px-3 truncate',
          selectedOption ? 'text-base-content font-medium' : 'text-base-content/40'
        )}>
          {selectedOption ? selectedOption.label : placeholder}
        </div>

        {/* Chevron */}
        <div className="pr-3 text-base-content/40">
          <ChevronDown
            className={clsx(
              'h-5 w-5 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </div>

      {/* Dropdown Portal */}
      {isOpen && createPortal(
        <div
          ref={listRef}
          className="fixed z-[9999] overflow-x-hidden rounded-xl border border-base-300 bg-base-100 shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            minWidth: Math.max(dropdownPosition.width, 200),
            width: 'auto',
            maxHeight: dropdownPosition.maxHeight,
            overflowY: dropdownPosition.overflowY,
          }}
          role="listbox"
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-base-content/50">
              Ma'lumot topilmadi
            </div>
          ) : (
            options.map((option) => (
              <div
                key={option.value}
                data-selected={option.value === value}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors first:rounded-t-[10px] last:rounded-b-[10px]',
                  option.value === value
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-base-200/80',
                  option.disabled && 'opacity-50 cursor-not-allowed'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!option.disabled) {
                    handleSelect(option.value);
                  }
                }}
                role="option"
                aria-selected={option.value === value}
                aria-disabled={option.disabled}
              >
                <span className="flex-1 truncate">{option.label}</span>
                {option.value === value && (
                  <Check className="h-4 w-4 flex-shrink-0" />
                )}
              </div>
            ))
          )}
        </div>,
        document.body
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
