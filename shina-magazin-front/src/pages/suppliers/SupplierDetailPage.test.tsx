import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import type { Supplier } from '../../types';

vi.mock('../../api/suppliers.api', () => ({
  suppliersApi: { getById: vi.fn() },
}));

import { suppliersApi } from '../../api/suppliers.api';
import { SupplierDetailPage } from './SupplierDetailPage';
import { configureQueryDefaults } from '../../lib/queryConfig';

/**
 * Ta'minotchi tafsiloti — xarakteristik testlar.
 *
 * <p>Uchala tafsilot sahifasi bir xil tuzilgan, shuning uchun ular
 * bir xil TUZOQNI ham baham ko'radi: `enabled: false` bo'lganda so'rov
 * `isPending` holatida ABADIY qoladi. Skelet shu bayroqqa bog'langani
 * uchun ID bo'lmasa sahifa cheksiz yuklanayotgandek ko'rinadi.
 */

const ENTITY: Supplier = {
  id: 7,
  name: 'Alfa Shina',
  contactPerson: 'Anvar',
  phone: '+998901234567',
  balance: 0,
  hasDebt: false,
  active: true,
} as unknown as Supplier;

function renderPage(path = '/admin/suppliers/7') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  configureQueryDefaults(qc);
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/suppliers/:id" element={children} />
          <Route path="/admin/suppliers" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  render(<SupplierDetailPage />, { wrapper: Wrapper });
  return qc;
}

describe('SupplierDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(suppliersApi.getById).mockResolvedValue(ENTITY);
  });

  it('yo\'l parametridagi ID bo\'yicha yuklaydi', async () => {
    renderPage();

    await waitFor(() => expect(suppliersApi.getById).toHaveBeenCalledWith(7));
    expect(await screen.findByText('Alfa Shina')).toBeInTheDocument();
  });

  it('topilmasa xabar ko\'rsatiladi', async () => {
    vi.mocked(suppliersApi.getById).mockRejectedValue(new Error('404'));
    renderPage();

    expect(await screen.findByText(/Ta'minotchi topilmadi/i)).toBeInTheDocument();
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
    renderPage('/admin/suppliers');

    expect(await screen.findByText(/Ta'minotchi topilmadi/i)).toBeInTheDocument();
    expect(suppliersApi.getById).not.toHaveBeenCalled();
  });
});
