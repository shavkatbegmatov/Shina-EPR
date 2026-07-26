import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import '../../i18n';
import type { Category } from '../../types';

vi.mock('../../api/products.api', () => ({
  categoriesApi: {
    getTree: vi.fn(),
    getAttributes: vi.fn(),
    updateAttributes: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    move: vi.fn(),
  },
  attributesApi: { getAll: vi.fn() },
}));

import { categoriesApi, attributesApi } from '../../api/products.api';
import { CategoriesPage } from './CategoriesPage';
import { useAuthStore } from '../../store/authStore';
import { PermissionCode } from '../../hooks/usePermission';

/**
 * Kategoriyalar sahifasi — xarakteristik testlar.
 *
 * <p>Uchta katalog sahifasi ichida eng nozigi: daraxt, birinchi darajani
 * o'z-o'zidan ochish va tartibni ko'chirish. Ko'chirishda aynan shu
 * xatti-harakatlar buzilishi mumkin, shuning uchun ular OLDIN qulflanadi.
 */

const TREE: Category[] = [
  {
    id: 1,
    name: 'Shinalar',
    children: [{ id: 2, name: 'Qishki shinalar', children: [] } as unknown as Category],
  } as unknown as Category,
  { id: 3, name: 'Disklar', children: [] } as unknown as Category,
];

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return render(<CategoriesPage />, { wrapper: Wrapper });
}

describe('CategoriesPage', () => {
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
    vi.mocked(categoriesApi.getTree).mockResolvedValue(TREE);
    vi.mocked(attributesApi.getAll).mockResolvedValue([]);
  });

  it('kategoriya daraxtini ko\'rsatadi', async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByText('Shinalar').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Disklar').length).toBeGreaterThan(0);
  });

  // Birinchi daraja BOSHLANISHDA ochiq bo'lishi kerak — aks holda
  // foydalanuvchi bo'sh ko'rinadigan ro'yxatni ochib chiqishi kerak bo'lardi.
  it('birinchi daraja o\'z-o\'zidan ochiq keladi', async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByText('Qishki shinalar').length).toBeGreaterThan(0));
  });

  it('tartibni ko\'chirish API chaqiradi va daraxtni yangilaydi', async () => {
    const moved: Category[] = [TREE[1], TREE[0]];
    vi.mocked(categoriesApi.move).mockResolvedValue(moved);
    renderPage();
    await waitFor(() => expect(screen.getAllByText('Shinalar').length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByRole('button', { name: /Pastga/i })[0]);

    await waitFor(() => expect(categoriesApi.move).toHaveBeenCalledWith(1, 'down'));
  });

  it('o\'chirgandan keyin daraxt qayta yuklanadi', async () => {
    vi.mocked(categoriesApi.delete).mockResolvedValue(undefined);
    renderPage();
    // Qatorni kutamiz, API chaqirig'ini emas: chaqiruv tugagan bo'lsa ham
    // daraxt hali yuklanish holatida bo'lishi mumkin.
    await waitFor(() => expect(screen.getAllByText('Shinalar').length).toBeGreaterThan(0));
    expect(categoriesApi.getTree).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByRole('button', { name: "O'chirish" })[0]);
    const confirmButtons = await screen.findAllByRole('button', { name: "O'chirish" });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(categoriesApi.delete).toHaveBeenCalledWith(1));
    await waitFor(() => expect(categoriesApi.getTree).toHaveBeenCalledTimes(2));
  });
});
