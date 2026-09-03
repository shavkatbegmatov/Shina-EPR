import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import type { PagedResponse, PortalSale } from '../types/portal.types';

vi.mock('../api/portal.api', () => ({
  portalApiClient: {
    getPurchases: vi.fn(),
  },
}));

import { portalApiClient } from '../api/portal.api';
import i18n from '../../i18n';
import PortalPurchasesPage from './PurchasesPage';

/**
 * Kabinet sahifalari React Query'ga o'tdi: xato endi bo'sh ro'yxat bo'lib
 * ko'rinmaydi ("xaridlaringiz yo'q" bilan chalkashmaydi), "Qayta urinish" bor,
 * "yana yuklash" keyingi sahifani so'raydi.
 */

const page = (content: PortalSale[], pageNo: number, last: boolean): PagedResponse<PortalSale> => ({
  content,
  page: pageNo,
  size: 10,
  totalElements: content.length,
  totalPages: last ? pageNo + 1 : pageNo + 2,
  last,
  first: pageNo === 0,
});

const sale = (id: number, invoice: string): PortalSale =>
  ({
    id,
    invoiceNumber: invoice,
    saleDate: '2026-09-01T10:00:00',
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    totalAmount: 1_000_000,
  }) as unknown as PortalSale;

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/hisob/xaridlar']}>
        <PortalPurchasesPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PortalPurchasesPage', () => {
  beforeEach(() => {
    // clearAllMocks `mockResolvedValueOnce` navbatini tozalamaydi — oldingi
    // testdan qolgan javob keyingisiga o'tib ketmasligi uchun reset.
    vi.resetAllMocks();
  });

  it("xaridlar ro'yxatini ko'rsatadi va keyingi sahifani so'raydi", async () => {
    vi.mocked(portalApiClient.getPurchases)
      .mockResolvedValueOnce(page([sale(1, 'INV-001')], 0, false))
      .mockResolvedValueOnce(page([sale(2, 'INV-002')], 1, true));

    renderPage();

    expect(await screen.findByText('INV-001')).toBeInTheDocument();
    expect(portalApiClient.getPurchases).toHaveBeenCalledWith(0, 10);

    await userEvent.click(screen.getByRole('button', { name: i18n.t('dashboard.viewAll') }));

    expect(await screen.findByText('INV-002')).toBeInTheDocument();
    expect(portalApiClient.getPurchases).toHaveBeenLastCalledWith(1, 10);
  });

  it("yuklash xatosi bo'sh ro'yxat emas, xato paneli va qayta urinish", async () => {
    const failure = new AxiosError('Server error', 'ERR_BAD_RESPONSE', undefined, undefined, {
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
      config: {} as never,
      data: { success: false, message: 'Ichki server xatosi' },
    });
    vi.mocked(portalApiClient.getPurchases)
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(page([sale(3, 'INV-003')], 0, true));

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Ichki server xatosi');
    expect(screen.queryByText(/INV-/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: i18n.t('common.retry') }));

    expect(await screen.findByText('INV-003')).toBeInTheDocument();
  });
});
