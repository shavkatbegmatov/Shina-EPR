import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import type { Debt, PagedResponse } from '../../types';

vi.mock('../../api/debts.api', () => ({
  debtsApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getDebtPayments: vi.fn(),
    getTotalActiveDebt: vi.fn(),
    makePayment: vi.fn(),
    makeFullPayment: vi.fn(),
    export: { exportData: vi.fn() },
  },
}));

import { debtsApi } from '../../api/debts.api';
import { DebtsPage } from './DebtsPage';
import { useAuthStore } from '../../store/authStore';
import { PermissionCode } from '../../hooks/usePermission';

/**
 * Qarzlar sahifasi — xarakteristik testlar.
 *
 * <p>To'rtta mustaqil manba bor: sahifalangan ro'yxat, statistika uchun
 * to'liq ro'yxat, umumiy qarz summasi va tanlangan qarzning to'lovlari.
 * Ko'chirishda eng oson buziladigan joy — to'lovdan keyin bularning
 * HAMMASI yangilanishi kerak, biri unutilsa ekranda eski summa qoladi.
 */

const DEBT: Debt = {
  id: 1,
  customerId: 5,
  customerName: 'Anvar Qodirov',
  customerPhone: '+998901234567',
  originalAmount: 2_000_000,
  remainingAmount: 1_500_000,
  paidAmount: 500_000,
  status: 'ACTIVE',
  debtDate: '2026-03-01',
  dueDate: '2026-04-01',
  overdue: false,
  createdAt: '2026-03-01T09:00:00',
} as unknown as Debt;

function pageOf(content: Debt[]): PagedResponse<Debt> {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: 1,
    first: true,
    last: true,
  } as PagedResponse<Debt>;
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return render(<DebtsPage />, { wrapper: Wrapper });
}

describe('DebtsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      permissions: new Set([
        PermissionCode.DEBTS_VIEW,
        PermissionCode.DEBTS_PAY,
        PermissionCode.DEBTS_UPDATE,
      ]),
    });
    Element.prototype.scrollIntoView = vi.fn();

    vi.mocked(debtsApi.getAll).mockResolvedValue(pageOf([DEBT]));
    vi.mocked(debtsApi.getById).mockResolvedValue(DEBT);
    vi.mocked(debtsApi.getDebtPayments).mockResolvedValue([]);
    vi.mocked(debtsApi.getTotalActiveDebt).mockResolvedValue(1_500_000);
  });

  it('qarzlar ro\'yxatini ko\'rsatadi', async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByText('Anvar Qodirov').length).toBeGreaterThan(0));
  });

  // `getTotalActiveDebt` natijasi ekranga CHIQMAYDI: ko'rinadigan "jami
  // qarz" statistika ro'yxatidan mahalliy hisoblanadi. Eski kod bu so'rovni
  // har ochilishda va har bildirishnomada behuda yuborardi.
  it('ishlatilmaydigan "jami qarz" so\'rovi yuborilmaydi', async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByText('Anvar Qodirov').length).toBeGreaterThan(0));
    expect(debtsApi.getTotalActiveDebt).not.toHaveBeenCalled();
  });

  // Statistika sahifalangan ro'yxatdan emas, ALOHIDA to'liq ro'yxatdan
  // hisoblanadi — aks holda 2-sahifadagi qarzlar summaga kirmasdi.
  it('statistika uchun to\'liq ro\'yxat alohida so\'raladi', async () => {
    renderPage();

    await waitFor(() => expect(debtsApi.getAll).toHaveBeenCalled());
    const calls = vi.mocked(debtsApi.getAll).mock.calls.map((c) => c[0]);
    expect(calls.some((params) => params?.size === 1000)).toBe(true);
  });

  // Sahifalash SERVERDA: ro'yxat so'rovi sahifa va o'lcham bilan ketadi.
  // Brauzerda kesish 2-sahifadagi qarzlarni umuman ko'rsatmasdi.
  it('ro\'yxat so\'rovi sahifalash parametrlari bilan ketadi', async () => {
    renderPage();

    await waitFor(() => expect(debtsApi.getAll).toHaveBeenCalled());
    const listCall = vi
      .mocked(debtsApi.getAll)
      .mock.calls.map((c) => c[0])
      .find((params) => params?.size !== 1000);

    expect(listCall).toMatchObject({ page: 0, size: 20 });
  });

  it('yuklash xatosi qayta urinish tugmasi bilan ko\'rsatiladi', async () => {
    vi.mocked(debtsApi.getAll).mockRejectedValue(new Error('tarmoq yo\'q'));
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Qayta urinish/i })).toBeInTheDocument()
    );
  });
});
