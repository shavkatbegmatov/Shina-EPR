import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Search, Package, Loader2, X } from 'lucide-react';
import clsx from 'clsx';
import { Product } from '../../types';
import { formatCurrency } from '../../config/constants';

interface ProductSearchComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (product: Product) => void;
  products: Product[];
  isLoading: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ProductSearchCombobox({
  value,
  onChange,
  onSelect,
  products,
  isLoading,
  placeholder = 'Mahsulot qidirish...',
  disabled = false,
  className,
}: ProductSearchComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listId = useRef(`product-listbox-${Math.random().toString(36).substr(2, 9)}`).current;

  // Calculate dropdown position based on input location
  const updatePosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const inputGroup = inputRef.current.closest('.input-group');
      const groupRect = inputGroup ? inputGroup.getBoundingClientRect() : rect;

      setDropdownPosition({
        top: groupRect.bottom + window.scrollY + 4,
        left: groupRect.left + window.scrollX,
        width: groupRect.width,
      });
    }
  }, []);

  // Update position on scroll/resize
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, updatePosition]);

  // Show dropdown when products available or loading
  useEffect(() => {
    if (value.length >= 2 && (products.length > 0 || isLoading)) {
      setIsOpen(true);
      updatePosition();
    } else if (value.length < 2) {
      setIsOpen(false);
    }
  }, [value, products, isLoading, updatePosition]);

  // Reset active index when products change
  useEffect(() => {
    setActiveIndex(-1);
  }, [products]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || products.length === 0) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        onChange('');
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < products.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : products.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < products.length) {
          handleSelect(products[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  // Handle product selection
  const handleSelect = (product: Product) => {
    onSelect(product);
    onChange('');
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  // Clear input
  const handleClear = () => {
    onChange('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Highlight search term in text
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-primary/20 text-primary-content rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Dropdown content
  const dropdownContent = (
    <div
      ref={dropdownRef}
      role="listbox"
      id={listId}
      aria-label="Mahsulotlar ro'yxati"
      style={{
        position: 'absolute',
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
      }}
      className={clsx(
        'z-[9999] overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-2xl',
        'animate-in fade-in-0 zoom-in-95 duration-150'
      )}
    >
      {isLoading ? (
        // Loading state
        <div className="flex items-center justify-center gap-2 p-4 text-base-content/60">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Qidirilmoqda...</span>
        </div>
      ) : products.length === 0 ? (
        // Empty state
        <div className="flex flex-col items-center justify-center gap-2 p-6 text-base-content/50">
          <Package className="h-8 w-8" />
          <span className="text-sm">Mahsulot topilmadi</span>
        </div>
      ) : (
        // Results list
        <div className="max-h-72 overflow-y-auto py-1">
          {products.map((product, index) => (
            <button
              key={product.id}
              role="option"
              aria-selected={index === activeIndex}
              className={clsx(
                'w-full px-4 py-3 text-left transition-colors',
                'flex items-center justify-between gap-3',
                index === activeIndex
                  ? 'bg-primary text-primary-content'
                  : 'hover:bg-base-200'
              )}
              onClick={() => handleSelect(product)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {highlightMatch(product.name, value)}
                </p>
                <div className="flex items-center gap-2 text-xs opacity-70">
                  <span>{highlightMatch(product.sku, value)}</span>
                  {product.sizeString && (
                    <>
                      <span>|</span>
                      <span>{product.sizeString}</span>
                    </>
                  )}
                  {product.quantity !== undefined && (
                    <>
                      <span>|</span>
                      <span>Zaxira: {product.quantity}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={clsx(
                  'text-sm font-semibold',
                  index === activeIndex ? 'text-primary-content' : 'text-primary'
                )}>
                  {formatCurrency(product.purchasePrice || Math.round(product.sellingPrice * 0.7))}
                </p>
                <p className="text-xs opacity-60">
                  Sotish: {formatCurrency(product.sellingPrice)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Keyboard hint */}
      {products.length > 0 && (
        <div className="border-t border-base-200 px-4 py-2 text-xs text-base-content/50 flex items-center justify-between">
          <span>
            <kbd className="kbd kbd-xs">↑</kbd>
            <kbd className="kbd kbd-xs">↓</kbd> tanlash
          </span>
          <span>
            <kbd className="kbd kbd-xs">Enter</kbd> qo'shish
          </span>
          <span>
            <kbd className="kbd kbd-xs">Esc</kbd> yopish
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className={clsx('relative', className)}>
      <div className="input-group">
        <span className="bg-base-200">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <Search className="h-5 w-5" />
          )}
        </span>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `product-option-${activeIndex}` : undefined}
          placeholder={placeholder}
          className="input input-bordered w-full pr-10"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (value.length >= 2 && (products.length > 0 || isLoading)) {
              setIsOpen(true);
              updatePosition();
            }
          }}
          disabled={disabled}
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-base-200 transition-colors"
            onClick={handleClear}
            aria-label="Tozalash"
          >
            <X className="h-4 w-4 text-base-content/50" />
          </button>
        )}
      </div>

      {/* Dropdown rendered via portal */}
      {isOpen && createPortal(dropdownContent, document.body)}
    </div>
  );
}
