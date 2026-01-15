import { useState, useRef, useEffect, useCallback, KeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Phone, Loader2, User as UserIcon } from 'lucide-react';
import clsx from 'clsx';
import { SearchInput } from '../ui/SearchInput';
import type { Customer, Employee, Supplier } from '../../types';
import { customersApi } from '../../api/customers.api';
import { employeesApi } from '../../api/employees.api';
import { suppliersApi } from '../../api/suppliers.api';

// Base interface for entities with name/phone
export interface NamePhoneEntity {
  id: number;
  fullName?: string; // Customer, Employee
  name?: string; // Supplier
  phone?: string;
  phone2?: string;
}

interface NamePhoneSearchComboboxProps<T extends NamePhoneEntity> {
  value: string;
  onChange: (value: string) => void;
  onSelect: (entity: T) => void;
  fetchFunction: (search: string) => Promise<T[]>;
  getDisplayName: (entity: T) => string;
  getSubtitle?: (entity: T) => string | undefined;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  minSearchLength?: number;
  debounceMs?: number;
  dropdownFooter?: ReactNode;
}

// Custom hook for entity search with debouncing and abort
function useEntitySearch<T>(
  fetchFunction: (search: string) => Promise<T[]>,
  searchTerm: string,
  debounceMs: number,
  minLength: number
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cleanup previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (searchTerm.length < minLength) {
      setData([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const results = await fetchFunction(searchTerm);
        if (!controller.signal.aborted) {
          setData(results);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError('Xatolik yuz berdi');
          setData([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchTerm, fetchFunction, debounceMs, minLength]);

  return { data, loading, error };
}

export function NamePhoneSearchCombobox<T extends NamePhoneEntity>({
  value,
  onChange,
  onSelect,
  fetchFunction,
  getDisplayName,
  getSubtitle,
  placeholder = 'Qidirish...',
  label,
  disabled = false,
  className,
  minSearchLength = 2,
  debounceMs = 300,
  dropdownFooter,
}: NamePhoneSearchComboboxProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listId = useRef(`name-phone-listbox-${Math.random().toString(36).substr(2, 9)}`).current;

  const { data: entities, loading, error } = useEntitySearch(
    fetchFunction,
    value,
    debounceMs,
    minSearchLength
  );

  // Calculate dropdown position based on input location
  const updatePosition = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect() ?? inputRef.current?.getBoundingClientRect();
    if (rect) {
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
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

  // Show dropdown when entities available or loading
  useEffect(() => {
    if (value.length >= minSearchLength && (entities.length > 0 || loading)) {
      setIsOpen(true);
      updatePosition();
    } else if (value.length < minSearchLength) {
      setIsOpen(false);
    }
  }, [value, entities, loading, updatePosition, minSearchLength]);

  // Reset active index when entities change
  useEffect(() => {
    setActiveIndex(-1);
  }, [entities]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
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
    if (!isOpen || entities.length === 0) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        onChange('');
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < entities.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : entities.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < entities.length) {
          handleSelect(entities[activeIndex]);
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

  // Handle entity selection
  const handleSelect = (entity: T) => {
    onSelect(entity);
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

  // Format phone(s) for display
  const formatPhoneForDisplay = (entity: T): string => {
    const phones = [entity.phone, entity.phone2].filter(Boolean);
    return phones.join(', ');
  };

  // Get first letter for avatar
  const getInitial = (entity: T): string => {
    const name = getDisplayName(entity);
    return name.charAt(0).toUpperCase();
  };

  // Dropdown content
  const dropdownContent = (
    <div
      ref={dropdownRef}
      role="listbox"
      id={listId}
      aria-label="Qidiruv natijalari"
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
      {loading ? (
        // Loading state
        <div className="flex items-center justify-center gap-2 p-4 text-base-content/60">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Qidirilmoqda...</span>
        </div>
      ) : error ? (
        // Error state
        <div className="flex flex-col items-center justify-center gap-2 p-6 text-error">
          <span className="text-sm">{error}</span>
        </div>
      ) : entities.length === 0 ? (
        // Empty state
        <div className="flex flex-col items-center justify-center gap-2 p-6 text-base-content/50">
          <UserIcon className="h-8 w-8" />
          <span className="text-sm">Topilmadi</span>
        </div>
      ) : (
        // Results list
        <div className="max-h-72 overflow-y-auto py-1">
          {entities.map((entity, index) => {
            const displayName = getDisplayName(entity);
            const subtitle = getSubtitle?.(entity);
            const phoneDisplay = formatPhoneForDisplay(entity);

            return (
              <button
                key={entity.id}
                role="option"
                aria-selected={index === activeIndex}
                className={clsx(
                  'w-full px-4 py-3 text-left transition-colors',
                  'flex items-center gap-3',
                  index === activeIndex ? 'bg-primary text-primary-content' : 'hover:bg-base-200'
                )}
                onClick={() => handleSelect(entity)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                {/* Avatar */}
                <div className="avatar placeholder flex-shrink-0">
                  <div
                    className={clsx(
                      'w-10 h-10 rounded-full',
                      index === activeIndex
                        ? 'bg-primary-content/20 text-primary-content'
                        : 'bg-primary/15 text-primary'
                    )}
                  >
                    <span className="text-lg font-medium">{getInitial(entity)}</span>
                  </div>
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  {/* Name */}
                  <div className="font-medium truncate">{highlightMatch(displayName, value)}</div>

                  {/* Subtitle */}
                  {subtitle && (
                    <div
                      className={clsx(
                        'text-sm truncate',
                        index === activeIndex ? 'opacity-90' : 'text-base-content/70'
                      )}
                    >
                      {subtitle}
                    </div>
                  )}

                  {/* Phone */}
                  {phoneDisplay && (
                    <div
                      className={clsx(
                        'flex items-center gap-1 text-xs',
                        index === activeIndex ? 'opacity-80' : 'text-base-content/60'
                      )}
                    >
                      <Phone className="h-3 w-3" />
                      <span>{highlightMatch(phoneDisplay, value)}</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Keyboard hint */}
      {entities.length > 0 && (
        <div className="border-t border-base-200 px-4 py-2 text-xs text-base-content/50 flex items-center justify-between">
          <span>
            <kbd className="kbd kbd-xs">↑</kbd>
            <kbd className="kbd kbd-xs">↓</kbd> tanlash
          </span>
          <span>
            <kbd className="kbd kbd-xs">Enter</kbd> tanlash
          </span>
          <span>
            <kbd className="kbd kbd-xs">Esc</kbd> yopish
          </span>
        </div>
      )}

      {/* Custom footer */}
      {dropdownFooter && (
        <div className="border-t border-base-200">
          {dropdownFooter}
        </div>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      {label && (
        <label className="label">
          <span className="label-text">{label}</span>
        </label>
      )}
      <SearchInput
        value={value}
        onValueChange={onChange}
        placeholder={placeholder}
        hideLabel
        ariaLabel={label || placeholder}
        disabled={disabled}
        inputRef={inputRef}
        leadingIcon={loading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : undefined}
        onClear={handleClear}
        inputProps={{
          role: 'combobox',
          'aria-expanded': isOpen,
          'aria-controls': listId,
          'aria-autocomplete': 'list',
          'aria-activedescendant': activeIndex >= 0 ? `entity-option-${activeIndex}` : undefined,
          onKeyDown: handleKeyDown,
          onFocus: () => {
            if (value.length >= minSearchLength && (entities.length > 0 || loading)) {
              setIsOpen(true);
              updatePosition();
            }
          },
        }}
      />

      {/* Dropdown rendered via portal */}
      {isOpen && createPortal(dropdownContent, document.body)}
    </div>
  );
}

// Wrapper component for Customer search
export function CustomerSearchCombobox({
  getSubtitle,
  dropdownFooter,
  ...props
}: Omit<
  NamePhoneSearchComboboxProps<Customer>,
  'fetchFunction' | 'getDisplayName' | 'getSubtitle'
> & {
  getSubtitle?: (customer: Customer) => string | undefined;
  dropdownFooter?: ReactNode;
}) {
  const fetchCustomers = async (search: string) => {
    const response = await customersApi.getAll({ search, size: 20 });
    return response.content;
  };

  const getDisplayName = (customer: Customer) => customer.fullName;

  const defaultGetSubtitle = (customer: Customer) => customer.companyName;

  return (
    <NamePhoneSearchCombobox
      {...props}
      fetchFunction={fetchCustomers}
      getDisplayName={getDisplayName}
      getSubtitle={getSubtitle ?? defaultGetSubtitle}
      placeholder={props.placeholder ?? 'Mijozni qidirish...'}
      dropdownFooter={dropdownFooter}
    />
  );
}

// Wrapper component for Employee search
export function EmployeeSearchCombobox({
  getSubtitle,
  dropdownFooter,
  ...props
}: Omit<
  NamePhoneSearchComboboxProps<Employee>,
  'fetchFunction' | 'getDisplayName' | 'getSubtitle'
> & {
  getSubtitle?: (employee: Employee) => string | undefined;
  dropdownFooter?: ReactNode;
}) {
  const fetchEmployees = async (search: string) => {
    const response = await employeesApi.getAll({ search, size: 20 });
    return response.content;
  };

  const getDisplayName = (employee: Employee) => employee.fullName;

  const defaultGetSubtitle = (employee: Employee) =>
    [employee.position, employee.department].filter(Boolean).join(' • ');

  return (
    <NamePhoneSearchCombobox
      {...props}
      fetchFunction={fetchEmployees}
      getDisplayName={getDisplayName}
      getSubtitle={getSubtitle ?? defaultGetSubtitle}
      placeholder={props.placeholder ?? 'Xodimni qidirish...'}
      dropdownFooter={dropdownFooter}
    />
  );
}

// Wrapper component for Supplier search
export function SupplierSearchCombobox({
  getSubtitle,
  dropdownFooter,
  ...props
}: Omit<
  NamePhoneSearchComboboxProps<Supplier>,
  'fetchFunction' | 'getDisplayName' | 'getSubtitle'
> & {
  getSubtitle?: (supplier: Supplier) => string | undefined;
  dropdownFooter?: ReactNode;
}) {
  const fetchSuppliers = async (search: string) => {
    const response = await suppliersApi.getAll({ search, size: 20 });
    return response.content;
  };

  const getDisplayName = (supplier: Supplier) => supplier.name;

  const defaultGetSubtitle = (supplier: Supplier) => supplier.contactPerson;

  return (
    <NamePhoneSearchCombobox
      {...props}
      fetchFunction={fetchSuppliers}
      getDisplayName={getDisplayName}
      getSubtitle={getSubtitle ?? defaultGetSubtitle}
      placeholder={props.placeholder ?? "Ta'minotchini qidirish..."}
      dropdownFooter={dropdownFooter}
    />
  );
}
