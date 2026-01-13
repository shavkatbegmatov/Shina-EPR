import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Package,
  Users,
  CreditCard,
  LayoutDashboard,
  ShoppingCart,
  Warehouse,
  BarChart3,
  Settings,
  Clock,
  ArrowRight,
  Loader2,
  Wallet,
  Truck,
  UserCog,
  Shield,
  type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { productsApi } from '../../api/products.api';
import { customersApi } from '../../api/customers.api';
import { salesApi } from '../../api/sales.api';
import { debtsApi } from '../../api/debts.api';
import { purchasesApi } from '../../api/purchases.api';
import { suppliersApi } from '../../api/suppliers.api';
import { employeesApi } from '../../api/employees.api';
import { formatCurrency } from '../../config/constants';
import type { Product, Customer, Sale, Debt, PurchaseOrder, Supplier, Employee } from '../../types';

type ResultType = 'product' | 'customer' | 'sale' | 'debt' | 'purchase' | 'supplier' | 'employee' | 'page';

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle?: string;
  href: string;
  meta?: string;
}

// Icon mapping by type
const ICON_MAP: Record<ResultType, LucideIcon> = {
  product: Package,
  customer: Users,
  sale: CreditCard,
  debt: Wallet,
  purchase: Truck,
  supplier: Truck,
  employee: UserCog,
  page: LayoutDashboard,
};

// Page-specific icons
const PAGE_ICONS: Record<string, LucideIcon> = {
  'page-dashboard': LayoutDashboard,
  'page-pos': ShoppingCart,
  'page-products': Package,
  'page-customers': Users,
  'page-sales': CreditCard,
  'page-debts': Wallet,
  'page-purchases': Truck,
  'page-suppliers': Truck,
  'page-warehouse': Warehouse,
  'page-employees': UserCog,
  'page-roles': Shield,
  'page-reports': BarChart3,
  'page-settings': Settings,
};

const QUICK_ACTIONS: SearchResult[] = [
  { id: 'page-dashboard', type: 'page', title: 'Dashboard', href: '/' },
  { id: 'page-pos', type: 'page', title: 'Kassa (POS)', subtitle: 'Yangi sotuv qilish', href: '/pos' },
  { id: 'page-products', type: 'page', title: 'Mahsulotlar', href: '/products' },
  { id: 'page-customers', type: 'page', title: 'Mijozlar', href: '/customers' },
  { id: 'page-sales', type: 'page', title: 'Sotuvlar', href: '/sales' },
  { id: 'page-debts', type: 'page', title: 'Qarzlar', subtitle: 'Qarzdorlik nazorati', href: '/debts' },
  { id: 'page-purchases', type: 'page', title: 'Xaridlar', subtitle: 'Kirim hujjatlari', href: '/purchases' },
  { id: 'page-suppliers', type: 'page', title: "Ta'minotchilar", href: '/suppliers' },
  { id: 'page-warehouse', type: 'page', title: 'Ombor', subtitle: 'Zaxira nazorati', href: '/warehouse' },
  { id: 'page-employees', type: 'page', title: 'Xodimlar', href: '/employees' },
  { id: 'page-roles', type: 'page', title: 'Rollar', subtitle: 'Ruxsatlar boshqaruvi', href: '/roles' },
  { id: 'page-reports', type: 'page', title: 'Hisobotlar', href: '/reports' },
  { id: 'page-settings', type: 'page', title: 'Sozlamalar', href: '/settings' },
];

const RECENT_SEARCHES_KEY = 'search_recent';
const MAX_RECENT = 5;

// Get icon for a result
function getResultIcon(result: SearchResult): LucideIcon {
  if (result.type === 'page' && PAGE_ICONS[result.id]) {
    return PAGE_ICONS[result.id];
  }
  return ICON_MAP[result.type] || LayoutDashboard;
}

// Get icon color classes
function getIconColorClass(type: ResultType, isSelected: boolean): string {
  if (isSelected) return 'bg-primary-content/20';

  switch (type) {
    case 'product':
      return 'bg-info/10 text-info';
    case 'customer':
      return 'bg-success/10 text-success';
    case 'sale':
      return 'bg-warning/10 text-warning';
    default:
      return 'bg-base-200 text-base-content/70';
  }
}

