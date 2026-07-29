import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import type { Expense, PagedResponse } from '../../types';

vi.mock('../../api/expenses.api', () => ({
  expensesApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

import { expensesApi } from '../../api/expenses.api';
import { ExpensesPage } from './ExpensesPage';
import { useAuthStore } from '../../store/authStore';
import { PermissionCode } from '../../hooks/usePermission';
import { configureQueryDefaults } from '../../lib/queryConfig';
import { queryKeys } from '../../lib/queryKeys';

/**
 * Xarajatlar sahifasi — xarakteristik testlar.
 *
 * <p>Xarajat ikki joyga bevosita ta'sir qiladi: P&L hisobotidagi SOF
 * FOYDAGA va naqd bo'lsa smenaning kutilgan kassasiga. Ya'ni bu yerdagi
 * yozuv "shunchaki ro'yxat qatori" emas.
 */

const EXPENSE: Expense = {
  id: 4,
  expenseDate: '2026-06-10',
  category: 'RENT',
  amount: 1_200_000,
  description: 'Iyun ijara',
  paymentMethod: 'CASH',
} as unknown as Expense;

function pageOf(content: Expense[]): PagedResponse<Expense> {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: 1,
    first: true,
    last: true,
  } as PagedResponse<Expense>;
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  configureQueryDefaults(qc);
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  render(<ExpensesPage />, { wrapper: Wrapper });
  return qc;
}

const REPORT_RANGE = { start: '2026-06-01', end: '2026-06-30' };

describe('ExpensesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    useAuthStore.setState({
      permissions: new Set([
        PermissionCode.EXPENSES_VIEW,
        PermissionCode.EXPENSES_CREATE,
        PermissionCode.EXPENSES_UPDATE,
        PermissionCode.EXPENSES_DELETE,
      ]),
    });

    vi.mocked(expensesApi.getAll).mockResolvedValue(pageOf([EXPENSE]));
    vi.mocked(expensesApi.create).mockResolvedValue(EXPENSE);
    vi.mocked(expensesApi.update).mockResolvedValue(EXPENSE);
    vi.mocked(expensesApi.remove).mockResolvedValue(undefined);
  });

  it('xarajatlar ro\'yxatini sana oralig\'i bilan yuklaydi', async () => {
    renderPage();

    await waitFor(() => expect(expensesApi.getAll).toHaveBeenCalled());
    const params = vi.mocked(expensesApi.getAll).mock.calls[0][0];
    expect(params.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(params.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(await screen.findByText('Iyun ijara')).toBeInTheDocument();
  });

  // Summa noldan katta bo'lmasa so'rov umuman ketmasligi kerak.
  it('nol summa bilan xarajat yaratilmaydi', async () => {
    renderPage();
    await waitFor(() => expect(expensesApi.getAll).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /^Xarajat qo/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Saqlash/i }));

    expect(expensesApi.create).not.toHaveBeenCalled();
  });

  /**
   * Xarajat P&L ga BEVOSITA kiradi.
   *
   * <p>Sahifadagi izoh shuni aytadi, lekin hisobot kaliti bekor
   * qilinmasa, egasi xarajat qo'shib Hisobotlarga o'tganda ESKI sof
   * foydani ko'radi — aynan o'zi hozir o'zgartirgan raqamni.
   */
  it('xarajat saqlangach hisobotlar ham eskiradi', async () => {
    const qc = renderPage();
    await waitFor(() => expect(expensesApi.getAll).toHaveBeenCalled());

    // Hisobotlar sahifasi ko'rgan P&L ni keshga qo'yamiz
    const plKey = queryKeys.reports.profitLoss(REPORT_RANGE);
    qc.setQueryData(plKey, { netProfit: 0 });

    fireEvent.click(screen.getByRole('button', { name: /^Xarajat qo/i }));
    fireEvent.change(await screen.findByLabelText(/Summa/i), {
      target: { value: '500000' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Saqlash/i }));

    await waitFor(() => expect(expensesApi.create).toHaveBeenCalled());
    await waitFor(() =>
      expect(qc.getQueryState(plKey)?.isInvalidated).toBe(true)
    );
  });

  // Naqd xarajat smenaning kutilgan kassasini o'zgartiradi.
  it('xarajat saqlangach smenalar ham eskiradi', async () => {
    const qc = renderPage();
    await waitFor(() => expect(expensesApi.getAll).toHaveBeenCalled());

    const shiftKey = queryKeys.shifts.current();
    qc.setQueryData(shiftKey, { id: 1 });

    fireEvent.click(screen.getByRole('button', { name: /^Xarajat qo/i }));
    fireEvent.change(await screen.findByLabelText(/Summa/i), {
      target: { value: '500000' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Saqlash/i }));

    await waitFor(() => expect(expensesApi.create).toHaveBeenCalled());
    await waitFor(() =>
      expect(qc.getQueryState(shiftKey)?.isInvalidated).toBe(true)
    );
  });
});
