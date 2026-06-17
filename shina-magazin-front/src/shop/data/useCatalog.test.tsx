import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { Product } from '../../types';

// Katalog seam'i catalogApi ustida ishlaydi — uni mock qilamiz
vi.mock('./catalogApi', () => ({
  catalogApi: { list: vi.fn(), getById: vi.fn() },
}));

import { catalogApi } from './catalogApi';
import { useCatalogProducts, useProduct, useCatalogBrands } from './useCatalog';
import { DEMO_PRODUCTS } from './demoProducts';

const SERVER: Product[] = [
  {
    id: 501, sku: 'S-1', name: 'Server Shina', brandName: 'Zeta',
    sellingPrice: 1, quantity: 1, minStockLevel: 0, lowStock: false, active: true,
  },
];

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useCatalog seam (fallback)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('backend mahsulot qaytarsa o\'shani beradi', async () => {
    vi.mocked(catalogApi.list).mockResolvedValue(SERVER);
    const { result } = renderHook(() => useCatalogProducts(), { wrapper });
    await waitFor(() => expect(result.current.products).toEqual(SERVER));
  });

  it('backend bo\'sh massiv qaytarsa demo\'ga tushadi', async () => {
    vi.mocked(catalogApi.list).mockResolvedValue([]);
    const { result } = renderHook(() => useCatalogProducts(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.products).toEqual(DEMO_PRODUCTS);
  });

  it('backend xato bersa demo\'ga tushadi (offline ham ishlaydi)', async () => {
    vi.mocked(catalogApi.list).mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useCatalogProducts(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.products).toEqual(DEMO_PRODUCTS);
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
});
