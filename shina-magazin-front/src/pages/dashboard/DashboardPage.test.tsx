import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import i18n from '../../i18n';
import type { ChartData, DashboardStats } from '../../types';

vi.mock('../../api/dashboard.api', () => ({
  dashboardApi: { getStats: vi.fn(), getChartData: vi.fn() },
}));

import { dashboardApi } from '../../api/dashboard.api';
import { DashboardPage } from './DashboardPage';
import { configureQueryDefaults } from '../../lib/queryConfig';

/**
 * Boshqaruv paneli — xarakteristik testlar.
 *
 * <p>Bu ilovaning BIRINCHI ekrani. Uning ikki xususiyati muhim: grafik
 * davri kalitga kirishi (aks holda 7 va 30 kunlik ma'lumot bir-birining
 * ustiga yozilardi) va matnlar tilga bo'ysunishi.
 */

const STATS: DashboardStats = {
  todaySalesCount: 12,
  todayRevenue: 9_500_000,
  totalRevenue: 120_000_000,
  totalProducts: 48,
  totalStock: 310,
  lowStockCount: 3,
  totalCustomers: 27,
  totalDebt: 4_000_000,
};

const CHART: ChartData = {
  salesTrend: [{ date: '2026-06-01', revenue: 1_000_000, count: 2 }],
  topProducts: [{ name: 'Michelin Primacy 4', revenue: 3_000_000, quantity: 3 }],
  paymentMethods: [{ method: 'CASH', amount: 5_000_000, count: 4 }],
  categorySales: [{ category: 'Shinalar', revenue: 8_000_000, quantity: 9 }],
  weekdaySales: [{ weekday: 'Mon', revenue: 2_000_000, count: 3 }],
  hourlySales: [{ hour: 10, revenue: 500_000, count: 1 }],
  thisWeekRevenue: 9_000_000,
  lastWeekRevenue: 8_000_000,
  thisMonthRevenue: 30_000_000,
  lastMonthRevenue: 28_000_000,
  revenueGrowthPercent: 12.5,
  salesGrowthPercent: 8,
} as unknown as ChartData;

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  configureQueryDefaults(qc);
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  render(<DashboardPage />, { wrapper: Wrapper });
  return qc;
}

describe('DashboardPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    await i18n.changeLanguage('uz');

    vi.mocked(dashboardApi.getStats).mockResolvedValue(STATS);
    vi.mocked(dashboardApi.getChartData).mockResolvedValue(CHART);
  });

  it('statistika va grafikni yuklaydi', async () => {
    renderPage();

    await waitFor(() => expect(dashboardApi.getStats).toHaveBeenCalled());
    // Sukut bo'yicha 30 kunlik davr
    expect(dashboardApi.getChartData).toHaveBeenCalledWith(30);
  });

  /**
   * Davr KALITGA kiradi.
   *
   * <p>Aks holda 7 va 30 kunlik javob bir kesh yozuviga tushib, davrni
   * almashtirgan foydalanuvchi boshqa davrning grafigini ko'rardi.
   */
  it('davr almashtirilganda o\'sha davr uchun so\'rov ketadi', async () => {
    renderPage();
    await waitFor(() => expect(dashboardApi.getChartData).toHaveBeenCalledWith(30));

    fireEvent.click(await screen.findByRole('button', { name: /7 kun|7 дн/i }));

    await waitFor(() => expect(dashboardApi.getChartData).toHaveBeenCalledWith(7));
  });

  // Bir marta ko'rilgan davr KESHDAN keladi — qayta so'rov yubormaydi.
  it('avval ko\'rilgan davrga qaytganda qayta so\'ramaydi', async () => {
    renderPage();
    await waitFor(() => expect(dashboardApi.getChartData).toHaveBeenCalledWith(30));

    fireEvent.click(await screen.findByRole('button', { name: /7 kun|7 дн/i }));
    await waitFor(() => expect(dashboardApi.getChartData).toHaveBeenCalledWith(7));

    fireEvent.click(screen.getByRole('button', { name: /30 kun|30 дн/i }));

    // 30 kunlik so'rov hali ham AYNAN bir marta
    const thirtyDayCalls = vi
      .mocked(dashboardApi.getChartData)
      .mock.calls.filter(([days]) => days === 30);
    expect(thirtyDayCalls).toHaveLength(1);
  });

  /**
   * Matnlar TILGA bo'ysunadi.
   *
   * <p>Ilova ikki tilli (uz/ru), lekin bu sahifada matnlar kodga qattiq
   * yozilgan edi — rus tilini tanlagan foydalanuvchi birinchi ekranda
   * o'zbekcha sarlavhalarni ko'rardi.
   */
  it('rus tilida ruscha sarlavhalarni ko\'rsatadi', async () => {
    await i18n.changeLanguage('ru');
    renderPage();

    await waitFor(() => expect(dashboardApi.getStats).toHaveBeenCalled());

    // "Продажи за сегодня" ikki joyda: KPI kartochkasi va soatlik grafik
    // sarlavhasi ("...(по часам)").
    expect((await screen.findAllByText(/Продажи за сегодня/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/Панель управления/i)).toBeInTheDocument();

    // Asosiy da'vo: o'zbekcha matn QOLMASLIGI kerak.
    expect(screen.queryByText(/Bugungi sotuvlar/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Kategoriyalar bo/i)).not.toBeInTheDocument();
  });
});
