import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import type { PagedResponse, Product, StockMovement, WarehouseStats } from '../../types';

vi.mock('../../api/warehouse.api', () => ({
  warehouseApi: {
    getStats: vi.fn(),
    getMovements: vi.fn(),
    getLowStockProducts: vi.fn(),
    createAdjustment: vi.fn(),
    export: { excel: vi.fn(), pdf: vi.fn(), exportData: vi.fn() },
  },
}));
vi.mock('../../api/products.api', () => ({
  productsApi: { getAll: vi.fn() },
}));

import { warehouseApi } from '../../api/warehouse.api';
import { productsApi } from '../../api/products.api';
import { WarehousePage } from './WarehousePage';
import { useAuthStore } from '../../store/authStore';
import { PermissionCode } from '../../hooks/usePermission';
import { configureQueryDefaults } from '../../lib/queryConfig';
import { queryKeys } from '../../lib/queryKeys';

/**
 * Ombor sahifasi — xarakteristik testlar.
 *
 * <p>Bu yerda ZAXIRA o'zgaradi: chiqim va tuzatish mahsulot qoldig'ini
 * to'g'ridan-to'g'ri kamaytiradi. So'rov tarkibidagi xato yoki
 * yangilanmagan ro'yxat kassirni yo'q tovarni sotishga undaydi.
 */

const PRODUCT: Product = {
  id: 7,
  sku: 'MCH-205',
  name: 'Michelin Primacy 4',
  sellingPrice: 1_000_000,
  purchasePrice: 700_000,
  quantity: 9,
  minStockLevel: 2,
  active: true,
} as Product;

const MOVEMENT: StockMovement = {
  id: 1,
  productName: 'Michelin Primacy 4',
  productSku: 'MCH-205',
  movementType: 'IN',
  quantity: 5,
  createdAt: '2026-06-01T10:00:00',
} as unknown as StockMovement;

const STATS: WarehouseStats = {
  totalProducts: 5,
  totalStockValue: 20_000_000,
  lowStockCount: 1,
  outOfStockCount: 0,
} as unknown as WarehouseStats;

function pageOf<T>(content: T[]): PagedResponse<T> {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: 1,
    first: true,
    last: true,
  } as PagedResponse<T>;
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  configureQueryDefaults(qc);
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  render(<WarehousePage />, { wrapper: Wrapper });
  return qc;
}

/** Chiqim oynasini ochib, mahsulot tanlaydi va miqdor kiritadi. */
async function openOutModalWithProduct(quantity: string) {
  fireEvent.click(await screen.findByRole('button', { name: /^Chiqim$/i }));

  fireEvent.change(screen.getByPlaceholderText(/Mahsulot qidirish/i), {
    target: { value: 'michelin' },
  });
  // Bu nom harakatlar jadvalida ham bor — ochiluvchi ro'yxatdagi
  // variant tugma sifatida olinadi.
  fireEvent.click(await screen.findByRole('button', { name: /Michelin Primacy 4/i }));

  fireEvent.change(screen.getByLabelText(/Miqdor/i), { target: { value: quantity } });
}

