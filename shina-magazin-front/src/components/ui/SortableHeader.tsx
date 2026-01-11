import { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import clsx from 'clsx';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: SortConfig;
  onSort: (key: string) => void;
  className?: string;
}

export function SortableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = currentSort.key === sortKey;
  const direction = isActive ? currentSort.direction : null;

  return (
    <th
      className={clsx(
        'cursor-pointer select-none transition-colors hover:bg-base-200/50',
        isActive && 'bg-base-200/30',
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1.5">
        <span>{label}</span>
        <span
          className={clsx(
            'transition-opacity',
            isActive ? 'opacity-100' : 'opacity-30'
          )}
        >
          {direction === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : direction === 'desc' ? (
            <ArrowDown className="h-3.5 w-3.5" />
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5" />
          )}
        </span>
      </div>
    </th>
  );
}

// Hook for managing sort state
export function useSorting(defaultKey: string = '', defaultDirection: SortDirection = null) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: defaultKey,
    direction: defaultDirection,
  });

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
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
  };

  return { sortConfig, handleSort };
}

// Generic sort function for arrays
export function sortData<T>(
  data: T[],
  sortConfig: SortConfig,
  getters?: Record<string, (item: T) => string | number | boolean | null | undefined>
): T[] {
  if (!sortConfig.key || !sortConfig.direction) {
    return data;
  }

  return [...data].sort((a, b) => {
    let aValue: unknown;
    let bValue: unknown;

    if (getters && getters[sortConfig.key]) {
      aValue = getters[sortConfig.key](a);
      bValue = getters[sortConfig.key](b);
    } else {
      aValue = (a as Record<string, unknown>)[sortConfig.key];
      bValue = (b as Record<string, unknown>)[sortConfig.key];
    }

    // Handle null/undefined
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
    if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;

    // Compare values
    let comparison = 0;
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue, 'uz');
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
      comparison = aValue === bValue ? 0 : aValue ? -1 : 1;
    } else {
      comparison = String(aValue).localeCompare(String(bValue), 'uz');
    }

    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });
}
