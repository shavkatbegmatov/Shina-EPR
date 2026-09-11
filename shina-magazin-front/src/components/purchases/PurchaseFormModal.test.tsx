import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import type { PagedResponse, Product, PurchaseOrder, Supplier } from '../../types';

vi.mock('../../api/purchases.api', () => ({
  purchasesApi: { create: vi.fn() },
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
 * Ta'minotchilar sahifasidagi xarid oynasi.
 *
 * <p>Bu OYNA Xaridlar sahifasidagi bilan bir xil amalni bajaradi, lekin
 * alohida yozilgan. Aynan shu sabab ular ajralib ketgan edi — shuning
 * uchun bu yerda "xariddan keyin nima eskirishi" alohida qulflanadi.
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

describe('PurchaseFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(productsApi.getAll).mockResolvedValue(pageOf([PRODUCT]));
    vi.mocked(purchasesApi.create).mockResolvedValue({ id: 10 } as PurchaseOrder);
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
    const supplierBox = await screen.findByRole('combobox');
    fireEvent.click(supplierBox);
    fireEvent.click(await screen.findByRole('option', { name: /Alfa Shina/i }));

    fireEvent.change(screen.getByPlaceholderText(/qidir/i), {
      target: { value: 'michelin' },
    });
    fireEvent.click(await screen.findByRole('button', { name: /Michelin Primacy 4/i }));

    fireEvent.click(screen.getByRole('button', { name: /Xaridni saqlash|Saqlash/i }));

    await waitFor(() => expect(purchasesApi.create).toHaveBeenCalled());
    await waitFor(() =>
      expect(qc.getQueryState(productsKey)?.isInvalidated).toBe(true)
    );
    expect(qc.getQueryState(warehouseKey)?.isInvalidated).toBe(true);
  });
});
