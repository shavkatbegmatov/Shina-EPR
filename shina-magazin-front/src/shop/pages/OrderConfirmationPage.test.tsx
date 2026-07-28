import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '../../i18n';
import type { Product } from '../../types';
import { useOrderStore } from '../store/orderStore';
import { usePortalAuthStore } from '../../portal/store/portalAuthStore';

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

vi.mock('../data/accountApi', () => ({
  accountApi: { myOrders: vi.fn(), orderByNo: vi.fn() },
}));

vi.mock('../data/ordersApi', () => ({
  ordersApi: { create: vi.fn(), initiatePayment: vi.fn(), getStatus: vi.fn() },
}));

import { accountApi, type AccountOrderDetail } from '../data/accountApi';
import { ordersApi } from '../data/ordersApi';
import { OrderConfirmationPage } from './OrderConfirmationPage';

const SERVER_ORDER: AccountOrderDetail = {
  orderNo: 'DWEB-260724-008',
  status: 'COMPLETED',
  paymentStatus: 'PAID',
  customerName: 'Test Mijoz',
  customerPhone: '+998901234567',
  deliveryMethod: 'DELIVERY',
  deliveryAddress: 'Toshkent, Chilonzor',
  paymentMethod: 'CARD',
  subtotal: 7_460_000,
  deliveryFee: 30_000,
  totalAmount: 7_490_000,
  createdAt: '2026-07-24T14:16:00',
  items: [
    { productName: 'Nokian Outpost AT', sizeString: '265/65 R17', quantity: 2, unitPrice: 2_000_000, totalPrice: 4_000_000 },
    { productName: 'Kumho Ecowing ES31', sizeString: '195/65 R15', quantity: 3, unitPrice: 1_153_333, totalPrice: 3_460_000 },
  ],
};

function renderPage(orderNo: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/buyurtma/${orderNo}`]}>
        <Routes>
          <Route path="/buyurtma/:orderNo" element={<OrderConfirmationPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('OrderConfirmationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useOrderStore.setState({ orders: [] });
    vi.mocked(ordersApi.getStatus).mockRejectedValue(new Error('offline'));
  });

  it('lokal nusxasi yo\'q buyurtmani backend tafsilotidan ko\'rsatadi', async () => {
    usePortalAuthStore.setState({ isAuthenticated: true });
    vi.mocked(accountApi.orderByNo).mockResolvedValue(SERVER_ORDER);

    renderPage('DWEB-260724-008');

    // "Buyurtmalarim"dan ochilgan eski buyurtma — tabrik emas, tafsilot sarlavhasi.
    expect(await screen.findByText('Buyurtma tafsilotlari')).toBeInTheDocument();
    expect(screen.getByText('DWEB-260724-008')).toBeInTheDocument();
    expect(screen.getByText('Nokian Outpost AT')).toBeInTheDocument();
    expect(screen.getByText('Yakunlangan')).toBeInTheDocument();
    expect(screen.getByText('Test Mijoz')).toBeInTheDocument();
    expect(screen.getByText('Toshkent, Chilonzor')).toBeInTheDocument();
    expect(screen.getByText('Bank kartasi (Uzcard/Humo)')).toBeInTheDocument();
    expect(accountApi.orderByNo).toHaveBeenCalledWith('DWEB-260724-008');
  });

  it('checkout\'dan keyin lokal buyurtmani tabrik sarlavhasi bilan ko\'rsatadi', async () => {
    usePortalAuthStore.setState({ isAuthenticated: false });
    useOrderStore.setState({
      orders: [{
        orderNo: 'PR-LOKAL1',
        createdAt: Date.now(),
        items: [{ product: PRODUCT, qty: 2 }],
        contact: { name: 'Test Mijoz', phone: '+998901234567' },
        delivery: { method: 'pickup' },
        payment: 'cash',
        subtotal: 2_900_000,
        deliveryFee: 0,
        total: 2_900_000,
      }],
    });

    renderPage('PR-LOKAL1');

    expect(await screen.findByText('Buyurtma qabul qilindi!')).toBeInTheDocument();
    expect(screen.getByText('PR-LOKAL1')).toBeInTheDocument();
    expect(screen.getByText('Toyo Open Country')).toBeInTheDocument();
    expect(screen.getByText('Olib ketish')).toBeInTheDocument();
    expect(accountApi.orderByNo).not.toHaveBeenCalled();
  });

  it('guest uchun backend so\'ralmaydi va buyurtma topilmadi ko\'rsatiladi', async () => {
    usePortalAuthStore.setState({ isAuthenticated: false });

    renderPage('DWEB-260724-008');

    expect(await screen.findByText('Buyurtma topilmadi')).toBeInTheDocument();
    expect(accountApi.orderByNo).not.toHaveBeenCalled();
  });

  it('begona buyurtmada (backend 404) buyurtma topilmadi ko\'rsatiladi', async () => {
    usePortalAuthStore.setState({ isAuthenticated: true });
    vi.mocked(accountApi.orderByNo).mockRejectedValue({ response: { status: 404 } });

    renderPage('PR-BEGONA');

    expect(await screen.findByText('Buyurtma topilmadi')).toBeInTheDocument();
  });
});