describe('WarehousePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    useAuthStore.setState({
      permissions: new Set([
        PermissionCode.WAREHOUSE_VIEW,
        PermissionCode.WAREHOUSE_ADJUST,
      ]),
    });

    vi.mocked(warehouseApi.getStats).mockResolvedValue(STATS);
    vi.mocked(warehouseApi.getMovements).mockResolvedValue(pageOf([MOVEMENT]));
    vi.mocked(warehouseApi.getLowStockProducts).mockResolvedValue([]);
    vi.mocked(warehouseApi.createAdjustment).mockResolvedValue(MOVEMENT);
    vi.mocked(productsApi.getAll).mockResolvedValue(pageOf([PRODUCT]));
  });

  it('statistika, kam qolganlar va harakatlarni yuklaydi', async () => {
    renderPage();

    await waitFor(() => expect(warehouseApi.getMovements).toHaveBeenCalled());
    expect(warehouseApi.getStats).toHaveBeenCalled();
    expect(warehouseApi.getLowStockProducts).toHaveBeenCalled();
  });

  /**
   * ENG MUHIM TEST: chiqim so'rovining tarkibi.
   *
   * <p>Bu so'rov mahsulot qoldig'ini kamaytiradi va Ombor tarixiga
   * qaytarib bo'lmaydigan yozuv qo'shadi.
   */
  it('chiqim so\'rovi to\'g\'ri tarkib bilan yuboriladi', async () => {
    renderPage();
    await waitFor(() => expect(warehouseApi.getMovements).toHaveBeenCalled());

    await openOutModalWithProduct('3');
    fireEvent.click(screen.getByRole('button', { name: /Chiqim qo'shish/i }));

    await waitFor(() => expect(warehouseApi.createAdjustment).toHaveBeenCalled());
    expect(warehouseApi.createAdjustment).toHaveBeenCalledWith({
      productId: 7,
      movementType: 'OUT',
      quantity: 3,
      notes: undefined,
    });
  });

  /**
   * Zaxira o'zgargach MAHSULOTLAR ham eskiradi.
   *
   * <p>Faqat ombor kalitini bekor qilsak, Mahsulotlar sahifasi va POS
   * eski qoldiqni ko'rsatib turaverardi — kassir yo'q tovarni sotishga
   * urinardi.
   */
  it('chiqimdan keyin ombor va mahsulotlar qayta so\'raladi', async () => {
    const qc = renderPage();
    await waitFor(() => expect(warehouseApi.getMovements).toHaveBeenCalledTimes(1));

    // Mahsulotlar sahifasi/POS ko'rgan ro'yxatni keshga qo'yamiz — chiqim
    // uni ESKI holatga keltirishi kerak.
    const productsKey = queryKeys.products.list({ page: 0, size: 20 });
    qc.setQueryData(productsKey, pageOf([PRODUCT]));

    await openOutModalWithProduct('3');
    fireEvent.click(screen.getByRole('button', { name: /Chiqim qo'shish/i }));

    await waitFor(() => expect(warehouseApi.createAdjustment).toHaveBeenCalled());
    await waitFor(() =>
      expect(vi.mocked(warehouseApi.getMovements).mock.calls.length).toBeGreaterThan(1)
    );
    expect(warehouseApi.getStats).toHaveBeenCalledTimes(2);
    expect(qc.getQueryState(productsKey)?.isInvalidated).toBe(true);
  });

  // Mahsulot tanlanmagan bo'lsa chiqim yuborilmasligi kerak.
  it('mahsulot tanlanmasa chiqim yuborilmaydi', async () => {
    renderPage();
    await waitFor(() => expect(warehouseApi.getMovements).toHaveBeenCalled());

    fireEvent.click(await screen.findByRole('button', { name: /^Chiqim$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Chiqim qo'shish/i }));

    expect(warehouseApi.createAdjustment).not.toHaveBeenCalled();
  });

  // Qidiruv har bosilgan harfda serverga bormasligi kerak: mahsulot
  // so'rovlari ataylab keshlanmaydi, ya'ni har biri bazagacha boradi.
  it('mahsulot qidiruvida har harf uchun alohida so\'rov yubormaydi', async () => {
    renderPage();
    await waitFor(() => expect(warehouseApi.getMovements).toHaveBeenCalled());

    fireEvent.click(await screen.findByRole('button', { name: /^Chiqim$/i }));
    const input = screen.getByPlaceholderText(/Mahsulot qidirish/i);
    const term = 'michelin';
    for (let i = 1; i <= term.length; i++) {
      fireEvent.change(input, { target: { value: term.slice(0, i) } });
    }

    await waitFor(() =>
      expect(productsApi.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'michelin' })
      )
    );
    expect(vi.mocked(productsApi.getAll).mock.calls.length).toBeLessThanOrEqual(2);
  });
});
