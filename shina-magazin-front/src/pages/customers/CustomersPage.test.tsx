import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import type { Customer, PagedResponse } from '../../types';

vi.mock('../../api/customers.api', () => ({
  customersApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    setPortalPin: vi.fn(),
    disablePortal: vi.fn(),
    export: { excel: vi.fn(), pdf: vi.fn() },
  },
}));

import { customersApi } from '../../api/customers.api';
import { CustomersPage } from './CustomersPage';
import { useAuthStore } from '../../store/authStore';
import { PermissionCode } from '../../hooks/usePermission';

/**
 * Mijozlar sahifasi — xarakteristik testlar.
 *
 * <p>React Query'ga ko'chirishdan OLDIN yozildi va ko'chirishdan keyin
 * o'zgartirilmasdan o'tishi kerak.
 */

const CUSTOMER: Customer = {
  id: 1,
  fullName: 'Anvar Qodirov',
  phone: '+998901234567',
  balance: 0,
  customerType: 'INDIVIDUAL',
  active: true,
} as Customer;

function pageOf(content: Customer[]): PagedResponse<Customer> {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: 1,
    first: true,
    last: true,
  } as PagedResponse<Customer>;
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return render(<CustomersPage />, { wrapper: Wrapper });
}

describe('CustomersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      permissions: new Set([
        PermissionCode.CUSTOMERS_VIEW,
        PermissionCode.CUSTOMERS_CREATE,
        PermissionCode.CUSTOMERS_UPDATE,
        PermissionCode.CUSTOMERS_DELETE,
      ]),
    });
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(customersApi.getAll).mockResolvedValue(pageOf([CUSTOMER]));
  });

  it('mijozlar ro\'yxatini ko\'rsatadi', async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByText('Anvar Qodirov').length).toBeGreaterThan(0));
  });

  // Ilgari ikkita `useEffect` ham mount'da ishlab, so'rov IKKI marta ketardi.
  // React Query bilan bitta kalit = bitta so'rov.
  it('boshlanishda so\'rov faqat BIR marta yuboriladi', async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByText('Anvar Qodirov').length).toBeGreaterThan(0));
    expect(customersApi.getAll).toHaveBeenCalledTimes(1);
  });

  // Qidiruv SERVERGA ketishi kerak — brauzerda filtrlash faqat yuklangan
  // sahifa ichida ishlab, natija jimgina to'liq bo'lmasdi.
  it('qidiruv serverga parametr sifatida uzatiladi', async () => {
    renderPage();
    await waitFor(() => expect(customersApi.getAll).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText(/qidirish|ism|telefon/i), {
      target: { value: 'anvar' },
    });

    await waitFor(() =>
      expect(customersApi.getAll).toHaveBeenCalledWith(expect.objectContaining({ search: 'anvar' }))
    );
  });

  it('tahrirlashda forma mijoz ma\'lumoti bilan to\'ladi', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText('Anvar Qodirov').length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByRole('button', { name: 'Tahrirlash' })[0]);

    expect(await screen.findByDisplayValue('Anvar Qodirov')).toBeInTheDocument();
  });

  it('saqlagandan keyin ro\'yxat qayta yuklanadi', async () => {
    vi.mocked(customersApi.update).mockResolvedValue(CUSTOMER);
    renderPage();
    await waitFor(() => expect(screen.getAllByText('Anvar Qodirov').length).toBeGreaterThan(0));
    // Boshlang'ich chaqiruvlar soni ATAYLAB qattiq yozilmagan: hozirgi kodda
    // ikkita effekt ham mount'da ishlab, so'rov IKKI marta ketadi.
    const before = vi.mocked(customersApi.getAll).mock.calls.length;

    fireEvent.click(screen.getAllByRole('button', { name: 'Tahrirlash' })[0]);
    await screen.findByDisplayValue('Anvar Qodirov');
    fireEvent.click(screen.getByRole('button', { name: /Yangilash|Saqlash/i }));

    await waitFor(() => expect(customersApi.update).toHaveBeenCalled());
    await waitFor(() =>
      expect(vi.mocked(customersApi.getAll).mock.calls.length).toBeGreaterThan(before)
    );
  });

  it('yuklash xatosi qayta urinish tugmasi bilan ko\'rsatiladi', async () => {
    vi.mocked(customersApi.getAll).mockRejectedValue(new Error('tarmoq yo\'q'));
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Qayta urinish/i })).toBeInTheDocument()
    );
  });
});
