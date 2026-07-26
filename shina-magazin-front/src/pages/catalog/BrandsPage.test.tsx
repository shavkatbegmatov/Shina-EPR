import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import '../../i18n';
import type { Brand } from '../../types';

vi.mock('../../api/products.api', () => ({
  brandsApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { brandsApi } from '../../api/products.api';
import { BrandsPage } from './BrandsPage';
import { useAuthStore } from '../../store/authStore';
import { PermissionCode } from '../../hooks/usePermission';

/**
 * Brendlar sahifasi — xarakteristik testlar.
 *
 * <p>Ular React Query'ga ko'chirishdan OLDIN yozildi: ko'chirish
 * xatti-harakatni saqlaganini isbotlashning yagona yo'li — o'zgarmagan
 * testlarning o'tishi.
 */

const MICHELIN: Brand = { id: 1, name: 'Michelin', country: 'Fransiya' } as Brand;
const NOKIAN: Brand = { id: 2, name: 'Nokian' } as Brand;

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return render(<BrandsPage />, { wrapper: Wrapper });
}

describe('BrandsPage', () => {
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
    vi.mocked(brandsApi.getAll).mockResolvedValue([MICHELIN, NOKIAN]);
  });

  it('brendlar ro\'yxatini ko\'rsatadi', async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByText('Michelin').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Nokian').length).toBeGreaterThan(0);
  });

  it('mamlakati yo\'q brend uchun chiziqcha chiqadi', async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByText('Nokian').length).toBeGreaterThan(0));
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('yangi brend oynasi bo\'sh forma bilan ochiladi', async () => {
    renderPage();
    await waitFor(() => expect(brandsApi.getAll).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /Yangi brend/i }));

    const inputs = await screen.findAllByRole('textbox');
    expect(inputs[0]).toHaveValue('');
  });

  it('tahrirlashda forma brend nomi bilan to\'ladi', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText('Michelin').length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByRole('button', { name: 'Tahrirlash' })[0]);

    const inputs = await screen.findAllByRole('textbox');
    expect(inputs[0]).toHaveValue('Michelin');
  });

  // Saqlangandan keyin ro'yxat yangilanishi kerak — aks holda foydalanuvchi
  // qo'shgan brendini ko'rmay, qaytadan qo'shishga urinadi.
  it('saqlagandan keyin ro\'yxat qayta yuklanadi', async () => {
    vi.mocked(brandsApi.create).mockResolvedValue(NOKIAN);
    renderPage();
    await waitFor(() => expect(brandsApi.getAll).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: /Yangi brend/i }));
    const inputs = await screen.findAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Pirelli' } });
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }));

    await waitFor(() => expect(brandsApi.create).toHaveBeenCalledWith('Pirelli', undefined));
    await waitFor(() => expect(brandsApi.getAll).toHaveBeenCalledTimes(2));
  });

  it('o\'chirgandan keyin ro\'yxat qayta yuklanadi', async () => {
    vi.mocked(brandsApi.delete).mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => expect(screen.getAllByText('Michelin').length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByRole('button', { name: "O'chirish" })[0]);
    // Tasdiqlash oynasidagi tugma
    const confirmButtons = await screen.findAllByRole('button', { name: "O'chirish" });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(brandsApi.delete).toHaveBeenCalledWith(1));
    await waitFor(() => expect(brandsApi.getAll).toHaveBeenCalledTimes(2));
  });

  it('yuklash xatosi qayta urinish tugmasi bilan ko\'rsatiladi', async () => {
    vi.mocked(brandsApi.getAll).mockRejectedValue(new Error('tarmoq yo\'q'));
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Qayta urinish/i })).toBeInTheDocument()
    );
  });
});
