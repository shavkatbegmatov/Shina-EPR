import { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'lucide-react';
import clsx from 'clsx';
import { productsApi } from '../../api/products.api';
import { customersApi } from '../../api/customers.api';
import { salesApi } from '../../api/sales.api';
import { formatCurrency } from '../../config/constants';
import type { Product, Customer, Sale } from '../../types';

interface SearchResult {
  id: string;
  type: 'product' | 'customer' | 'sale' | 'page';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  href: string;
  meta?: string;
}

const QUICK_ACTIONS: SearchResult[] = [
  { id: 'page-dashboard', type: 'page', title: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, href: '/' },
  { id: 'page-pos', type: 'page', title: 'Kassa (POS)', subtitle: 'Yangi sotuv qilish', icon: <ShoppingCart className="h-4 w-4" />, href: '/pos' },
  { id: 'page-products', type: 'page', title: 'Mahsulotlar', icon: <Package className="h-4 w-4" />, href: '/products' },
  { id: 'page-customers', type: 'page', title: 'Mijozlar', icon: <Users className="h-4 w-4" />, href: '/customers' },
  { id: 'page-sales', type: 'page', title: 'Sotuvlar', icon: <CreditCard className="h-4 w-4" />, href: '/sales' },
  { id: 'page-warehouse', type: 'page', title: 'Ombor', icon: <Warehouse className="h-4 w-4" />, href: '/warehouse' },
  { id: 'page-reports', type: 'page', title: 'Hisobotlar', icon: <BarChart3 className="h-4 w-4" />, href: '/reports' },
  { id: 'page-settings', type: 'page', title: 'Sozlamalar', icon: <Settings className="h-4 w-4" />, href: '/settings' },
];

const RECENT_SEARCHES_KEY = 'search_recent';
const MAX_RECENT = 5;

export function SearchCommand() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
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

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const [productsRes, customersRes, salesRes] = await Promise.all([
        productsApi.getAll({ search: searchQuery, size: 5 }),
        customersApi.getAll({ search: searchQuery, size: 5 }),
        salesApi.getAll({ page: 0, size: 5 }),
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
          icon: <Package className="h-4 w-4" />,
          href: `/products?search=${encodeURIComponent(product.name)}`,
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
          icon: <Users className="h-4 w-4" />,
          href: `/customers?search=${encodeURIComponent(customer.fullName)}`,
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
            icon: <CreditCard className="h-4 w-4" />,
            href: `/sales?search=${encodeURIComponent(sale.invoiceNumber)}`,
            meta: formatCurrency(sale.totalAmount),
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
    const items = query ? results : [...recentSearches, ...QUICK_ACTIONS];

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

  const displayItems = query ? results : [...recentSearches, ...QUICK_ACTIONS];
  const hasRecent = !query && recentSearches.length > 0;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={clsx(
          'flex items-center gap-2 w-full max-w-md px-3 py-2 rounded-lg',
          'bg-base-200/50 border border-base-200 transition-all duration-200',
          'hover:bg-base-200 hover:border-base-300',
          'text-base-content/50 text-sm'
        )}
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Qidirish...</span>
        <kbd className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-base-300/50 rounded">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-[15%] z-50 mx-auto max-w-xl">
        <div className="surface-card overflow-hidden shadow-2xl">
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
              className="flex-1 bg-transparent py-4 text-base outline-none placeholder:text-base-content/40"
            />
            <button
              onClick={() => setOpen(false)}
              className="btn btn-ghost btn-sm btn-square"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
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
                        selectedIndex === index
                          ? 'bg-primary-content/20'
                          : item.type === 'product'
                          ? 'bg-info/10 text-info'
                          : item.type === 'customer'
                          ? 'bg-success/10 text-success'
                          : item.type === 'sale'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-base-200 text-base-content/70'
                      )}
                    >
                      {item.icon}
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
    </>
  );
}
