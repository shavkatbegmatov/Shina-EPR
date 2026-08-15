import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '../../i18n';
import i18n from '../../i18n';
import type { Product } from '../../types';

vi.mock('../data/catalogApi', () => ({
  catalogApi: {
    list: vi.fn(),
    getById: vi.fn(),
  },
}));

import { catalogApi } from '../data/catalogApi';
import { ProductDetailPage } from './ProductDetailPage';

/**
 * Katalog ro'yxati faqat birinchi 200 mahsulotni oladi. Undan tashqaridagi
 * mahsulot sahifasi ilgari "topilmadi" deb yolg'on gapirardi — real mahsulot
 * filtrlangan katalogdan yoki to'g'ridan-to'g'ri havoladan ochilgan bo'lsa ham.
 * Endi ro'yxatda topilmagan id bitta-mahsulot endpoint'idan yuklanadi.
 */

const OUTSIDE_LIST: Product = {
  id: 999,
  sku: 'TY-999',
  name: 'Toyo Open Country 999',
  sellingPrice: 1_450_000,
  quantity: 3,
  minStockLevel: 1,
  lowStock: false,
  active: true,
};

function renderPage(id: number) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/mahsulot/${id}`]}>
        <Routes>
          <Route path="/mahsulot/:id" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ProductDetailPage fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("ro'yxatdan tashqaridagi mahsulot getById orqali ochiladi", async () => {
    vi.mocked(catalogApi.list).mockResolvedValue([]);
    vi.mocked(catalogApi.getById).mockResolvedValue(OUTSIDE_LIST);

    renderPage(999);

    await waitFor(() =>
      expect(screen.getAllByText('Toyo Open Country 999').length).toBeGreaterThan(0)
    );
    expect(screen.queryByText(i18n.t('shop.product.notFound'))).not.toBeInTheDocument();
  });

  it("haqiqatan mavjud bo'lmagan mahsulotga 'topilmadi' chiqadi", async () => {
    vi.mocked(catalogApi.list).mockResolvedValue([]);
    vi.mocked(catalogApi.getById).mockRejectedValue({ response: { status: 404 } });

    renderPage(12345);

    await waitFor(() =>
      expect(screen.getByText(i18n.t('shop.product.notFound'))).toBeInTheDocument()
    );
  });
});
