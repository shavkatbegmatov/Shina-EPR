import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { CatalogFacets, Product } from '../../types';

// Katalog seam'i catalogApi ustida ishlaydi — uni mock qilamiz
vi.mock('./catalogApi', () => ({
  catalogApi: { list: vi.fn(), facets: vi.fn(), getById: vi.fn() },
}));

import { catalogApi } from './catalogApi';
import { useCatalogProducts, useProduct, useCatalogBrands, useCatalogFacets } from './useCatalog';
import { DEMO_PRODUCTS } from './demoProducts';

const SERVER: Product[] = [
  {
    id: 501, sku: 'S-1', name: 'Server Shina', brandName: 'Zeta',
    sellingPrice: 1, quantity: 1, minStockLevel: 0, lowStock: false, active: true,
  },
];

const ROOT_FACETS: CatalogFacets = {
  categories: [{ id: 1, name: 'Shinalar', active: true }],
  priceMin: 100,
  priceMax: 500,
  attributes: [],
};

const CATEGORY_FACETS: CatalogFacets = {
  categories: ROOT_FACETS.categories,
  priceMin: 200,
  priceMax: 400,
  attributes: [],
};

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useCatalog seam (fallback)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('backend mahsulot qaytarsa o\'shani beradi', async () => {
    vi.mocked(catalogApi.list).mockResolvedValue(SERVER);
    const { result } = renderHook(() => useCatalogProducts(), { wrapper });
    await waitFor(() => expect(result.current.products).toEqual(SERVER));
  });

  it('backend bo\'sh massiv qaytarsa demo BERILMAYDI (bo\'sh katalog — haqiqiy ma\'lumot)', async () => {
    vi.mocked(catalogApi.list).mockResolvedValue([]);
    const { result } = renderHook(() => useCatalogProducts(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.products).toEqual([]);
    expect(result.current.isError).toBe(false);
  });

  it('DEV: backend xato bersa demo\'ga tushadi (backendsiz ishlash qulayligi)', async () => {
    vi.stubEnv('DEV', true);
    vi.mocked(catalogApi.list).mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useCatalogProducts(), { wrapper });
    // Hook qayta urinadi (retry: 2), shuning uchun waitFor default 1s dan uzunroq
    await waitFor(() => expect(result.current.products).toEqual(DEMO_PRODUCTS), { timeout: 5000 });
    expect(result.current.isError).toBe(false);
  });

  // ⚠️ Bu vitrinaning eng muhim tasdig'i: productionda backend yiqilganda mijoz
  // XAYOLIY mahsulot ko'rmasligi kerak. Ilgari bir tarmoq uzilishi butun do'konni
  // haqiqiy brend nomlari va narxlar bilan to'lgan demo katalogga o'tkazardi va
  // mijoz mavjud bo'lmagan mahsulotga buyurtma bera olardi.
  it('PROD: backend xato bersa demo KO\'RSATILMAYDI, xato holati qaytadi', async () => {
    vi.stubEnv('DEV', false);
    vi.mocked(catalogApi.list).mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useCatalogProducts(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
    expect(result.current.products).toEqual([]);
  });

  it('PROD: brendlar ro\'yxatida ham soxta qiymat bo\'lmaydi', async () => {
    vi.stubEnv('DEV', false);
    vi.mocked(catalogApi.list).mockRejectedValue(new Error('network'));
    // Xato holatiga chindan yetganini kutamiz — bo'sh massiv yuklanish paytida
    // ham qaytadi, shuning uchun faqat `[]` ni tekshirish yolg'on ijobiy berardi.
    const { result } = renderHook(
      () => ({ brands: useCatalogBrands(), catalog: useCatalogProducts() }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.catalog.isError).toBe(true), { timeout: 5000 });
    expect(result.current.brands).toEqual([]);
  });

  it('PROD: useProduct xatoda mahsulot ham, demo ham qaytarmaydi', async () => {
    vi.stubEnv('DEV', false);
    vi.mocked(catalogApi.list).mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useProduct(DEMO_PRODUCTS[0].id), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
    expect(result.current.product).toBeUndefined();
  });

  it('useProduct id bo\'yicha topadi', async () => {
    vi.mocked(catalogApi.list).mockResolvedValue(SERVER);
    const { result } = renderHook(() => useProduct(501), { wrapper });
    await waitFor(() => expect(result.current.product?.name).toBe('Server Shina'));
  });

  it('useCatalogBrands unikal va alifbo tartibida', async () => {
    vi.mocked(catalogApi.list).mockResolvedValue([
      { ...SERVER[0], id: 1, brandName: 'Bravo' },
      { ...SERVER[0], id: 2, brandName: 'Alfa' },
      { ...SERVER[0], id: 3, brandName: 'Bravo' },
    ]);
    const { result } = renderHook(() => useCatalogBrands(), { wrapper });
    await waitFor(() => expect(result.current).toEqual(['Alfa', 'Bravo']));
  });

  it('kategoriya almashganda yangi facet kelguncha avvalgisini saqlaydi', async () => {
    let resolveCategory!: (facets: CatalogFacets) => void;
    const categoryRequest = new Promise<CatalogFacets>((resolve) => {
      resolveCategory = resolve;
    });
    vi.mocked(catalogApi.facets)
      .mockResolvedValueOnce(ROOT_FACETS)
      .mockReturnValueOnce(categoryRequest);

    const { result, rerender } = renderHook(
      ({ categoryId }: { categoryId?: number }) => useCatalogFacets(categoryId),
      { wrapper, initialProps: { categoryId: undefined as number | undefined } }
    );
    await waitFor(() => expect(result.current.facets).toEqual(ROOT_FACETS));

    rerender({ categoryId: 1 });
    expect(result.current.facets).toEqual(ROOT_FACETS);
    expect(result.current.isLoading).toBe(false);

    resolveCategory(CATEGORY_FACETS);
    await waitFor(() => expect(result.current.facets).toEqual(CATEGORY_FACETS));
  });
});
