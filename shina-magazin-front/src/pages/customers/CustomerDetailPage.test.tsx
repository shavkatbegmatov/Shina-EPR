import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import type { Customer } from '../../types';

vi.mock('../../api/customers.api', () => ({
  customersApi: { getById: vi.fn() },
}));
vi.mock('../../api/shopOrders.api', () => ({
  shopOrdersApi: { getAll: vi.fn() },
}));

import { customersApi } from '../../api/customers.api';
import { shopOrdersApi } from '../../api/shopOrders.api';
import { CustomerDetailPage } from './CustomerDetailPage';
import { useAuthStore } from '../../store/authStore';
import { PermissionCode } from '../../hooks/usePermission';
import { configureQueryDefaults } from '../../lib/queryConfig';

const CUSTOMER: Customer = {
  id: 7,
  fullName: 'Anvar Qodirov',
  phone: '+998901234567',
  balance: 0,
  customerType: 'INDIVIDUAL',
  active: true,
} as Customer;

function renderPage(path = '/admin/customers/7') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  configureQueryDefaults(qc);

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/customers/:id" element={children} />
          <Route path="/admin/customers" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return render(<CustomerDetailPage />, { wrapper: Wrapper });
}

describe('CustomerDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      permissions: new Set([PermissionCode.CUSTOMERS_VIEW, PermissionCode.SALES_VIEW]),
    });

    vi.mocked(customersApi.getById).mockResolvedValue(CUSTOMER);
    vi.mocked(shopOrdersApi.getAll).mockResolvedValue({
      content: [],
      page: 0,
      size: 5,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
    } as never);
  });

  it('mijoz ma\'lumotini yuklaydi', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getAllByText('Anvar Qodirov').length).toBeGreaterThan(0)
    );
    expect(customersApi.getById).toHaveBeenCalledWith(7);
  });

  it('bir marta so\'raydi', async () => {
    renderPage();
    await waitFor(() => expect(customersApi.getById).toHaveBeenCalled());

    // Qo'lda yuklashda `useEffect` bog'liqligi o'zgarib ikki marta ketishi
    // mumkin edi — kalitga bog'langan so'rovda bunday bo'lmaydi.
    expect(vi.mocked(customersApi.getById).mock.calls.length).toBe(1);
  });

  // Do'kon buyurtmalari SAVDO ruxsatini talab qiladi.
  it('savdo ruxsati bo\'lmasa buyurtmalar so\'ralmaydi', async () => {
    useAuthStore.setState({ permissions: new Set([PermissionCode.CUSTOMERS_VIEW]) });
    renderPage();

    await waitFor(() => expect(customersApi.getById).toHaveBeenCalled());
    expect(shopOrdersApi.getAll).not.toHaveBeenCalled();
  });

  // Mijoz topilmasa "topilmadi" ko'rsatilishi kerak — skelet abadiy
  // aylanib qolsa foydalanuvchi sahifa osilgan deb o'ylardi.
  it('mijoz topilmasa xabar ko\'rsatiladi', async () => {
    vi.mocked(customersApi.getById).mockRejectedValue(new Error('404'));
    renderPage();

    expect(await screen.findByText(/Mijoz topilmadi/i)).toBeInTheDocument();
  });

  // ID umuman bo'lmasa so'rov `enabled: false` bo'ladi va `isPending`
  // ABADIY true qoladi. Buni alohida hisobga olmasak skelet aylanib
  // qolardi va hech qachon tugamasdi.
  it('ID bo\'lmasa skelet aylanib qolmaydi', async () => {
    renderPage('/admin/customers');

    expect(await screen.findByText(/Mijoz topilmadi/i)).toBeInTheDocument();
    expect(customersApi.getById).not.toHaveBeenCalled();
  });
});
