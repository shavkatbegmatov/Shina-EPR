import { useCallback, useState } from 'react';
import { purchasesApi } from '../../api/purchases.api';
import { getApiErrorMessage } from '../../utils/apiError';
import type { PurchaseOrder, PurchaseStats } from '../../types';

/**
 * Xaridlar ro'yxati, sahifalash va statistika.
 *
 * <p>Ta'minotchilar holatidan ALOHIDA: ikkalasi bir komponentda turganda
 * `page`/`purchasesPage`, `refreshing`/`purchasesRefreshing` kabi juftliklar
 * paydo bo'lib, noto'g'ri o'zgaruvchini ishlatish oson edi.
 */
export function usePurchasesData() {
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [stats, setStats] = useState<PurchaseStats | null>(null);

  const load = useCallback(async (isInitial = false) => {
    if (!isInitial) {
      setRefreshing(true);
    }
    try {
      const data = await purchasesApi.getAll({ page, size: pageSize });
      setPurchases(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
      setLoadError(null);
    } catch (error) {
      console.error('Failed to load purchases:', error);
      setLoadError(getApiErrorMessage(error));
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize]);

  const loadStats = useCallback(async () => {
    try {
      setStats(await purchasesApi.getStats());
    } catch (error) {
      console.error('Failed to load purchase stats:', error);
    }
  }, []);

  const changePageSize = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  }, []);

  return {
    purchases,
    loadError,
    initialLoading,
    refreshing,
    page,
    pageSize,
    totalPages,
    totalElements,
    stats,
    setPage,
    changePageSize,
    load,
    loadStats,
  };
}
