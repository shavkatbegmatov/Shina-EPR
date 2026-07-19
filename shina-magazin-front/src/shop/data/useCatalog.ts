import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { CatalogFacets, Product } from '../../types';
import { DEMO_PRODUCTS, DEMO_BRANDS } from './demoProducts';
import { catalogApi, type CatalogFilterParams } from './catalogApi';

/**
 * Katalog ma'lumotlari uchun YAGONA seam (ulanish nuqtasi).
 *
 * Backend `GET /v1/catalog` bo'lsa undan o'qiydi; backend yo'q yoki xato bo'lsa
 * demo massivga TUSHADI — storefront offline/backendsiz ham to'liq ko'rinadi.
 * Iste'molchi sahifalar (Home/Catalog/PDP) faqat shu hooklarni ishlatadi.
 */
function useCatalogQuery() {
  return useQuery({
    queryKey: ['catalog'],
    queryFn: async (): Promise<Product[]> => {
      try {
        const products = await catalogApi.list();
        return products.length ? products : DEMO_PRODUCTS;
      } catch {
        return DEMO_PRODUCTS; // backend yo'q/xato → demo (vitrina baribir ishlaydi)
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useCatalogProducts(): { products: Product[]; isLoading: boolean } {
  const { data, isLoading } = useCatalogQuery();
  return { products: data ?? DEMO_PRODUCTS, isLoading };
}

export function useProduct(id?: string | number): { product: Product | undefined; isLoading: boolean } {
  const { data, isLoading } = useCatalogQuery();
  const list = data ?? DEMO_PRODUCTS;
  const product = useMemo(() => list.find((p) => String(p.id) === String(id)), [list, id]);
  return { product, isLoading };
}

/** O'xshash mahsulotlar: avval bir brend, keyin bir kategoriya (boshqa brend) bilan to'ldiriladi. */
export function useRelatedProducts(product: Product | undefined, limit = 4): Product[] {
  const { data } = useCatalogQuery();
  const list = data ?? DEMO_PRODUCTS;
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
  const { data } = useCatalogQuery();
  const list = data ?? DEMO_PRODUCTS;
  return useMemo(() => {
    if (!list.length) return DEMO_BRANDS;
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
 * Backend xatosida `serverMode=false` — sahifa demo ro'yxat ustidan client-side
 * filtrlashga tushadi (mavjud xatti-harakat saqlanadi).
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
