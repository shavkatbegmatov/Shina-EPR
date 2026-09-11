import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import type { PagedResponse, Product, PurchaseOrder, Supplier } from '../../types';

vi.mock('../../api/purchases.api', () => ({
  purchasesApi: { create: vi.fn(), getStats: vi.fn() },
}));
vi.mock('../../api/products.api', () => ({
  productsApi: { getAll: vi.fn() },
}));

import { purchasesApi } from '../../api/purchases.api';
import { productsApi } from '../../api/products.api';
import { PurchaseFormModal } from './PurchaseFormModal';
import { configureQueryDefaults } from '../../lib/queryConfig';
import { queryKeys } from '../../lib/queryKeys';

/**
 * Kirim hujjati oynasi — Xaridlar va Ta'minotchilar sahifalari uchun yagona.
 *
 * <p>Ilgari ikki nusxa edi va ajralib ketgan edi (biri omborni yangilar,
 * ikkinchisi yo'q) — shuning uchun bu yerda "xariddan keyin nima eskirishi"
 * va so'rov tarkibi (valyuta, kurs, bonus) alohida qulflanadi.
 */

const SUPPLIER: Supplier = {
  id: 3,
  name: 'Alfa Shina',
  balance: 0,
  active: true,
} as Supplier;

const PRODUCT: Product = {
  id: 7,
  sku: 'MCH-205',
  name: 'Michelin Primacy 4',
  sellingPrice: 1_000_000,
  purchasePrice: 700_000,
  quantity: 4,
  minStockLevel: 2,
  active: true,
} as Product;

function pageOf<T>(content: T[]): PagedResponse<T> {
  return {
    content,
    page: 0,
    size: 10,
    totalElements: content.length,
    totalPages: 1,
    first: true,
    last: true,
  } as PagedResponse<T>;
}

function renderModal() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  configureQueryDefaults(qc);
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  render(
    <PurchaseFormModal isOpen suppliers={[SUPPLIER]} onClose={() => {}} />,
    { wrapper: Wrapper }
  );
  return qc;
}

