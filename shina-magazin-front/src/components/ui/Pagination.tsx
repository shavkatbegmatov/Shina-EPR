import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import clsx from 'clsx';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  showPageSize?: boolean;
  showInfo?: boolean;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSize = true,
  showInfo = true,
  className,
}: PaginationProps) {
  // Calculate visible page numbers
  const getVisiblePages = () => {
    const delta = 1; // Pages to show on each side of current
    const pages: (number | 'ellipsis')[] = [];

    const left = Math.max(0, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    // Always show first page
    if (left > 0) {
      pages.push(0);
      if (left > 1) {
        pages.push('ellipsis');
      }
    }

    // Show middle pages
    for (let i = left; i <= right; i++) {
      pages.push(i);
    }

    // Always show last page
    if (right < totalPages - 1) {
      if (right < totalPages - 2) {
        pages.push('ellipsis');
      }
      pages.push(totalPages - 1);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  // Calculate showing range
  const startItem = currentPage * pageSize + 1;
  const endItem = Math.min((currentPage + 1) * pageSize, totalElements);

  if (totalPages <= 1 && !showInfo) {
    return null;
  }

  return (
    <div
      className={clsx(
        'flex flex-col gap-3 border-t border-base-200 bg-base-100/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      {/* Left side - Info & Page size */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {showInfo && totalElements > 0 && (
          <div className="text-base-content/60">
            <span className="font-medium text-base-content">{startItem}-{endItem}</span>
            {' / '}
            <span className="font-medium text-base-content">{totalElements.toLocaleString()}</span>
            {' '}ta
          </div>
        )}

        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-base-content/50 text-xs hidden sm:inline">Ko'rsatish:</span>
            <select
              className="select select-bordered select-xs bg-base-100"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} ta
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side - Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First page */}
          <button
            className={clsx(
              'btn btn-ghost btn-sm btn-square transition-all',
              currentPage === 0 && 'btn-disabled opacity-40'
            )}
            onClick={() => onPageChange(0)}
            disabled={currentPage === 0}
            title="Birinchi sahifa"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>

          {/* Previous page */}
          <button
            className={clsx(
              'btn btn-ghost btn-sm btn-square transition-all',
              currentPage === 0 && 'btn-disabled opacity-40'
            )}
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 0}
            title="Oldingi sahifa"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-0.5 mx-1">
            {visiblePages.map((page, index) => (
              page === 'ellipsis' ? (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 text-base-content/40"
                >
                  •••
                </span>
              ) : (
                <button
                  key={page}
                  className={clsx(
                    'btn btn-sm min-w-[2.25rem] transition-all',
                    currentPage === page
                      ? 'btn-primary'
                      : 'btn-ghost hover:bg-base-200'
                  )}
                  onClick={() => onPageChange(page)}
                >
                  {page + 1}
                </button>
              )
            ))}
          </div>

          {/* Next page */}
          <button
            className={clsx(
              'btn btn-ghost btn-sm btn-square transition-all',
              currentPage >= totalPages - 1 && 'btn-disabled opacity-40'
            )}
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            title="Keyingi sahifa"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Last page */}
          <button
            className={clsx(
              'btn btn-ghost btn-sm btn-square transition-all',
              currentPage >= totalPages - 1 && 'btn-disabled opacity-40'
            )}
            onClick={() => onPageChange(totalPages - 1)}
            disabled={currentPage >= totalPages - 1}
            title="Oxirgi sahifa"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
