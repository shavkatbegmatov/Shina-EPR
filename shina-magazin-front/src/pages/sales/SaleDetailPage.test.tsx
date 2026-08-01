import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import type { Sale, SaleReturn } from '../../types';

vi.mock('../../api/sales.api', () => ({
  salesApi: {
    getById: vi.fn(),
    getReturns: vi.fn(),
    createReturn: vi.fn(),
  },
}));
vi.mock('../../api/settings.api', () => ({
  settingsApi: { get: vi.fn().mockResolvedValue({}) },
}));

import { salesApi } from '../../api/sales.api';
import { SaleDetailPage } from './SaleDetailPage';
import { useAuthStore } from '../../store/authStore';
import { PermissionCode } from '../../hooks/usePermission';

/**
 * Savdo tafsiloti — xarakteristik testlar.
 *
 * <p>Bu sahifada QAYTARISH rasmiylashtiriladi, ya'ni kassadan pul chiqadi.
 * Ko'chirishda eng qimmat xato — qaytarish so'rovining tarkibi yoki
 * qaytarishdan keyin ma'lumot yangilanmasligi (kassir ikki marta
 * qaytarishga urinardi).
 */

const SALE: Sale = {
  id: 1,
  invoiceNumber: 'INV-1',
  saleDate: '2026-03-15T10:00:00',
  subtotal: 2_000_000,
  discountAmount: 200_000,
  totalAmount: 1_800_000,
  paidAmount: 1_800_000,
  debtAmount: 0,
  paymentMethod: 'CASH',
  paymentStatus: 'PAID',
  status: 'COMPLETED',
  items: [
    {
      id: 10,
      productId: 5,
      productName: 'Michelin Primacy 4',
      productSku: 'MCH-1',
      quantity: 2,
      unitPrice: 1_000_000,
      discount: 0,
      totalPrice: 2_000_000,
    },
  ],
} as unknown as Sale;

function renderPage(path = '/admin/sales/1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/sales/:id" element={children} />
          <Route path="/admin/sales" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return render(<SaleDetailPage />, { wrapper: Wrapper });
}

describe('SaleDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      permissions: new Set([PermissionCode.SALES_VIEW, PermissionCode.SALES_REFUND]),
    });
    vi.mocked(salesApi.getById).mockResolvedValue(SALE);
    vi.mocked(salesApi.getReturns).mockResolvedValue([] as SaleReturn[]);
  });

  it('savdo tafsilotini ko\'rsatadi', async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByText('INV-1').length).toBeGreaterThan(0));
    expect(screen.getAllByText(/Michelin Primacy 4/).length).toBeGreaterThan(0);
  });

  it('savdo va qaytarishlar tarixi birga yuklanadi', async () => {
    renderPage();

    await waitFor(() => expect(salesApi.getById).toHaveBeenCalledWith(1));
    expect(salesApi.getReturns).toHaveBeenCalledWith(1);
  });

  // Chegirma qatorda ko'rinmaydi, faqat savdo yakunida. Kutilayotgan summa
  // ko'rsatilmasa kassir 2 000 000 ni ko'rib, 1 800 000 qaytganini xato
  // deb o'ylardi.
  it('qaytarish oynasida kutilayotgan summa chegirma bilan ko\'rsatiladi', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText('INV-1').length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole('button', { name: /Qaytarish/i }));

    const qtyInput = await screen.findByRole('spinbutton');
    fireEvent.change(qtyInput, { target: { value: '2' } });

    // 2 000 000 × (1 800 000 / 2 000 000) = 1 800 000
    await waitFor(() =>
      expect(screen.getAllByText(/1\s*800\s*000/).length).toBeGreaterThan(0)
    );
  });

  it('qaytarishdan keyin ma\'lumot qayta yuklanadi', async () => {
    vi.mocked(salesApi.createReturn).mockResolvedValue({} as SaleReturn);
    renderPage();
    await waitFor(() => expect(screen.getAllByText('INV-1').length).toBeGreaterThan(0));
    const before = vi.mocked(salesApi.getById).mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: /Qaytarish/i }));
    fireEvent.change(await screen.findByRole('spinbutton'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Qaytarishni rasmiylashtirish' }));

    await waitFor(() =>
      expect(salesApi.createReturn).toHaveBeenCalledWith(1, expect.objectContaining({
        items: [{ saleItemId: 10, quantity: 1 }],
      }))
    );
    await waitFor(() =>
      expect(vi.mocked(salesApi.getById).mock.calls.length).toBeGreaterThan(before)
    );
  });

  /**
   * ID bo'lmasa skelet aylanib QOLMAYDI.
   *
   * <p>So'rovlar `enabled: !!id` bilan to'silgan, ya'ni ID yo'q bo'lsa
   * ular ishga tushmaydi va `isPending` abadiy `true` qoladi. Skeletni
   * faqat shu bayroqqa bog'lash sahifani cheksiz yuklanayotgan holatda
   * qoldirardi.
   */
  it('ID bo\'lmasa skelet aylanib qolmaydi', async () => {
    renderPage('/admin/sales');

    expect(await screen.findByText(/Sotuv topilmadi/i)).toBeInTheDocument();
    expect(salesApi.getById).not.toHaveBeenCalled();
  });
});
