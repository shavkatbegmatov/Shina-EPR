import { useCallback, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { purchasesApi } from '../../api/purchases.api';
import { getApiErrorMessage } from '../../utils/apiError';
import { queryKeys } from '../../lib/queryKeys';
import type { PurchaseOrder } from '../../types';

/**
 * Xaridlar ro'yxati va statistikasi.
 *
 * <p>{@code enabled} — bo'lim ochilmaguncha so'rov YUBORILMAYDI. Ilgari buni
 * `useEffect` ichidagi `if (activeTab === 'purchases')` sharti qilardi; endi
 * shart so'rovning o'zida va uni chetlab o'tib bo'lmaydi.
 */
export function usePurchasesData(enabled: boolean) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const listQuery = useQuery({
    queryKey: queryKeys.purchases.list({ page, size: pageSize }),
    queryFn: () => purchasesApi.getAll({ page, size: pageSize }),
    placeholderData: keepPreviousData,
    enabled,
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.purchases.stats(),
    queryFn: () => purchasesApi.getStats(),
    enabled,
  });

  const changePageSize = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  }, []);

  return {
    purchases: listQuery.data?.content ?? ([] as PurchaseOrder[]),
    loadError: listQuery.isError ? getApiErrorMessage(listQuery.error) : null,
    // Bo'lim ochilmagan bo'lsa so'rov `pending` holatida turadi — uni
    // "yuklanmoqda" deb ko'rsatish jadvalni abadiy skeletonda qoldirardi.
    initialLoading: enabled && listQuery.isPending,
    refreshing: listQuery.isFetching && !listQuery.isPending,
    page,
    pageSize,
    totalPages: listQuery.data?.totalPages ?? 0,
    totalElements: listQuery.data?.totalElements ?? 0,
    stats: statsQuery.data ?? null,
    setPage,
    changePageSize,
    refetch: listQuery.refetch,
  };
}
