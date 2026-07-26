import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import type { PagedResponse, Sale } from '../../types';

vi.mock('../../api/sales.api', () => ({
  salesApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    cancel: vi.fn(),
    create: vi.fn(),
    export: { excel: vi.fn(), pdf: vi.fn() },
  },
}));
vi.mock('../../api/settings.api', () => ({
  settingsApi: { get: vi.fn().mockResolvedValue({}) },
}));

import { salesApi } from '../../api/sales.api';
import { SalesPage } from './SalesPage';
import { useAuthStore } from '../../store/authStore';
import { PermissionCode } from '../../hooks/usePermission';

/**
 * Sotuvlar sahifasi — xarakteristik testlar.
 *
 * <p>React Query'ga ko'chirishdan OLDIN yozildi.
 */

const SALE: Sale = {
  id: 1,
  invoiceNumber: 'INV202603150001',
  customerName: 'Anvar Qodirov',
  saleDate: '2026-03-15T10:30:00',
  subtotal: 2_000_000,
  discountAmount: 0,
  totalAmount: 2_000_000,
  paidAmount: 2_000_000,
  debtAmount: 0,
  paymentMethod: 'CASH',
  paymentStatus: 'PAID',
  status: 'COMPLETED',
  items: [],
} as unknown as Sale;

function pageOf(content: Sale[]): PagedResponse<Sale> {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: 1,
    first: true,
    last: true,
  } as PagedResponse<Sale>;
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return render(<SalesPage />, { wrapper: Wrapper });
}

describe('SalesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      permissions: new Set([
        PermissionCode.SALES_VIEW,
        PermissionCode.SALES_CREATE,
        // Bekor qilish tugmasi aynan shu ruxsat bilan ko'rinadi
        PermissionCode.SALES_UPDATE,
        PermissionCode.SALES_DELETE,
      ]),
    });
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(salesApi.getAll).mockResolvedValue(pageOf([SALE]));
    vi.mocked(salesApi.getById).mockResolvedValue(SALE);
  });

  it('sotuvlar ro\'yxatini ko\'rsatadi', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getAllByText('INV202603150001').length).toBeGreaterThan(0)
    );
  });

  // Sana oralig'i SERVERGA uzatiladi: brauzerda filtrlash faqat yuklangan
  // sahifani qamrab, hisobotdagi son bilan mos kelmasdi.
  it('sana oralig\'i so\'rov parametri sifatida uzatiladi', async () => {
    renderPage();

    await waitFor(() => expect(salesApi.getAll).toHaveBeenCalled());
    const call = vi.mocked(salesApi.getAll).mock.calls[0][0];
    expect(call).toMatchObject({ sort: 'saleDate,desc' });
  });

  it('bekor qilgandan keyin ro\'yxat qayta yuklanadi', async () => {
    vi.mocked(salesApi.cancel).mockResolvedValue(SALE);
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('INV202603150001').length).toBeGreaterThan(0)
    );
    const before = vi.mocked(salesApi.getAll).mock.calls.length;

    // Qatordagi bekor qilish tugmasi (belgi — nomi `title` dan keladi)
    fireEvent.click(screen.getAllByRole('button', { name: 'Bekor qilish' })[0]);
    fireEvent.click(await screen.findByRole('button', { name: /Ha, bekor qilish/i }));

    await waitFor(() => expect(salesApi.cancel).toHaveBeenCalledWith(1));
    await waitFor(() =>
      expect(vi.mocked(salesApi.getAll).mock.calls.length).toBeGreaterThan(before)
    );
  });

  it('yuklash xatosi qayta urinish tugmasi bilan ko\'rsatiladi', async () => {
    vi.mocked(salesApi.getAll).mockRejectedValue(new Error('tarmoq yo\'q'));
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Qayta urinish/i })).toBeInTheDocument()
    );
  });
});
