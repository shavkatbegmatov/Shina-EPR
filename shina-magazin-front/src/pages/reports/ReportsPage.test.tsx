import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import type { DebtsReport, ProfitLossReport, SalesReport, WarehouseReport } from '../../types';

vi.mock('../../api/reports.api', () => ({
  reportsApi: {
    getSalesReport: vi.fn(),
    getWarehouseReport: vi.fn(),
    getDebtsReport: vi.fn(),
    getProfitLossReport: vi.fn(),
  },
}));

import { reportsApi } from '../../api/reports.api';
import { ReportsPage } from './ReportsPage';
import { useAuthStore } from '../../store/authStore';
import { PermissionCode, type PermissionCodeType } from '../../hooks/usePermission';
import { configureQueryDefaults } from '../../lib/queryConfig';

/**
 * Hisobotlar sahifasi — xarakteristik testlar.
 *
 * <p>Bu sahifa QAROR qabul qilish uchun ishlatiladi: foyda, zarar va
 * qarzlar. Bu yerdagi jimgina xato eng qimmat turdagi xato — raqam
 * ishonchli ko'rinadi, lekin noto'g'ri bo'ladi. Shuning uchun ayniqsa
 * ikki narsa qulflanadi: zarar ZARAR bo'lib ko'rinishi va tannarxi
 * noma'lum qatorlar haqidagi ogohlantirish yo'qolmasligi.
 */

const SALES: SalesReport = {
  totalRevenue: 10_000_000,
  returnsTotal: 500_000,
  netRevenue: 9_500_000,
  totalProfit: 2_000_000,
  totalSalesCount: 12,
  completedSalesCount: 11,
  cancelledSalesCount: 1,
  returnsCount: 1,
  averageSaleAmount: 833_333,
  cashTotal: 6_000_000,
  cardTotal: 2_000_000,
  transferTotal: 1_000_000,
  debtTotal: 500_000,
  itemsWithoutCost: 0,
  dailyData: [],
  topProducts: [],
  topCustomers: [],
} as unknown as SalesReport;

const WAREHOUSE: WarehouseReport = {
  totalProducts: 5,
  totalStockValue: 20_000_000,
  lowStockCount: 1,
  outOfStockCount: 0,
  incomingTotal: 0,
  outgoingTotal: 0,
  movements: [],
  lowStockProducts: [],
} as unknown as WarehouseReport;

const DEBTS: DebtsReport = {
  totalDebt: 1_000_000,
  overdueDebt: 0,
  debtorsCount: 2,
  overdueCount: 0,
  topDebtors: [],
  supplierDebt: 0,
  suppliersWithDebt: [],
} as unknown as DebtsReport;

/** ZARARDA va tannarxi noma'lum qatorlari bor davr. */
const PROFIT_LOSS: ProfitLossReport = {
  startDate: '2026-06-01',
  endDate: '2026-06-30',
  revenue: 10_000_000,
  returns: 500_000,
  netRevenue: 9_500_000,
  costOfGoodsSold: 8_000_000,
  grossProfit: 1_500_000,
  grossMarginPercent: 15.8,
  // 1 500 000 (yalpi) - 3 600 000 (xarajat) = -2 100 000.
  // 2 100 000 ATAYLAB boshqa hech qaysi maydonga teng emas — shunda
  // "musbat ko'rinmasin" tekshiruvi aynan sof foydaga tegishli bo'ladi.
  totalExpenses: 3_600_000,
  expensesByCategory: [],
  netProfit: -2_100_000,
  netMarginPercent: -22.1,
  salesCount: 12,
  returnsCount: 1,
  expensesCount: 4,
  daily: [],
  itemsWithoutCost: 3,
} as unknown as ProfitLossReport;

function renderPage(permissions: PermissionCodeType[]) {
  useAuthStore.setState({ permissions: new Set(permissions) });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  configureQueryDefaults(qc);
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return render(<ReportsPage />, { wrapper: Wrapper });
}

