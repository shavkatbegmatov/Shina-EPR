import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import type { PagedResponse, Role } from '../../types';

vi.mock('../../api/roles.api', () => ({
  rolesApi: {
    search: vi.fn(),
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    export: { excel: vi.fn(), pdf: vi.fn(), exportData: vi.fn() },
  },
  permissionsApi: { getAllGrouped: vi.fn() },
}));

import { rolesApi, permissionsApi } from '../../api/roles.api';
import { RolesPage } from './RolesPage';
import { useAuthStore } from '../../store/authStore';
import { PermissionCode } from '../../hooks/usePermission';
import { configureQueryDefaults } from '../../lib/queryConfig';

const ROLE: Role = {
  id: 1,
  name: 'Kassir',
  code: 'CASHIER',
  description: 'Kassa xodimi',
  isSystem: false,
  isActive: true,
  permissions: ['SALES_VIEW'],
  userCount: 2,
} as unknown as Role;

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // Ishlab chiqarishdagi muddatlar bilan bir xil: rollar "ma'lumotnoma"
  // keshida uzoq turadi, ya'ni invalidatsiya bo'lmasa eskilik ko'rinadi.
  configureQueryDefaults(qc);

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return render(<RolesPage />, { wrapper: Wrapper });
}

describe('RolesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    useAuthStore.setState({
      permissions: new Set([
        PermissionCode.ROLES_VIEW,
        PermissionCode.ROLES_CREATE,
        PermissionCode.ROLES_UPDATE,
      ]),
    });

    vi.mocked(rolesApi.search).mockResolvedValue({
      content: [ROLE],
      page: 0,
      size: 100,
      totalElements: 1,
      totalPages: 1,
      first: true,
      last: true,
    } as PagedResponse<Role>);
    vi.mocked(rolesApi.getById).mockResolvedValue(ROLE);
    vi.mocked(rolesApi.update).mockResolvedValue(ROLE);
    vi.mocked(permissionsApi.getAllGrouped).mockResolvedValue({});
  });

  it('rollar ro\'yxatini yuklaydi', async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByText('Kassir').length).toBeGreaterThan(0));
  });

  it('qidiruvda har harf uchun alohida so\'rov yubormaydi', async () => {
    renderPage();
    await waitFor(() => expect(rolesApi.search).toHaveBeenCalledTimes(1));

    const input = screen.getByPlaceholderText(/Rol nomi yoki kodi/i);
    const term = 'kassir';
    for (let i = 1; i <= term.length; i++) {
      fireEvent.change(input, { target: { value: term.slice(0, i) } });
    }

    await waitFor(() =>
      expect(rolesApi.search).toHaveBeenCalledWith(expect.objectContaining({ search: 'kassir' }))
    );
    expect(vi.mocked(rolesApi.search).mock.calls.length).toBeLessThanOrEqual(2);
  });

  /**
   * Rol tahrirlangach uning TAFSILOTI ham eskiradi.
   *
   * <p>Hozir bu o'z-o'zidan ishlaydi, chunki tafsilot kaliti hech qanday
   * muddat olmaydi va oyna qayta ochilganda baribir so'raladi. Kalit
   * ma'lumotnoma muddatiga tushgach esa u faqat INVALIDATSIYA tegsa
   * yangilanadi — shu sabab bu test kalitlarni ko'chirishdan oldin
   * yozildi: ko'chirish xatti-harakatni buzsa, shu yerda ko'rinadi.
   */
  it('rol tahrirlangach tafsilot so\'rovi ham yangilanadi', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText('Kassir').length).toBeGreaterThan(0));

    // Ko'rish oynasi — tafsilot birinchi marta olinadi
    fireEvent.click(screen.getByTitle('Ko\'rish'));
    await waitFor(() => expect(rolesApi.getById).toHaveBeenCalledTimes(1));
    // Oynada ikkita yopish tugmasi bor (X va pastdagi) — pastdagisi olinadi
    const closeButtons = await screen.findAllByRole('button', { name: /Yopish/i });
    fireEvent.click(closeButtons[closeButtons.length - 1]);

    // Tahrirlash va saqlash. Tahrir tugmasida faqat ikonka bor, shuning
    // uchun u kartochka amallari ichida ko'rish tugmasidan keyingisi.
    const actions = screen.getByTitle('Ko\'rish').closest('.card-actions') as HTMLElement;
    const actionButtons = actions.querySelectorAll('button');
    fireEvent.click(actionButtons[1]);
    fireEvent.click(await screen.findByRole('button', { name: /Saqlash/i }));
    await waitFor(() => expect(rolesApi.update).toHaveBeenCalled());

    // Oynani qayta ochamiz — endi yangi tafsilot kelishi kerak
    fireEvent.click(screen.getByTitle('Ko\'rish'));
    await waitFor(() => expect(rolesApi.getById).toHaveBeenCalledTimes(2));
  });
});
