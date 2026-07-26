import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import type { Customer, PagedResponse, Product, Sale } from '../../types';

vi.mock('../../api/products.api', () => ({
  productsApi: { getAll: vi.fn() },
}));
vi.mock('../../api/sales.api', () => ({
  salesApi: { create: vi.fn() },
}));
vi.mock('../../api/customers.api', () => ({
  customersApi: { getAll: vi.fn() },
}));
vi.mock('../../api/settings.api', () => ({
  settingsApi: { get: vi.fn().mockResolvedValue({}) },
}));

import { productsApi } from '../../api/products.api';
import { salesApi } from '../../api/sales.api';
import { customersApi } from '../../api/customers.api';
import { POSPage } from './POSPage';
import { useCartStore } from '../../store/cartStore';

/**
 * Kassa (POS) — xarakteristik testlar.
 *
 * <p>Bu sahifa PUL bilan ishlaydi: savatga qo'shish, chegirma va serverga
 * ketadigan yakuniy summa. Ko'chirishda eng qimmat xato — savdo so'rovining
 * tarkibi o'zgarib qolishi, chunki u tuzatib bo'lmaydigan yozuv yaratadi.
 * Shuning uchun so'rov tanasi aniq qulflanadi.
 */

const TIRE: Product = {
  id: 1,
  sku: 'MCH-205',
  name: 'Michelin Primacy 4',
  sellingPrice: 1_000_000,
  purchasePrice: 700_000,
  quantity: 10,
  minStockLevel: 2,
  active: true,
} as Product;

const SALE: Sale = {
  id: 99,
  invoiceNumber: 'INV-1',
  saleDate: '2026-03-15T10:00:00',
  subtotal: 1_000_000,
  totalAmount: 1_000_000,
  paidAmount: 1_000_000,
  debtAmount: 0,
  paymentMethod: 'CASH',
  paymentStatus: 'PAID',
  status: 'COMPLETED',
  items: [],
} as unknown as Sale;

function pageOf<T>(content: T[]): PagedResponse<T> {
  return {
    content,
    page: 0,
    size: 100,
    totalElements: content.length,
    totalPages: 1,
    first: true,
    last: true,
  } as PagedResponse<T>;
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return render(<POSPage />, { wrapper: Wrapper });
}

/** Mahsulotni savatga qo'shadi (mahsulot kartochkasi — tugma). */
async function addTireToCart() {
  const card = await screen.findByRole('button', { name: /Michelin Primacy 4/i });
  fireEvent.click(card);
}

describe('POSPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    // Savat global store'da — testlar orasida tozalanmasa oldingi
    // testning pozitsiyalari keyingisiga o'tib ketardi.
    useCartStore.getState().clear();

    vi.mocked(productsApi.getAll).mockResolvedValue(pageOf([TIRE]));
    vi.mocked(customersApi.getAll).mockResolvedValue(pageOf([] as Customer[]));
    vi.mocked(salesApi.create).mockResolvedValue(SALE);
  });

  it('mahsulotlarni ko\'rsatadi', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getAllByText('Michelin Primacy 4').length).toBeGreaterThan(0)
    );
  });

  it('qidiruv serverga parametr sifatida uzatiladi', async () => {
    renderPage();
    await waitFor(() => expect(productsApi.getAll).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText(/Mahsulot qidirish/i), {
      target: { value: 'michelin' },
    });

    await waitFor(() =>
      expect(productsApi.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'michelin' })
      )
    );
  });

  it('mahsulotni bosganda savatga qo\'shiladi', async () => {
    renderPage();
    await addTireToCart();

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().getTotal()).toBe(1_000_000);
  });

  // ENG MUHIM TEST: serverga ketadigan savdo tarkibi. Bu yerdagi xato
  // tuzatib bo'lmaydigan moliyaviy yozuv yaratadi.
  it('savdo so\'rovi to\'g\'ri tarkib bilan yuboriladi', async () => {
    renderPage();
    await addTireToCart();

    fireEvent.click(screen.getByRole('button', { name: /To'lovga o'tish/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Tasdiqlash' }));

    await waitFor(() => expect(salesApi.create).toHaveBeenCalled());
    expect(salesApi.create).toHaveBeenCalledWith({
      customerId: undefined,
      items: [{ productId: 1, quantity: 1, discount: 0 }],
      discountAmount: 0,
      discountPercent: 0,
      paidAmount: 1_000_000,
      paymentMethod: 'CASH',
    });
  });

  // Savat DARHOL tozalanadi (tovar sotildi), lekin oyna ochiq qoladi —
  // kassir chekni chop etishi kerak.
  it('savdodan keyin savat tozalanadi, oyna chek bosqichiga o\'tadi', async () => {
    renderPage();
    await addTireToCart();

    fireEvent.click(screen.getByRole('button', { name: /To'lovga o'tish/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Tasdiqlash' }));

    await waitFor(() => expect(useCartStore.getState().items).toHaveLength(0));
    // Chek bosqichi: chop etish tugmasi paydo bo'ladi
    expect(await screen.findByRole('button', { name: /Chop etish/i })).toBeInTheDocument();
  });

  // Savdo zaxirani o'zgartiradi — ro'yxat yangilanmasa kassir sotilgan
  // tovarni yana sotishga urinardi.
  it('savdodan keyin mahsulotlar ro\'yxati yangilanadi', async () => {
    renderPage();
    await addTireToCart();
    const before = vi.mocked(productsApi.getAll).mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: /To'lovga o'tish/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Tasdiqlash' }));

    await waitFor(() =>
      expect(vi.mocked(productsApi.getAll).mock.calls.length).toBeGreaterThan(before)
    );
  });

  it('bo\'sh savat bilan savdo yuborilmaydi', async () => {
    renderPage();
    await waitFor(() => expect(productsApi.getAll).toHaveBeenCalled());

    // Savat bo'sh — to'lovga o'tish tugmasi o'chirilgan
    expect(screen.getByRole('button', { name: /To'lovga o'tish/i })).toBeDisabled();
    expect(salesApi.create).not.toHaveBeenCalled();
  });

  it('mijoz tanlash oynasi ochilganda mijozlar yuklanadi', async () => {
    renderPage();
    await waitFor(() => expect(productsApi.getAll).toHaveBeenCalled());
    expect(customersApi.getAll).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Ko'rish/i }));

    await waitFor(() => expect(customersApi.getAll).toHaveBeenCalled());
  });
});