/** Oynada ta'minotchi va bitta mahsulot tanlaydi (kombobox + qidiruv). */
async function selectSupplierAndProduct() {
  const supplierBox = await screen.findByRole('combobox', { name: /Ta'minotchi/i });
  fireEvent.click(supplierBox);
  fireEvent.click(await screen.findByRole('option', { name: /Alfa Shina/i }));

  fireEvent.change(screen.getByPlaceholderText(/qidir/i), {
    target: { value: 'michelin' },
  });
  fireEvent.click(await screen.findByRole('option', { name: /Michelin Primacy 4/i }));
}

describe('PurchaseFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(productsApi.getAll).mockResolvedValue(pageOf([PRODUCT]));
    vi.mocked(purchasesApi.create).mockResolvedValue({ id: 10 } as PurchaseOrder);
    vi.mocked(purchasesApi.getStats).mockResolvedValue({
      totalPurchases: 0,
      todayPurchases: 0,
      monthPurchases: 0,
      totalAmount: 0,
      totalDebt: 0,
      pendingReturns: 0,
      awaitingReceipt: 0,
      lastUsdRate: 12_700,
    });
  });

  /**
   * Xarid ZAXIRANI oshiradi va mahsulotning xarid narxini yangilaydi.
   *
   * <p>Ilgari bu oyna faqat xaridlar va ta'minotchilarni bekor qilardi.
   * Xuddi shu amal Xaridlar sahifasidan qilinsa ombor ham yangilanardi —
   * ya'ni natija qaysi ekrandan kelganingizga bog'liq edi.
   */
  it('xariddan keyin ombor va mahsulotlar ham eskiradi', async () => {
    const qc = renderModal();

    const productsKey = queryKeys.products.list({ page: 0, size: 20 });
    const warehouseKey = queryKeys.warehouse.stats();
    qc.setQueryData(productsKey, pageOf([PRODUCT]));
    qc.setQueryData(warehouseKey, { totalProducts: 1 });

    // Ta'minotchi va mahsulot tanlaymiz
    await selectSupplierAndProduct();

    fireEvent.click(screen.getByRole('button', { name: /Saqlash va omborga kirim/i }));

    await waitFor(() => expect(purchasesApi.create).toHaveBeenCalled());
    await waitFor(() =>
      expect(qc.getQueryState(productsKey)?.isInvalidated).toBe(true)
    );
    expect(qc.getQueryState(warehouseKey)?.isInvalidated).toBe(true);
  });

  // Oddiy (so'mdagi) hujjat: eski so'rov tarkibi saqlanadi, yangi maydonlar
  // standart qiymatda — darhol qabul qilinadi, valyuta so'm, bonus yo'q.
  it('so\'mdagi hujjat standart qiymatlar bilan yuboriladi', async () => {
    renderModal();
    await selectSupplierAndProduct();

    fireEvent.click(screen.getByRole('button', { name: /Saqlash va omborga kirim/i }));

    await waitFor(() => expect(purchasesApi.create).toHaveBeenCalled());
    expect(purchasesApi.create).toHaveBeenCalledWith({
      supplierId: 3,
      orderDate: expect.any(String),
      paidAmount: 0,
      notes: undefined,
      items: [{ productId: 7, quantity: 1, unitPrice: 700_000, bonusPerUnit: 0, bonusPercent: 0 }],
      currency: 'UZS',
      exchangeRate: undefined,
      supplierDocNumber: undefined,
      supplierDocDate: undefined,
      vehicleNumber: undefined,
      transportCost: undefined,
      receiveNow: true,
    });
  });

  /**
   * USD hujjat — ta'minotchi yuk xati shablonida.
   *
   * <p>Narx DOLLARDA ketadi, so'mga server aylantiradi; to'langan summa esa
   * so'mda (kassadan chiqqan haqiqiy pul). Kurs oxirgi hujjatdan taklif
   * qilinadi. "Mol qabul qilindi" o'chirilsa hujjat kutilmoqda holatida.
   */
  it('USD hujjat: narx dollarda, to\'lov so\'mda, kurs taklifi va kutish rejimi', async () => {
    renderModal();
    await selectSupplierAndProduct();

    // Valyutani USD ga o'tkazamiz
    const currencyBox = screen.getByRole('combobox', { name: /Hujjat valyutasi/i });
    fireEvent.click(currencyBox);
    fireEvent.click(await screen.findByRole('option', { name: /USD/i }));

    // Kurs oxirgi hujjatdan (12 700) taklif qilingan
    const rateInput = screen.getByLabelText(/Kurs/i) as HTMLInputElement;
    await waitFor(() => expect(rateInput.value).toBe('12700'));

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Narx (USD)' }), { target: { value: '46.25' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Bonus / dona' }), { target: { value: '1' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Miqdor' }), { target: { value: '12' } });
    fireEvent.change(screen.getByPlaceholderText(/43 943/i), { target: { value: '43 943' } });
    fireEvent.change(screen.getByPlaceholderText(/1 post/i), { target: { value: '1 post' } });
    fireEvent.change(screen.getByLabelText(/To'langan \(USD\)/i), { target: { value: '100' } });
    fireEvent.click(screen.getByLabelText(/Mol qabul qilindi/i));

    fireEvent.click(screen.getByRole('button', { name: /Hujjatni saqlash/i }));

    await waitFor(() => expect(purchasesApi.create).toHaveBeenCalled());
    expect(purchasesApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: 'USD',
        exchangeRate: 12_700,
        supplierDocNumber: '43 943',
        vehicleNumber: '1 post',
        // 100 $ × 12 700
        paidAmount: 1_270_000,
        receiveNow: false,
        items: [{ productId: 7, quantity: 12, unitPrice: 46.25, bonusPerUnit: 1, bonusPercent: 0 }],
      })
    );
  });
});
