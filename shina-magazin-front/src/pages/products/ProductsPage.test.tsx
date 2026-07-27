import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import type { Brand, Category, PagedResponse, Product } from '../../types';

vi.mock('../../api/products.api', () => ({
  productsApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    uploadImage: vi.fn(),
    export: { excel: vi.fn(), pdf: vi.fn() },
  },
  brandsApi: { getAll: vi.fn() },
  categoriesApi: { getTree: vi.fn(), getAttributes: vi.fn() },
}));

import { productsApi, brandsApi, categoriesApi } from '../../api/products.api';
import { ProductsPage } from './ProductsPage';
import { useAuthStore } from '../../store/authStore';
import { PermissionCode } from '../../hooks/usePermission';

/**
 * Mahsulotlar sahifasi — xarakteristik testlar.
 *
 * <p>React Query'ga ko'chirishdan OLDIN yozildi. Sahifada filtrlar, forma va
 * kategoriyaga bog'liq atributlar bir-biriga ulangan, shuning uchun aynan
 * shu bog'lanishlar qulflanadi: ko'chirishda eng oson buziladigan joy —
 * filtr o'zgarganda so'rov parametrlari va kategoriya tanlanganda atribut
 * yuklash.
 */

const TIRE: Product = {
  id: 1,
  sku: 'MCH-205',
  name: 'Michelin Primacy 4',
  brandId: 1,
  brandName: 'Michelin',
  categoryId: 10,
  sellingPrice: 1_000_000,
  purchasePrice: 700_000,
  quantity: 8,
  minStockLevel: 2,
  active: true,
} as Product;

const BRANDS: Brand[] = [{ id: 1, name: 'Michelin' } as Brand];
const TREE: Category[] = [
  { id: 10, name: 'Shinalar', template: 'TIRE', children: [] } as unknown as Category,
];

function pageOf(content: Product[]): PagedResponse<Product> {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: 1,
    first: true,
    last: true,
  } as PagedResponse<Product>;
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return render(<ProductsPage />, { wrapper: Wrapper });
}

describe('ProductsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      permissions: new Set([
        PermissionCode.PRODUCTS_VIEW,
        PermissionCode.PRODUCTS_CREATE,
        PermissionCode.PRODUCTS_UPDATE,
        PermissionCode.PRODUCTS_DELETE,
      ]),
    });
    Element.prototype.scrollIntoView = vi.fn();

    vi.mocked(productsApi.getAll).mockResolvedValue(pageOf([TIRE]));
    vi.mocked(productsApi.getById).mockResolvedValue({ ...TIRE, attributes: [] } as Product);
    vi.mocked(brandsApi.getAll).mockResolvedValue(BRANDS);
    vi.mocked(categoriesApi.getTree).mockResolvedValue(TREE);
    vi.mocked(categoriesApi.getAttributes).mockResolvedValue([]);
  });

  it('mahsulotlar ro\'yxatini ko\'rsatadi', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getAllByText('Michelin Primacy 4').length).toBeGreaterThan(0)
    );
  });

  it('brendlar va kategoriya daraxti ham yuklanadi', async () => {
    renderPage();

    await waitFor(() => expect(brandsApi.getAll).toHaveBeenCalled());
    expect(categoriesApi.getTree).toHaveBeenCalled();
  });

  // Qidiruv SERVERGA ketishi kerak: brauzerda filtrlash faqat yuklangan
  // sahifa ichida ishlab, natija jimgina to'liq bo'lmasdi.
  it('qidiruv so\'rov parametri sifatida serverga uzatiladi', async () => {
    renderPage();
    await waitFor(() => expect(productsApi.getAll).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText(/qidirish|nomi|SKU/i), {
      target: { value: 'primacy' },
    });

    await waitFor(() =>
      expect(productsApi.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'primacy' })
      )
    );
  });

  // Mahsulot so'rovlari ataylab keshlanmaydi (zaxira soni eskirmasligi
  // kerak), shuning uchun har harf uchun so'rov yuborish qimmat tushadi.
  it('qidiruvda har harf uchun alohida so\'rov yubormaydi', async () => {
    renderPage();
    await waitFor(() => expect(productsApi.getAll).toHaveBeenCalledTimes(1));

    const input = screen.getByPlaceholderText(/qidirish|nomi|SKU/i);
    const term = 'primacy';
    for (let i = 1; i <= term.length; i++) {
      fireEvent.change(input, { target: { value: term.slice(0, i) } });
    }

    await waitFor(() =>
      expect(productsApi.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'primacy' })
      )
    );
    expect(vi.mocked(productsApi.getAll).mock.calls.length).toBeLessThanOrEqual(2);
  });

  it('tahrirlashda forma mahsulot ma\'lumoti bilan to\'ladi', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Michelin Primacy 4').length).toBeGreaterThan(0)
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Tahrirlash' })[0]);

    const skuInput = await screen.findByDisplayValue('MCH-205');
    expect(skuInput).toBeInTheDocument();
    expect(screen.getByDisplayValue('Michelin Primacy 4')).toBeInTheDocument();
  });

  // Tahrirlashda ro'yxat javobida atribut qiymatlari yo'q — to'liq mahsulot
  // alohida olinadi. Bu chaqiruv tushib qolsa forma atributlari bo'sh
  // ko'rinib, saqlashda ular O'CHIB ketardi.
  it('tahrirlashda to\'liq mahsulot va kategoriya atributlari olinadi', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Michelin Primacy 4').length).toBeGreaterThan(0)
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Tahrirlash' })[0]);

    await waitFor(() => expect(productsApi.getById).toHaveBeenCalledWith(1));
    await waitFor(() => expect(categoriesApi.getAttributes).toHaveBeenCalledWith(10));
  });

  it('yangi mahsulot oynasi bo\'sh forma bilan ochiladi', async () => {
    renderPage();
    await waitFor(() => expect(productsApi.getAll).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /Yangi mahsulot/i }));

    const skuInput = await screen.findByPlaceholderText('SH-001');
    expect(skuInput).toHaveValue('');
  });

  it('yuklash xatosi qayta urinish tugmasi bilan ko\'rsatiladi', async () => {
    vi.mocked(productsApi.getAll).mockRejectedValue(new Error('tarmoq yo\'q'));
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Qayta urinish/i })).toBeInTheDocument()
    );
  });
});