const FULL_ACCESS = [PermissionCode.REPORTS_VIEW_SALES, PermissionCode.EXPENSES_VIEW];

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();

    vi.mocked(reportsApi.getSalesReport).mockResolvedValue(SALES);
    vi.mocked(reportsApi.getWarehouseReport).mockResolvedValue(WAREHOUSE);
    vi.mocked(reportsApi.getDebtsReport).mockResolvedValue(DEBTS);
    vi.mocked(reportsApi.getProfitLossReport).mockResolvedValue(PROFIT_LOSS);
  });

  it('hisobotlarni sana oralig\'i bilan yuklaydi', async () => {
    renderPage(FULL_ACCESS);

    await waitFor(() => expect(reportsApi.getSalesReport).toHaveBeenCalled());
    // Oraliq ikki chekkasi bilan serverga uzatiladi
    const [start, end] = vi.mocked(reportsApi.getSalesReport).mock.calls[0];
    expect(start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(reportsApi.getWarehouseReport).toHaveBeenCalledWith(start, end);
    expect(reportsApi.getDebtsReport).toHaveBeenCalledWith(start, end);
  });

  /**
   * P&L ATAYLAB alohida so'rov: u `EXPENSES_VIEW` talab qiladi.
   *
   * <p>Umumiy `Promise.all` ichida bo'lsa, ruxsati yo'q kassirga kelgan
   * 403 QOLGAN hisobotlarni ham ochilmay qoldirardi.
   */
  it('xarajat ruxsati bo\'lmasa P&L so\'ralmaydi, qolganlari ochiladi', async () => {
    renderPage([PermissionCode.REPORTS_VIEW_SALES]);

    await waitFor(() => expect(reportsApi.getSalesReport).toHaveBeenCalled());
    expect(reportsApi.getProfitLossReport).not.toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: /Sotuvlar/i })).toBeInTheDocument();
  });

  it('P&L xatosi qolgan hisobotlarni to\'smaydi', async () => {
    vi.mocked(reportsApi.getProfitLossReport).mockRejectedValue(new Error('403'));
    renderPage(FULL_ACCESS);

    await waitFor(() => expect(reportsApi.getSalesReport).toHaveBeenCalled());
    // Umumiy xato xabari CHIQMASLIGI kerak
    await waitFor(() =>
      expect(screen.queryByText(/Hisobotlarni yuklashda xatolik/i)).not.toBeInTheDocument()
    );
    expect(await screen.findByRole('button', { name: /Sotuvlar/i })).toBeInTheDocument();
  });

  /**
   * Zarar ZARAR bo'lib ko'rinishi kerak.
   *
   * <p>Manfiy sof foyda musbat kabi ko'rsatilsa, egasiga oyni foydada
   * tugatgandek tuyulardi.
   */
  it('zarar manfiy summa bilan ko\'rsatiladi', async () => {
    renderPage(FULL_ACCESS);
    await waitFor(() => expect(reportsApi.getProfitLossReport).toHaveBeenCalled());

    fireEvent.click(await screen.findByRole('button', { name: /Foyda va zarar/i }));

    // Sof foyda -2 100 000: manfiy holida ko'rinishi kerak...
    expect((await screen.findAllByText(/-\s?2[\s ]?100[\s ]?000/)).length).toBeGreaterThan(0);

    // ...va HECH QAYERDA musbat 2 100 000 bo'lib chiqmasligi kerak.
    // Ikkinchi da'vo muhim: birinchisi yolg'iz o'zi, summa bir joyda
    // manfiy, boshqasida modul bilan ko'rsatilsa ham o'tib ketardi.
    expect(screen.queryByText(/(^|[^-\d])2[\s ]?100[\s ]?000/)).not.toBeInTheDocument();
  });

  /**
   * Tannarxi noma'lum qatorlar haqidagi ogohlantirish YO'QOLMASLIGI kerak.
   *
   * <p>Ularsiz yalpi foyda haqiqiydan yuqori chiqadi, lekin hisobot
   * bexato ko'rinadi — foydalanuvchi noto'g'ri raqamga ishonadi.
   */
  it('tannarxi noma\'lum qatorlar haqida ogohlantiradi', async () => {
    renderPage(FULL_ACCESS);
    await waitFor(() => expect(reportsApi.getProfitLossReport).toHaveBeenCalled());

    fireEvent.click(await screen.findByRole('button', { name: /Foyda va zarar/i }));

    expect(await screen.findByText(/tannarxi noma.lum/i)).toBeInTheDocument();
  });

  it('yangilash barcha hisobotlarni qayta so\'raydi', async () => {
    renderPage(FULL_ACCESS);
    await waitFor(() => expect(reportsApi.getSalesReport).toHaveBeenCalledTimes(1));

    fireEvent.click(await screen.findByRole('button', { name: /Yangilash/i }));

    await waitFor(() =>
      expect(vi.mocked(reportsApi.getSalesReport).mock.calls.length).toBeGreaterThan(1)
    );
    expect(vi.mocked(reportsApi.getDebtsReport).mock.calls.length).toBeGreaterThan(1);
  });
});
