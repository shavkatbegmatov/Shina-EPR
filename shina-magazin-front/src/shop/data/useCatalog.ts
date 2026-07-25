import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { CatalogFacets, Product } from '../../types';
import { DEMO_PRODUCTS, DEMO_BRANDS } from './demoProducts';
import { catalogApi, type CatalogFilterParams } from './catalogApi';

/**
 * Katalog ma'lumotlari uchun YAGONA seam (ulanish nuqtasi).
 *
 * Backend `GET /v1/catalog` dan o'qiydi. Iste'molchi sahifalar (Home/Catalog/PDP)
 * faqat shu hooklarni ishlatadi.
 *
 * ⚠️ Demo massiv faqat DEV'da fallback bo'ladi. Ilgari u productionda ham
 * ishlardi va bu jiddiy muammo edi: bitta tarmoq uzilishi ommaviy do'konni
 * XAYOLIY katalogga o'tkazardi — `DEMO_PRODUCTS` haqiqiy brend nomlari va
 * narxlar bilan to'lgan ("Michelin Primacy 4", 1 200 000 so'm), banner ham,
 * ogohlantirish ham yo'q edi. Mijoz mavjud bo'lmagan mahsulotga buyurtma bera
 * olardi (savat/checkout tegishli tekshiruvni katalogdan emas, serverdan oladi,
 * ya'ni buyurtma keyin xato beradi yoki noto'g'ri mahsulotga tushadi).
 *
 * Productionda xato — bu XATO: hooklar `isError` qaytaradi, sahifalar esa
 * foydalanuvchiga rostini aytadi.
 */

/**
 * Demo fallback faqat lokal ishlab chiqishda (vite `import.meta.env.DEV`).
 *
 * Modul yuklanishida emas, HAR CHAQIRUVDA o'qiladi — shunda testlar
 * `vi.stubEnv('DEV', false)` bilan production xatti-harakatini tekshira oladi
 * (vitest'da DEV sukut bo'yicha `true`).
 */
const isDemoFallbackEnabled = (): boolean => import.meta.env.DEV;

function useCatalogQuery() {
  return useQuery({
    queryKey: ['catalog'],
    // Xato YUTILMAYDI — React Query uni isError orqali yuqoriga uzatsin
    queryFn: (): Promise<Product[]> => catalogApi.list(),
    staleTime: 5 * 60 * 1000,
    // Ilgari `false` edi: bitta o'tkinchi uzilish darhol demo rejimga tushirardi.
    // Endi fallback yo'q, shuning uchun qisqa qayta urinish arziydi.
    // Kechikish ataylab React Query defaultidan (1s, 2s) qisqaroq: mobil aloqada
    // o'tkinchi uzilish yopiladi, lekin haqiqiy uzilishda mijoz ~1s dan ko'p
    // skelet ko'rib o'tirmaydi.
    retry: 2,
    retryDelay: (attempt) => Math.min(300 * 2 ** attempt, 2000),
  });
}

/**
 * So'rov natijasini ro'yxatga aylantiradi.
 * DEV'da so'rov MUVAFFAQIYATSIZ bo'lsa demo ro'yxat beriladi (backendsiz ishlash
 * qulayligi). Backend bo'sh massiv qaytarsa — bu haqiqiy ma'lumot, demo BERILMAYDI.
 */
function resolveList(data: Product[] | undefined, isError: boolean): Product[] {
  if (data) return data;
  return isError && isDemoFallbackEnabled() ? DEMO_PRODUCTS : [];
}

export function useCatalogProducts(): {
  products: Product[];
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
} {
  const { data, isLoading, isError, refetch } = useCatalogQuery();
  return {
    products: resolveList(data, isError),
    isLoading,
    isError: isError && !isDemoFallbackEnabled(),
    retry: () => void refetch(),
  };
}

export function useProduct(id?: string | number): {
  product: Product | undefined;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
} {
  const { data, isLoading, isError, refetch } = useCatalogQuery();
  const list = resolveList(data, isError);
  const product = useMemo(() => list.find((p) => String(p.id) === String(id)), [list, id]);
  return {
    product,
    isLoading,
    isError: isError && !isDemoFallbackEnabled(),
    retry: () => void refetch(),
  };
}

/** O'xshash mahsulotlar: avval bir brend, keyin bir kategoriya (boshqa brend) bilan to'ldiriladi. */
export function useRelatedProducts(product: Product | undefined, limit = 4): Product[] {
  const { data, isError } = useCatalogQuery();
  const list = resolveList(data, isError);
  return useMemo(() => {
    if (!product) return [];
    const sameBrand = list.filter((p) => p.id !== product.id && p.brandName === product.brandName);
    const sameCat = list.filter(
      (p) => p.id !== product.id && p.categoryName === product.categoryName && p.brandName !== product.brandName
    );
    return [...sameBrand, ...sameCat].slice(0, limit);
  }, [list, product, limit]);
}

export function useCatalogBrands(): string[] {
  const { data, isError } = useCatalogQuery();
  const list = resolveList(data, isError);
  return useMemo(() => {
    // Bo'sh ro'yxatda soxta brendlar ko'rsatilmaydi — filtr paneli bo'sh qoladi.
    if (!list.length) return isDemoFallbackEnabled() ? DEMO_BRANDS : [];
    return [...new Set(list.map((p) => p.brandName).filter((b): b is string => Boolean(b)))].sort();
  }, [list]);
}

/**
 * Filtr paneli facetlari (kategoriya daraxti, narx diapazoni, atribut filtrlari).
 * Backend yo'q bo'lsa `data` undefined qoladi — panel server bo'limlarini yashiradi
 * (vitrina demo rejimda ham ishlashda davom etadi).
 */
export function useCatalogFacets(categoryId?: number): { facets: CatalogFacets | undefined; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['catalog-facets', categoryId ?? null],
    queryFn: () => catalogApi.facets(categoryId),
    staleTime: 5 * 60 * 1000,
    retry: false,
    placeholderData: keepPreviousData,
  });
  return { facets: data, isLoading };
}

/**
 * Server tomonda filtrlangan katalog (kategoriya subtree + narx + atributlar).
 * Backend xatosida `serverMode=false` — sahifa `useCatalogProducts()` ro'yxati
 * ustidan client-side filtrlashga tushadi. Agar u ham yuklanmagan bo'lsa
 * (productionda demo fallback yo'q), sahifa xato holatini ko'rsatadi.
 */
export function useFilteredCatalog(params: CatalogFilterParams): {
  products: Product[] | undefined;
  isLoading: boolean;
  serverMode: boolean;
} {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['catalog-filtered', params],
    queryFn: () => catalogApi.listFiltered(params),
    staleTime: 60 * 1000,
    retry: false,
    placeholderData: keepPreviousData,
  });
  return { products: data, isLoading, serverMode: !isError };
}
