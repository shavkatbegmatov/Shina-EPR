import { useCallback, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { suppliersApi } from '../../api/suppliers.api';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { getApiErrorMessage } from '../../utils/apiError';
import { queryKeys } from '../../lib/queryKeys';
import type { Supplier } from '../../types';

/**
 * Ta'minotchilar ro'yxati, sahifalash va statistika.
 *
 * <p>Ilgari bu yerda uchta qo'lda yozilgan yuklovchi va ularni chaqiradigan
 * `useEffect` lar bor edi. React Query bilan ular yo'qoldi: so'rov kaliti
 * (sahifa, o'lcham, qidiruv) o'zgarishi bilan ma'lumot o'z-o'zidan qayta
 * olinadi va sahifa yuklashni boshqarmaydi.
 *
 * <p>Qaytariladigan shakl ATAYLAB o'zgarmadi (`initialLoading`, `refreshing`,
 * `loadError`) — bo'lim komponentlari va ularning testlari tegilmasdan
 * qoldi, ya'ni ko'chirish xatti-harakatni saqlagani tekshirilishi mumkin.
 */
export function useSuppliersData() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Har bosilgan harfda sahifalangan so'rov yubormaslik uchun kechiktiriladi
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const listQuery = useQuery({
    queryKey: queryKeys.suppliers.list({ page, size: pageSize, search: debouncedSearch || undefined }),
    queryFn: () =>
      suppliersApi.getAll({ page, size: pageSize, search: debouncedSearch || undefined }),
    // Sahifa almashganda eski ro'yxat ekranda qoladi va ustiga "yangilanmoqda"
    // qatlami tushadi — jadval bo'sh holatga sakramaydi.
    placeholderData: keepPreviousData,
  });

  // Dropdown uchun — sahifalangan ro'yxatdan ALOHIDA: xarid oynasida
  // 2-sahifadagi ta'minotchi ham tanlanishi kerak.
  const activeQuery = useQuery({
    queryKey: queryKeys.suppliers.active(),
    queryFn: () => suppliersApi.getActive(),
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.suppliers.stats(),
    queryFn: async () => {
      const [totalDebt, withDebt] = await Promise.all([
        suppliersApi.getTotalDebt(),
        suppliersApi.getWithDebt(),
      ]);
      return { totalDebt, withDebt };
    },
  });

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
    suppliers: listQuery.data?.content ?? ([] as Supplier[]),
    allSuppliers: activeQuery.data ?? ([] as Supplier[]),
    loadError: listQuery.isError ? getApiErrorMessage(listQuery.error) : null,
    initialLoading: listQuery.isPending,
    // `isPending` birinchi yuklash, `isFetching` esa har qanday yuklash —
    // ikkinchisidan birinchisini ayirsak "fonda yangilanmoqda" holati chiqadi.
    // Kechiktirish davomida ham shu holat ko'rsatiladi: jadval hali ESKI
    // matnga tegishli, aks holda ro'yxat "tayyor" ko'rinardi.
    refreshing:
      search.trim() !== debouncedSearch || (listQuery.isFetching && !listQuery.isPending),
    search,
    page,
    pageSize,
    totalPages: listQuery.data?.totalPages ?? 0,
    totalElements: listQuery.data?.totalElements ?? 0,
    totalDebt: statsQuery.data?.totalDebt ?? 0,
    suppliersWithDebt: statsQuery.data?.withDebt ?? ([] as Supplier[]),
    setPage,
    changeSearch,
    changePageSize,
    refetch: listQuery.refetch,
  };
}