export function SearchCommand() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  // Save recent search
  const saveRecentSearch = useCallback((result: SearchResult) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((r) => r.id !== result.id);
      const updated = [result, ...filtered].slice(0, MAX_RECENT);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Calculate dropdown position
  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: Math.max(rect.width, 400),
      });
    }
  }, []);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Focus input and update position when opened
  useEffect(() => {
    if (open) {
      updatePosition();
      setTimeout(() => inputRef.current?.focus(), 0);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open, updatePosition]);

  // Update position on resize
  useEffect(() => {
    if (open) {
      window.addEventListener('resize', updatePosition);
      return () => window.removeEventListener('resize', updatePosition);
    }
  }, [open, updatePosition]);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const [productsRes, customersRes, salesRes, debtsRes, purchasesRes, suppliersRes, employeesRes] = await Promise.all([
        productsApi.getAll({ search: searchQuery, size: 5 }),
        customersApi.getAll({ search: searchQuery, size: 5 }),
        salesApi.getAll({ page: 0, size: 5 }),
        debtsApi.getAll({ page: 0, size: 5 }),
        purchasesApi.getAll({ page: 0, size: 5 }),
        suppliersApi.getAll({ search: searchQuery, size: 5 }),
        employeesApi.getAll({ search: searchQuery, size: 5 }),
      ]);

      const searchResults: SearchResult[] = [];

      // Filter pages by query
      const matchedPages = QUICK_ACTIONS.filter(
        (action) =>
          action.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          action.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      searchResults.push(...matchedPages);

      // Products
      productsRes.content.forEach((product: Product) => {
        searchResults.push({
          id: `product-${product.id}`,
          type: 'product',
          title: product.name,
          subtitle: product.sku,
          href: `/products?highlight=${product.id}`,
          meta: formatCurrency(product.sellingPrice),
        });
      });

      // Customers
      customersRes.content.forEach((customer: Customer) => {
        searchResults.push({
          id: `customer-${customer.id}`,
          type: 'customer',
          title: customer.fullName,
          subtitle: customer.phone,
          href: `/customers?highlight=${customer.id}`,
          meta: customer.balance < 0 ? `Qarz: ${formatCurrency(Math.abs(customer.balance))}` : undefined,
        });
      });

      // Sales (filter by invoice number)
      salesRes.content
        .filter((sale: Sale) => sale.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()))
        .forEach((sale: Sale) => {
          searchResults.push({
            id: `sale-${sale.id}`,
            type: 'sale',
            title: sale.invoiceNumber,
            subtitle: sale.customerName || "Noma'lum mijoz",
            href: `/sales?highlight=${sale.id}`,
            meta: formatCurrency(sale.totalAmount),
          });
        });

      // Debts (filter by customer name or phone)
      debtsRes.content
        .filter((debt: Debt) =>
          debt.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          debt.customerPhone.includes(searchQuery)
        )
        .forEach((debt: Debt) => {
          searchResults.push({
            id: `debt-${debt.id}`,
            type: 'debt',
            title: debt.customerName,
            subtitle: debt.invoiceNumber || debt.customerPhone,
            href: `/debts?highlight=${debt.id}`,
            meta: `Qarz: ${formatCurrency(debt.remainingAmount)}`,
          });
        });

      // Purchases (filter by order number or supplier)
      purchasesRes.content
        .filter((purchase: PurchaseOrder) =>
          purchase.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          purchase.supplierName?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .forEach((purchase: PurchaseOrder) => {
          searchResults.push({
            id: `purchase-${purchase.id}`,
            type: 'purchase',
            title: purchase.orderNumber || `Xarid #${purchase.id}`,
            subtitle: purchase.supplierName || "Noma'lum ta'minotchi",
            href: `/purchases?highlight=${purchase.id}`,
            meta: formatCurrency(purchase.totalAmount),
          });
        });

      // Suppliers
      suppliersRes.content.forEach((supplier: Supplier) => {
        searchResults.push({
          id: `supplier-${supplier.id}`,
          type: 'supplier',
          title: supplier.name,
          subtitle: supplier.phone || supplier.contactPerson,
          href: `/suppliers?highlight=${supplier.id}`,
        });
      });

      // Employees
      employeesRes.content.forEach((employee: Employee) => {
        searchResults.push({
          id: `employee-${employee.id}`,
          type: 'employee',
          title: employee.fullName,
          subtitle: employee.phone || employee.position,
          href: `/employees?highlight=${employee.id}`,
        });
      });

      setResults(searchResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Handle selection
  const handleSelect = useCallback(
    (result: SearchResult) => {
      saveRecentSearch(result);
      navigate(result.href);
      setOpen(false);
    },
    [navigate, saveRecentSearch]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const recentIdsSet = new Set(recentSearches.map((r) => r.id));
    const filteredActions = QUICK_ACTIONS.filter((action) => !recentIdsSet.has(action.id));
    const items = query ? results : [...recentSearches, ...filteredActions];

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
    } else if (e.key === 'Enter' && items[selectedIndex]) {
      e.preventDefault();
      handleSelect(items[selectedIndex]);
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    const selectedEl = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Filter out QUICK_ACTIONS that are already in recentSearches to avoid duplicate keys
  const recentIds = new Set(recentSearches.map((r) => r.id));
  const filteredQuickActions = QUICK_ACTIONS.filter((action) => !recentIds.has(action.id));
  const displayItems = query ? results : [...recentSearches, ...filteredQuickActions];
  const hasRecent = !query && recentSearches.length > 0;

  return (
    <>
      {/* Desktop trigger */}
      <button
        ref={triggerRef}
        onClick={() => setOpen(true)}
        className={clsx(
          'hidden md:flex items-center gap-2 w-full max-w-md px-3 py-2 rounded-xl',
          'bg-base-200/50 border border-base-300 transition-all duration-200',
          'hover:bg-base-200 hover:border-base-content/20',
          'text-base-content/50 text-sm',
          open && 'border-primary ring-2 ring-primary/20'
        )}
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Qidirish...</span>
        <kbd className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-base-300/50 rounded">
          ⌘K
        </kbd>
      </button>

      {/* Mobile trigger */}
      <button
        onClick={() => setOpen(true)}
        className="btn btn-ghost btn-sm btn-square md:hidden"
        title="Qidirish"
      >
        <Search className="h-4 w-4" />
      </button>

      {/* Dropdown via Portal */}
      {open && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/30"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown */}
          <div
            className="fixed z-50 w-full max-w-xl"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              minWidth: dropdownPosition.width,
            }}
          >
            <div className="bg-base-100 rounded-xl border border-base-300 shadow-[0_4px_30px_rgba(0,0,0,0.15)] overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-base-200 px-4">
                {loading ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                ) : (
                  <Search className="h-5 w-5 text-base-content/40" />
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Mahsulot, mijoz yoki sahifa qidiring..."
                  className="flex-1 bg-transparent py-3 text-base outline-none placeholder:text-base-content/40"
                />
                <button
                  onClick={() => setOpen(false)}
                  className="btn btn-ghost btn-sm btn-circle"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
                {displayItems.length === 0 && query && !loading && (
                  <div className="py-8 text-center text-base-content/50">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>"{query}" bo'yicha natija topilmadi</p>
                  </div>
                )}

                {hasRecent && (
                  <div className="px-2 py-1.5 text-xs font-medium text-base-content/50 flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    So'nggi qidiruvlar
                  </div>
                )}

                {displayItems.map((item, index) => {
                  const isQuickAction = !query && index >= recentSearches.length;
                  const showQuickActionHeader = isQuickAction && index === recentSearches.length;
                  const Icon = getResultIcon(item);

                  return (
                    <div key={item.id}>
                      {showQuickActionHeader && (
                        <div className="px-2 py-1.5 text-xs font-medium text-base-content/50 mt-2">
                          Tez havolalar
                        </div>
                      )}
                      <button
                        data-index={index}
                        onClick={() => handleSelect(item)}
                        className={clsx(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                          selectedIndex === index
                            ? 'bg-primary text-primary-content'
                            : 'hover:bg-base-200/70'
                        )}
                      >
                        <div
                          className={clsx(
                            'grid h-8 w-8 place-items-center rounded-lg',
                            getIconColorClass(item.type, selectedIndex === index)
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{item.title}</div>
                          {item.subtitle && (
                            <div
                              className={clsx(
                                'text-xs truncate',
                                selectedIndex === index
                                  ? 'text-primary-content/70'
                                  : 'text-base-content/50'
                              )}
                            >
                              {item.subtitle}
                            </div>
                          )}
                        </div>
                        {item.meta && (
                          <div
                            className={clsx(
                              'text-sm font-medium',
                              selectedIndex === index
                                ? 'text-primary-content/80'
                                : 'text-base-content/60'
                            )}
                          >
                            {item.meta}
                          </div>
                        )}
                        <ArrowRight
                          className={clsx(
                            'h-4 w-4 transition-transform',
                            selectedIndex === index
                              ? 'translate-x-0 opacity-100'
                              : '-translate-x-2 opacity-0'
                          )}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-base-200 px-4 py-2 text-xs text-base-content/50">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-base-200 rounded">↑↓</kbd>
                    navigatsiya
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-base-200 rounded">↵</kbd>
                    tanlash
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-base-200 rounded">esc</kbd>
                    yopish
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
