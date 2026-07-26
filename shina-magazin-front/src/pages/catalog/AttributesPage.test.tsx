import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import '../../i18n';
import type { Attribute } from '../../types';

vi.mock('../../api/products.api', () => ({
  attributesApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { attributesApi } from '../../api/products.api';
import { AttributesPage } from './AttributesPage';
import { useAuthStore } from '../../store/authStore';
import { PermissionCode } from '../../hooks/usePermission';

/**
 * Atributlar sahifasi — xarakteristik testlar.
 *
 * <p>React Query'ga ko'chirishdan OLDIN yozildi va ko'chirishdan keyin
 * O'ZGARTIRILMASDAN o'tishi kerak.
 */

const SEASON: Attribute = {
  id: 1,
  name: 'Mavsum',
  code: 'season',
  type: 'SELECT',
  filterable: true,
  options: [{ id: 1, value: 'Qishki' }],
} as Attribute;

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return render(<AttributesPage />, { wrapper: Wrapper });
}

describe('AttributesPage', () => {
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
    vi.mocked(attributesApi.getAll).mockResolvedValue([SEASON]);
  });

  it('atributlar ro\'yxatini ko\'rsatadi', async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByText('Mavsum').length).toBeGreaterThan(0));
  });

  it('tahrirlashda forma atribut nomi bilan to\'ladi', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText('Mavsum').length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByRole('button', { name: 'Tahrirlash' })[0]);

    const inputs = await screen.findAllByRole('textbox');
    expect(inputs[0]).toHaveValue('Mavsum');
  });

  it('o\'chirgandan keyin ro\'yxat qayta yuklanadi', async () => {
    vi.mocked(attributesApi.delete).mockResolvedValue(undefined);
    renderPage();
    // Qatorni kutamiz, API chaqirig'ini emas: chaqiruv tugagan bo'lsa ham
    // jadval hali skeletonda turishi mumkin.
    await waitFor(() => expect(screen.getAllByText('Mavsum').length).toBeGreaterThan(0));
    expect(attributesApi.getAll).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByRole('button', { name: "O'chirish" })[0]);
    const confirmButtons = await screen.findAllByRole('button', { name: "O'chirish" });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(attributesApi.delete).toHaveBeenCalledWith(1));
    await waitFor(() => expect(attributesApi.getAll).toHaveBeenCalledTimes(2));
  });

  it('yuklash xatosi qayta urinish tugmasi bilan ko\'rsatiladi', async () => {
    vi.mocked(attributesApi.getAll).mockRejectedValue(new Error('tarmoq yo\'q'));
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Qayta urinish/i })).toBeInTheDocument()
    );
  });
});
