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
  width: 205,
  profile: 55,
  diameter: 16,
  active: true,
} as Product;

const BRANDS: Brand[] = [{ id: 1, name: 'Michelin' } as Brand];
const TREE: Category[] = [
  { id: 10, name: 'Shinalar', template: 'TIRE', children: [] } as unknown as Category,
  { id: 20, name: 'Moylar', template: 'UNIVERSAL', children: [] } as unknown as Category,
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

  /**
   * ENG MUHIM TEST: serverga ketadigan mahsulot tarkibi.
   *
   * <p>Bu yerda SOTISH NARXI bor — xato qiymat har savdoga ta'sir qiladi.
   * Ayni paytda zaxira va tannarx formada TAHRIRLANMAYDI (ularni Ombor va
   * Xaridlar boshqaradi), lekin tahrirda o'zgarishsiz QAYTARILISHI kerak:
   * ular yuborilmasa server ularni bo'shatib yuborardi.
   */
  it('tahrirda so\'rov tarkibi to\'g\'ri, zaxira va tannarx saqlanadi', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Michelin Primacy 4').length).toBeGreaterThan(0)
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Tahrirlash' })[0]);
    await screen.findByDisplayValue('MCH-205');
    await waitFor(() => expect(categoriesApi.getAttributes).toHaveBeenCalledWith(10));

    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }));

    await waitFor(() => expect(productsApi.update).toHaveBeenCalled());
    expect(productsApi.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        sku: 'MCH-205',
        name: 'Michelin Primacy 4',
        sellingPrice: 1_000_000,
        quantity: 8,
        purchasePrice: 700_000,
      })
    );
  });

  // Yangi mahsulot 0 zaxira bilan boshlanadi: forma zaxira/tannarx
  // YUBORMASLIGI kerak, aks holda ular Ombor tarixisiz paydo bo'lardi.
  it('yangi mahsulotda zaxira va tannarx yuborilmaydi', async () => {
    renderPage();
    await waitFor(() => expect(productsApi.getAll).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /Yangi mahsulot/i }));
    fireEvent.change(await screen.findByPlaceholderText('SH-001'), {
      target: { value: 'NEW-1' },
    });
    fireEvent.change(screen.getByPlaceholderText('Michelin Pilot Sport 5'), {
      target: { value: 'Yangi shina' },
    });
    fireEvent.change(screen.getByLabelText(/Sotish narxi/i), {
      target: { value: '500000' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }));

    await waitFor(() => expect(productsApi.create).toHaveBeenCalled());
    const payload = vi.mocked(productsApi.create).mock.calls[0][0];
    expect(payload.sku).toBe('NEW-1');
    expect(payload.quantity).toBeUndefined();
    expect(payload.purchasePrice).toBeUndefined();
  });

  /**
   * Kategoriya SHINA bo'lmasa o'lcham maydonlari yuborilmaydi.
   *
   * <p>Universal magazin: shina bo'lmagan kategoriyaga o'tkazilgan
   * mahsulotda eski o'lcham qiymatlari qolib ketsa, katalogda "205/55 R16
   * Motor moyi" kabi ma'nosiz yozuv paydo bo'lardi.
   */
  it('shina bo\'lmagan kategoriyada o\'lcham maydonlari tozalanadi', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Michelin Primacy 4').length).toBeGreaterThan(0)
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Tahrirlash' })[0]);
    await screen.findByDisplayValue('MCH-205');

    // Kategoriyani "Moylar" (UNIVERSAL) ga almashtiramiz. Xuddi shu nomli
    // filtr sahifada ham bor — oynadagisi oxirgi bo'lib render qilinadi.
    const categoryBoxes = screen.getAllByRole('combobox', { name: 'Kategoriya' });
    fireEvent.click(categoryBoxes[categoryBoxes.length - 1]);
    fireEvent.click(await screen.findByRole('option', { name: /Moylar/i }));

    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }));

    await waitFor(() => expect(productsApi.update).toHaveBeenCalled());
    const payload = vi.mocked(productsApi.update).mock.calls[0][1];
    expect(payload.categoryId).toBe(20);
    expect(payload.width).toBeUndefined();
    expect(payload.profile).toBeUndefined();
    expect(payload.diameter).toBeUndefined();
    expect(payload.season).toBeUndefined();
  });

  // Tahrirlashdan keyin "yangi" oynasi TOZA ochilishi kerak — aks holda
  // kassir oldingi mahsulot ma'lumoti ustiga yozib yuborardi.
  it('tahrirdan keyin "yangi" oyna yana bo\'sh ochiladi', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Michelin Primacy 4').length).toBeGreaterThan(0)
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Tahrirlash' })[0]);
    await screen.findByDisplayValue('MCH-205');
    fireEvent.click(screen.getByRole('button', { name: 'Bekor qilish' }));

    fireEvent.click(screen.getByRole('button', { name: /Yangi mahsulot/i }));

    expect(await screen.findByPlaceholderText('SH-001')).toHaveValue('');
    expect(screen.queryByDisplayValue('MCH-205')).not.toBeInTheDocument();
  });

  it('yuklash xatosi qayta urinish tugmasi bilan ko\'rsatiladi', async () => {
    vi.mocked(productsApi.getAll).mockRejectedValue(new Error('tarmoq yo\'q'));
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Qayta urinish/i })).toBeInTheDocument()
    );
  });
});
