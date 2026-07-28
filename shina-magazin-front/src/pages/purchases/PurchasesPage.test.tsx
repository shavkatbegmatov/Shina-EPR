import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import type { PagedResponse, Product, PurchaseOrder, Supplier } from '../../types';

vi.mock('../../api/purchases.api', () => ({
  purchasesApi: {
    getAll: vi.fn(),
    getStats: vi.fn(),
    create: vi.fn(),
    export: { excel: vi.fn(), pdf: vi.fn(), exportData: vi.fn() },
  },
}));
vi.mock('../../api/suppliers.api', () => ({
  suppliersApi: { getActive: vi.fn() },
}));
vi.mock('../../api/products.api', () => ({
  productsApi: { getAll: vi.fn() },
}));

import { purchasesApi } from '../../api/purchases.api';
import { suppliersApi } from '../../api/suppliers.api';
import { productsApi } from '../../api/products.api';
import { PurchasesPage } from './PurchasesPage';
import { useAuthStore } from '../../store/authStore';
import { PermissionCode } from '../../hooks/usePermission';
import { configureQueryDefaults } from '../../lib/queryConfig';

/**
 * Xaridlar sahifasi — xarakteristik testlar.
 *
 * <p>Bu yerda PUL bor: xarid ta'minotchiga qarz yozadi va omborga kirim
 * qiladi. So'rov tarkibidagi xato tuzatib bo'lmaydigan yozuv yaratadi,
 * shuning uchun u aniq qulflanadi.
 */

const SUPPLIER: Supplier = {
  id: 3,
  name: 'Alfa Shina',
  balance: 0,
  active: true,
} as Supplier;

/** Xarid narxi YO'Q — taxmin qoidasi shu mahsulotda ishlaydi. */
const PRODUCT: Product = {
  id: 7,
  sku: 'MCH-205',
  name: 'Michelin Primacy 4',
  sellingPrice: 999_999,
  purchasePrice: 0,
  quantity: 4,
  minStockLevel: 2,
  active: true,
} as Product;

const PURCHASE: PurchaseOrder = {
  id: 10,
  supplierName: 'Alfa Shina',
  orderDate: '2026-03-15',
  itemCount: 1,
  totalQuantity: 2,
  totalAmount: 1_399_998,
  paidAmount: 1_399_998,
  debtAmount: 0,
  status: 'RECEIVED',
  paymentStatus: 'PAID',
} as unknown as PurchaseOrder;

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
  return render(<PurchasesPage />, { wrapper: Wrapper });
}

/** Oynani ochib, ta'minotchi tanlaydi va mahsulotni savatga qo'shadi. */
async function openModalWithOneItem() {
  fireEvent.click(screen.getByRole('button', { name: /Yangi xarid/i }));

  // Sahifada ham ta'minotchi filtri bor — oynadagisi oxirgi render qilinadi
  const supplierBoxes = await screen.findAllByRole('combobox', { name: /Ta'minotchi/i });
  fireEvent.click(supplierBoxes[supplierBoxes.length - 1]);
  fireEvent.click(await screen.findByRole('option', { name: /Alfa Shina/i }));

  fireEvent.change(screen.getByPlaceholderText(/Mahsulot qidirish/i), {
    target: { value: 'michelin' },
  });
  // Nom `highlightMatch` tufayli bo'laklarga bo'linadi — variantning
  // to'liq nomi bo'yicha olinadi.
  fireEvent.click(await screen.findByRole('option', { name: /Michelin Primacy 4/i }));
}

describe('PurchasesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    useAuthStore.setState({
      permissions: new Set([
        PermissionCode.PURCHASES_VIEW,
        PermissionCode.PURCHASES_CREATE,
      ]),
    });

    vi.mocked(purchasesApi.getAll).mockResolvedValue(pageOf([PURCHASE]));
    vi.mocked(purchasesApi.getStats).mockResolvedValue({
      totalPurchases: 1,
      todayPurchases: 0,
      totalAmount: 1_399_998,
      totalDebt: 0,
      pendingCount: 0,
    } as never);
    vi.mocked(purchasesApi.create).mockResolvedValue(PURCHASE);
    vi.mocked(suppliersApi.getActive).mockResolvedValue([SUPPLIER]);
    vi.mocked(productsApi.getAll).mockResolvedValue(pageOf([PRODUCT]));
  });

  it('xaridlar ro\'yxatini yuklaydi', async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByText('Alfa Shina').length).toBeGreaterThan(0));
    expect(purchasesApi.getStats).toHaveBeenCalled();
  });

  // Mahsulot qidiruvi oyna ochilmaguncha kerak emas.
  it('mahsulot qidiruvi faqat matn terilganda ketadi', async () => {
    renderPage();
    await waitFor(() => expect(purchasesApi.getAll).toHaveBeenCalled());

    expect(productsApi.getAll).not.toHaveBeenCalled();
  });

  /**
   * ENG MUHIM TEST: serverga ketadigan xarid tarkibi.
   *
   * <p>`unitPrice` mahsulotning TANNARXIGA aylanadi va tannarx foyda
   * hisobiga kiradi — bu yerdagi xato hisobotlarga o'tadi.
   */
  it('xarid so\'rovi to\'g\'ri tarkib bilan yuboriladi', async () => {
    renderPage();
    await waitFor(() => expect(purchasesApi.getAll).toHaveBeenCalled());

    await openModalWithOneItem();
    fireEvent.click(screen.getByRole('button', { name: /Saqlash va omborga kirim/i }));

    await waitFor(() => expect(purchasesApi.create).toHaveBeenCalled());
    expect(purchasesApi.create).toHaveBeenCalledWith({
      supplierId: 3,
      orderDate: expect.any(String),
      paidAmount: 0,
      notes: undefined,
      // Xarid narxi yo'q -> sotuv narxining 70% i, BUTUN so'mda
      items: [{ productId: 7, quantity: 1, unitPrice: 699_999 }],
    });
  });

  // Ta'minotchisiz yoki bo'sh savat bilan xarid yaratilmasligi kerak.
  it('ta\'minotchi tanlanmasa xarid yuborilmaydi', async () => {
    renderPage();
    await waitFor(() => expect(purchasesApi.getAll).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /Yangi xarid/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Saqlash va omborga kirim/i }));

    expect(purchasesApi.create).not.toHaveBeenCalled();
  });

  // Xarid zaxirani VA ta'minotchi balansini o'zgartiradi — ikkalasi ham
  // yangilanmasa ekranda eski qoldiq va eski qarz ko'rinib qolardi.
  it('xariddan keyin ro\'yxat qayta so\'raladi', async () => {
    renderPage();
    await waitFor(() => expect(purchasesApi.getAll).toHaveBeenCalledTimes(1));

    await openModalWithOneItem();
    fireEvent.click(screen.getByRole('button', { name: /Saqlash va omborga kirim/i }));

    await waitFor(() => expect(purchasesApi.create).toHaveBeenCalled());
    await waitFor(() =>
      expect(vi.mocked(purchasesApi.getAll).mock.calls.length).toBeGreaterThan(1)
    );
  });
});
