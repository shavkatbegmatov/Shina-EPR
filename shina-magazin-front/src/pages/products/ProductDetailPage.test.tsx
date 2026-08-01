import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import type { Product } from '../../types';

vi.mock('../../api/products.api', () => ({
  productsApi: { getById: vi.fn() },
}));

import { productsApi } from '../../api/products.api';
import { ProductDetailPage } from './ProductDetailPage';
import { configureQueryDefaults } from '../../lib/queryConfig';

/**
 * Mahsulot tafsiloti — xarakteristik testlar.
 *
 * <p>Uchala tafsilot sahifasi bir xil tuzilgan, shuning uchun ular
 * bir xil TUZOQNI ham baham ko'radi: `enabled: false` bo'lganda so'rov
 * `isPending` holatida ABADIY qoladi. Skelet shu bayroqqa bog'langani
 * uchun ID bo'lmasa sahifa cheksiz yuklanayotgandek ko'rinadi.
 */

const ENTITY: Product = {
  id: 7,
  sku: 'MCH-205',
  name: 'Michelin Primacy 4',
  sellingPrice: 1_000_000,
  purchasePrice: 700_000,
  quantity: 8,
  minStockLevel: 2,
  active: true,
} as unknown as Product;

function renderPage(path = '/admin/products/7') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  configureQueryDefaults(qc);
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/products/:id" element={children} />
          <Route path="/admin/products" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  render(<ProductDetailPage />, { wrapper: Wrapper });
  return qc;
}

describe('ProductDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(productsApi.getById).mockResolvedValue(ENTITY);
  });

  it('yo\'l parametridagi ID bo\'yicha yuklaydi', async () => {
    renderPage();

    await waitFor(() => expect(productsApi.getById).toHaveBeenCalledWith(7));
    expect(await screen.findByText('Michelin Primacy 4')).toBeInTheDocument();
  });

  it('topilmasa xabar ko\'rsatiladi', async () => {
    vi.mocked(productsApi.getById).mockRejectedValue(new Error('404'));
    renderPage();

    expect(await screen.findByText(/Mahsulot topilmadi/i)).toBeInTheDocument();
  });

  /**
   * ID bo\'lmasa skelet aylanib QOLMAYDI.
   *
   * <p>So\'rov `enabled: !!id` bilan to\'silgan, ya\'ni ID yo\'q bo\'lsa u
   * hech qachon ishga tushmaydi va `isPending` abadiy `true` qoladi.
   * Skeletni faqat shu bayroqqa bog\'lash sahifani cheksiz yuklanayotgan
   * holatda qoldirardi — foydalanuvchi kutib o\'tirardi, hech narsa
   * kelmasdi.
   */
  it('ID bo\'lmasa skelet aylanib qolmaydi', async () => {
    renderPage('/admin/products');

    expect(await screen.findByText(/Mahsulot topilmadi/i)).toBeInTheDocument();
    expect(productsApi.getById).not.toHaveBeenCalled();
  });
});
