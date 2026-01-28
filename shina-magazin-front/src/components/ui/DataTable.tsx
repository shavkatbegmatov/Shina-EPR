import { useState, useMemo, useEffect, useRef, ReactNode } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import clsx from 'clsx';
import { Select } from './Select';

// Types
export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  render?: (item: T, index: number) => ReactNode;
  getValue?: (item: T) => string | number | boolean | null | undefined;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string | number;

  // Pagination
  totalElements?: number;
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];

  // Sorting (server-side)
  sortConfig?: SortConfig;
  onSort?: (key: string) => void;

  // Client-side sorting (if no onSort provided)
  enableClientSort?: boolean;

  // States
  loading?: boolean;
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;

  // Row customization
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;

  // Highlight row (for search results)
  highlightId?: string | number | null;
  onHighlightComplete?: () => void;

  // Mobile card
  renderMobileCard?: (item: T, index: number) => ReactNode;

  // Styling
  className?: string;
  containerClassName?: string;
}

// Sort utility
function sortData<T>(
  data: T[],
  sortConfig: SortConfig,
  columns: Column<T>[]
): T[] {
  if (!sortConfig.key || !sortConfig.direction) {
    return data;
  }

  const column = columns.find(c => c.key === sortConfig.key);

  return [...data].sort((a, b) => {
    let aValue: unknown;
    let bValue: unknown;

    if (column?.getValue) {
      aValue = column.getValue(a);
      bValue = column.getValue(b);
    } else {
      aValue = (a as Record<string, unknown>)[sortConfig.key];
      bValue = (b as Record<string, unknown>)[sortConfig.key];
    }

    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
    if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;

    let comparison = 0;
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue, 'uz');
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    } else {
      comparison = String(aValue).localeCompare(String(bValue), 'uz');
    }

    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  totalElements = data.length,
  totalPages = 1,
  currentPage = 0,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  sortConfig: externalSortConfig,
  onSort,
  enableClientSort = true,
  loading = false,
  emptyIcon,
  emptyTitle = "Ma'lumotlar topilmadi",
  emptyDescription = "Filtrlarni o'zgartirib ko'ring",
  onRowClick,
  rowClassName,
  highlightId,
  onHighlightComplete,
  renderMobileCard,
  className,
  containerClassName,
}: DataTableProps<T>) {
  // Internal sort state (for client-side sorting)
  const [internalSortConfig, setInternalSortConfig] = useState<SortConfig>({
    key: '',
    direction: null,
  });

  // Highlight animation state
  const [activeHighlight, setActiveHighlight] = useState<string | number | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Handle highlight
  useEffect(() => {
    if (highlightId != null && data.length > 0) {
      // Find the item
      const itemExists = data.some(item => keyExtractor(item) === highlightId);

      if (itemExists) {
        setActiveHighlight(highlightId);

        // Scroll to highlighted row
        setTimeout(() => {
          const row = tableRef.current?.querySelector(`[data-highlight-id="${highlightId}"]`);
          if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);

        // Clear highlight after animation
        highlightTimeoutRef.current = setTimeout(() => {
          setActiveHighlight(null);
          onHighlightComplete?.();
        }, 3000);
      }
    }

    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, [highlightId, data, keyExtractor, onHighlightComplete]);

  const sortConfig = externalSortConfig || internalSortConfig;

  const handleSort = (key: string) => {
    if (onSort) {
      onSort(key);
    } else if (enableClientSort) {
      setInternalSortConfig((prev) => {
        if (prev.key !== key) {
          return { key, direction: 'asc' };
        }
        if (prev.direction === 'asc') {
          return { key, direction: 'desc' };
        }
        if (prev.direction === 'desc') {
          return { key: '', direction: null };
        }
        return { key, direction: 'asc' };
      });
    }
  };

  // Sort data if client-side sorting
  const sortedData = useMemo(() => {
    if (onSort || !enableClientSort) {
      return data;
    }
    return sortData(data, internalSortConfig, columns);
  }, [data, internalSortConfig, columns, onSort, enableClientSort]);

  // Pagination helpers
  const getVisiblePages = () => {
    const delta = 1;
    const pages: (number | 'ellipsis')[] = [];
    const left = Math.max(0, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    if (left > 0) {
      pages.push(0);
      if (left > 1) pages.push('ellipsis');
    }

    for (let i = left; i <= right; i++) {
      pages.push(i);
    }

    if (right < totalPages - 1) {
      if (right < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages - 1);
    }

    return pages;
  };

  const startItem = currentPage * pageSize + 1;
  const endItem = Math.min((currentPage + 1) * pageSize, totalElements);
  const visiblePages = getVisiblePages();

  // Render sort icon
  const renderSortIcon = (key: string) => {
    const isActive = sortConfig.key === key;
    const direction = isActive ? sortConfig.direction : null;

    return (
      <span className={clsx('transition-opacity ml-1', isActive ? 'opacity-100' : 'opacity-30')}>
        {direction === 'asc' ? (
          <ArrowUp className="h-3.5 w-3.5 inline" />
        ) : direction === 'desc' ? (
          <ArrowDown className="h-3.5 w-3.5 inline" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 inline" />
        )}
      </span>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className={clsx('surface-card', containerClassName)}>
        <div className="flex items-center justify-center h-64">
          <span className="loading loading-spinner loading-lg" />
        </div>
      </div>
    );
  }

  // Empty state
  if (sortedData.length === 0) {
    return (
      <div className={clsx('surface-card', containerClassName)}>
        <div className="flex flex-col items-center justify-center gap-2 p-10 text-center text-base-content/50">
          {emptyIcon && <div className="mb-2">{emptyIcon}</div>}
          <div>
            <p className="text-base font-medium">{emptyTitle}</p>
            <p className="text-sm">{emptyDescription}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={tableRef} className={clsx('surface-card', containerClassName)}>
      {/* Desktop Table */}
      <div className={clsx('hidden lg:block', className)}>
        <table className="table table-zebra w-full">
          <thead className="sticky -top-6 z-20 bg-base-100">
            <tr className="shadow-[0_1px_3px_-1px_rgba(0,0,0,0.1)]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={clsx(
                    column.sortable !== false && 'cursor-pointer select-none transition-colors hover:bg-base-200/50',
                    sortConfig.key === column.key && 'bg-base-200/30',
                    '!bg-base-100 border-b border-base-200',
                    column.headerClassName
                  )}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    <span>{column.header}</span>
                    {column.sortable !== false && renderSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item, index) => {
              const itemId = keyExtractor(item);
              const isHighlighted = activeHighlight === itemId;

              return (
              <tr
                key={itemId}
                data-highlight-id={itemId}
                className={clsx(
                  'transition',
                  onRowClick && 'cursor-pointer hover:bg-base-200/50',
                  rowClassName?.(item),
                  isHighlighted && 'animate-highlight-row'
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <td key={column.key} className={column.className}>
                    {column.render
                      ? column.render(item, index)
                      : String((item as Record<string, unknown>)[column.key] ?? '—')}
                  </td>
                ))}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      {renderMobileCard && (
        <div className="space-y-3 p-4 lg:hidden">
          {sortedData.map((item, index) => {
            const itemId = keyExtractor(item);
            const isHighlighted = activeHighlight === itemId;

            return (
              <div
                key={itemId}
                data-highlight-id={itemId}
                className={clsx(isHighlighted && 'animate-highlight-row rounded-xl')}
                onClick={() => onRowClick?.(item)}
              >
                {renderMobileCard(item, index)}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {(totalPages > 1 || totalElements > 0) && onPageChange && (
        <div className="flex flex-col gap-3 border-t border-base-200 bg-base-100/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Left side - Info & Page size */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {totalElements > 0 && (
              <div className="text-base-content/60">
                <span className="font-medium text-base-content">{startItem}-{endItem}</span>
                {' / '}
                <span className="font-medium text-base-content">{totalElements.toLocaleString()}</span>
                {' '}ta
              </div>
            )}

            {onPageSizeChange && (
              <div className="flex items-center gap-2">
                <span className="text-base-content/50 text-xs hidden sm:inline">Ko'rsatish:</span>
                <Select
                  value={pageSize}
                  onChange={(val) => onPageSizeChange(Number(val))}
                  options={pageSizeOptions.map((size) => ({
                    value: size,
                    label: `${size} ta`,
                  }))}
                  className="w-24"
                />
              </div>
            )}
          </div>

          {/* Right side - Page navigation */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                className={clsx('btn btn-ghost btn-sm btn-square', currentPage === 0 && 'btn-disabled opacity-40')}
                onClick={() => onPageChange(0)}
                disabled={currentPage === 0}
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                className={clsx('btn btn-ghost btn-sm btn-square', currentPage === 0 && 'btn-disabled opacity-40')}
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-0.5 mx-1">
                {visiblePages.map((page, idx) =>
                  page === 'ellipsis' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-base-content/40">•••</span>
                  ) : (
                    <button
                      key={page}
                      className={clsx(
                        'btn btn-sm min-w-[2.25rem]',
                        currentPage === page ? 'btn-primary' : 'btn-ghost hover:bg-base-200'
                      )}
                      onClick={() => onPageChange(page)}
                    >
                      {page + 1}
                    </button>
                  )
                )}
              </div>

              <button
                className={clsx('btn btn-ghost btn-sm btn-square', currentPage >= totalPages - 1 && 'btn-disabled opacity-40')}
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                className={clsx('btn btn-ghost btn-sm btn-square', currentPage >= totalPages - 1 && 'btn-disabled opacity-40')}
                onClick={() => onPageChange(totalPages - 1)}
                disabled={currentPage >= totalPages - 1}
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
