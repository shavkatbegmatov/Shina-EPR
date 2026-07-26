import { useCallback, useState } from 'react';
import { suppliersApi } from '../../api/suppliers.api';
import { getApiErrorMessage } from '../../utils/apiError';
import type { Supplier } from '../../types';

/**
 * Ta'minotchilar ro'yxati, sahifalash va statistika.
 *
 * <p>Ilgari bularning barchasi `SuppliersPage` ichida 12 ta alohida
 * `useState` bo'lib yotardi va xaridlar holati bilan aralashib ketgan edi —
 * qaysi o'zgaruvchi qaysi jadvalga tegishli ekanini ajratish qiyin edi.
 */
export function useSuppliersData() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Dropdown uchun barcha faol ta'minotchilar — sahifalangan ro'yxatdan
  // ALOHIDA: xarid oynasida 2-sahifadagi ta'minotchi ham tanlanishi kerak.
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);

  const [totalDebt, setTotalDebt] = useState(0);
  const [suppliersWithDebt, setSuppliersWithDebt] = useState<Supplier[]>([]);

  const load = useCallback(async (isInitial = false) => {
    if (!isInitial) {
      setRefreshing(true);
    }
    try {
      const data = await suppliersApi.getAll({
        page,
        size: pageSize,
        search: search || undefined,
      });
      setSuppliers(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
      setLoadError(null);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
      setLoadError(getApiErrorMessage(error));
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, search]);

  const loadAll = useCallback(async () => {
    try {
      setAllSuppliers(await suppliersApi.getActive());
    } catch (error) {
      console.error('Failed to load all suppliers:', error);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const [debt, withDebt] = await Promise.all([
        suppliersApi.getTotalDebt(),
        suppliersApi.getWithDebt(),
      ]);
      setTotalDebt(debt);
      setSuppliersWithDebt(withDebt);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  /** Filtr o'zgarganda birinchi sahifaga qaytariladi. */
  const changeSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, []);

  const changePageSize = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  }, []);

  return {
    suppliers,
    allSuppliers,
    loadError,
    initialLoading,
    refreshing,
    search,
    page,
    pageSize,
    totalPages,
    totalElements,
    totalDebt,
    suppliersWithDebt,
    setPage,
    changeSearch,
    changePageSize,
    load,
    loadAll,
    loadStats,
  };
}
