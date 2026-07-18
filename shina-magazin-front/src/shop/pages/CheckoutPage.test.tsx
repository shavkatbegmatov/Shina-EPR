import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '../../i18n';
import type { Product } from '../../types';
import { useCartStore } from '../store/cartStore';
import { useOrderStore } from '../store/orderStore';
import { usePortalAuthStore } from '../../portal/store/portalAuthStore';

vi.mock('../data/ordersApi', () => ({
  ordersApi: {
    create: vi.fn(),
    initiatePayment: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

import toast from 'react-hot-toast';
import { ordersApi } from '../data/ordersApi';
import { CheckoutPage } from './CheckoutPage';

const PRODUCT: Product = {
  id: 1,
  sku: 'TY-001',
  name: 'Toyo Open Country',
  sellingPrice: 1_450_000,
  quantity: 3,
  minStockLevel: 1,
  lowStock: false,
  active: true,
};

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useCartStore.setState({ items: [{ product: PRODUCT, qty: 1 }] });
    useOrderStore.setState({ orders: [] });
    usePortalAuthStore.setState({
      customer: { id: 7, fullName: 'Test Mijoz', phone: '+998901234567', balance: 0, hasDebt: false, preferredLanguage: 'uz' },
      isAuthenticated: true,
    });
  });

  it('server xatosida savatni saqlaydi va lokal buyurtma yaratmaydi', async () => {
    vi.mocked(ordersApi.create).mockRejectedValue({ response: { data: { message: 'Server xatosi' } } });
    const user = userEvent.setup();

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><CheckoutPage /></MemoryRouter>
      </QueryClientProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Davom etish' }));
    await user.type(screen.getByPlaceholderText("Shahar, ko'cha, uy"), 'Toshkent, Chilonzor');
    await user.click(screen.getByRole('button', { name: 'Davom etish' }));
    await user.click(screen.getByRole('button', { name: 'Davom etish' }));
    await user.click(screen.getByRole('button', { name: 'Buyurtmani tasdiqlash' }));

    await waitFor(() => expect(ordersApi.create).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith('Server xatosi');
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useOrderStore.getState().orders).toHaveLength(0);
  });
});
