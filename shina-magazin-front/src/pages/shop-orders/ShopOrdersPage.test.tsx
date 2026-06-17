import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import type { PagedResponse } from '../../types';
import type { ShopOrderDto } from '../../api/shopOrders.api';

// Xodim API'ni mock qilamiz (network'siz) — react-query ustida
vi.mock('../../api/shopOrders.api', () => ({
  shopOrdersApi: { getAll: vi.fn(), updateStatus: vi.fn() },
}));

import { shopOrdersApi } from '../../api/shopOrders.api';
import { ShopOrdersPage } from './ShopOrdersPage';

const ORDER: ShopOrderDto = {
  orderNo: 'PR-TEST1',
  status: 'NEW',
  customerName: 'Ali Valiyev',
  customerPhone: '901234567',
  deliveryMethod: 'DELIVERY',
  paymentMethod: 'CASH',
  paymentStatus: 'PENDING',
  subtotal: 100_000,
  deliveryFee: 0,
  totalAmount: 100_000,
  createdAt: '2026-01-15T10:00:00Z',
  items: [{ productId: 1, productName: 'Shina A', quantity: 2, unitPrice: 50_000, totalPrice: 100_000 }],
};

const page = (content: ShopOrderDto[]): PagedResponse<ShopOrderDto> => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: 1,
  first: true,
  last: true,
});

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return render(<ShopOrdersPage />, { wrapper: Wrapper });
}

describe('ShopOrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Select dropdown jsdom'da scrollIntoView chaqiradi — uni stub qilamiz
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('getAll dan kelgan buyurtmani ko\'rsatadi', async () => {
    vi.mocked(shopOrdersApi.getAll).mockResolvedValue(page([ORDER]));
    renderPage();
    await waitFor(() => expect(screen.getAllByText('PR-TEST1').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Ali Valiyev').length).toBeGreaterThan(0);
  });

  it('buyurtma yo\'q bo\'lsa bo\'sh holat ko\'rsatadi', async () => {
    vi.mocked(shopOrdersApi.getAll).mockResolvedValue(page([]));
    renderPage();
    await waitFor(() => expect(screen.getByText('Buyurtmalar yo\'q')).toBeInTheDocument());
  });

  it('status filtri tanlanganda getAll o\'sha status bilan qayta chaqiriladi', async () => {
    vi.mocked(shopOrdersApi.getAll).mockResolvedValue(page([]));
    renderPage();
    await waitFor(() => expect(shopOrdersApi.getAll).toHaveBeenCalled());
    // Bo'sh ro'yxat — faqat filtr tugmalari bor (qator Select/Badge yo'q)
    fireEvent.click(screen.getByRole('button', { name: 'Yangi' }));
    await waitFor(() =>
      expect(shopOrdersApi.getAll).toHaveBeenCalledWith(expect.objectContaining({ status: 'NEW' }))
    );
  });

  it('qator Select orqali status o\'zgartirilganda updateStatus chaqiriladi', async () => {
    vi.mocked(shopOrdersApi.getAll).mockResolvedValue(page([ORDER]));
    vi.mocked(shopOrdersApi.updateStatus).mockResolvedValue({ ...ORDER, status: 'CONFIRMED' });
    renderPage();
    await waitFor(() => expect(screen.getAllByText('PR-TEST1').length).toBeGreaterThan(0));
    // Birinchi qatordagi status Select'ni ochib, "Tasdiqlangan" ni tanlaymiz
    fireEvent.click(screen.getAllByRole('combobox')[0]);
    fireEvent.click(await screen.findByRole('option', { name: 'Tasdiqlangan' }));
    await waitFor(() =>
      expect(shopOrdersApi.updateStatus).toHaveBeenCalledWith('PR-TEST1', 'CONFIRMED')
    );
  });
});
