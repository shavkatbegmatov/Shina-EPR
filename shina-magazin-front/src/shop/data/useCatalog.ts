import { useMemo } from 'react';
import type { Product } from '../../types';
import { DEMO_PRODUCTS, DEMO_BRANDS } from './demoProducts';

/**
 * Katalog ma'lumotlari uchun YAGONA seam (ulanish nuqtasi).
 *
 * Hozir demo massivdan o'qiydi. Commerce backend (`GET /v1/catalog`) tayyor
 * bo'lganda FAQAT shu fayl React Query'ga o'tadi (useQuery + catalogApi);
 * iste'molchi sahifalar (Home/Catalog/PDP) o'zgarmaydi — ular shu hooklarni
 * ishlatadi, `DEMO_PRODUCTS`'ni to'g'ridan-to'g'ri import qilmaydi.
 */
export function useCatalogProducts(): { products: Product[]; isLoading: boolean } {
  return { products: DEMO_PRODUCTS, isLoading: false };
}

export function useProduct(id?: string | number): { product: Product | undefined; isLoading: boolean } {
  const product = useMemo(
    () => DEMO_PRODUCTS.find((p) => String(p.id) === String(id)),
    [id]
  );
  return { product, isLoading: false };
}

/** O'xshash mahsulotlar: avval bir brend, keyin bir kategoriya (boshqa brend) bilan to'ldiriladi. */
export function useRelatedProducts(product: Product | undefined, limit = 4): Product[] {
  return useMemo(() => {
    if (!product) return [];
    const sameBrand = DEMO_PRODUCTS.filter((p) => p.id !== product.id && p.brandName === product.brandName);
    const sameCat = DEMO_PRODUCTS.filter(
      (p) => p.id !== product.id && p.categoryName === product.categoryName && p.brandName !== product.brandName
    );
    return [...sameBrand, ...sameCat].slice(0, limit);
  }, [product, limit]);
}

export function useCatalogBrands(): string[] {
  return DEMO_BRANDS;
}
