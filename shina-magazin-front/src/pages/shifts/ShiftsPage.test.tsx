import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import type { CashShift, PagedResponse, ZReport } from '../../types';

vi.mock('../../api/shifts.api', () => ({
  shiftsApi: {
    getCurrent: vi.fn(),
    getAll: vi.fn(),
    open: vi.fn(),
    close: vi.fn(),
    getReport: vi.fn(),
  },
}));
vi.mock('../../api/settings.api', () => ({
  settingsApi: { get: vi.fn() },
}));

import { shiftsApi } from '../../api/shifts.api';
import { settingsApi } from '../../api/settings.api';
import { ShiftsPage } from './ShiftsPage';
import { configureQueryDefaults } from '../../lib/queryConfig';
import { useAuthStore } from '../../store/authStore';
import { PermissionCode } from '../../hooks/usePermission';

/**
 * Kassa smenalari — xarakteristik testlar.
 *
 * <p>Smenani yopish KAMOMAD yozuvini yaratadi: kassir sanagan naqd bilan
 * kutilgan summa taqqoslanadi va farq xodimga yoziladi. Bu yerdagi xato
 * odamning pulига tegadi, shuning uchun yuboriladigan summa aniq
 * qulflanadi.
 */

const OPEN_SHIFT: CashShift = {
  id: 5,
  openingFloat: 200_000,
  openedAt: '2026-06-10T09:00:00',
  status: 'OPEN',
  cashierName: 'Anvar Qodirov',
} as unknown as CashShift;

/** Kamomadli smena: sanalgan 1 450 000, kutilgan 1 500 000. */
const Z_REPORT: ZReport = {
  shift: { ...OPEN_SHIFT, status: 'CLOSED', openedByName: 'Anvar Qodirov' },
  salesCount: 12,
  cancelledCount: 0,
  grossTotal: 1_300_000,
  debtIssued: 0,
  byPaymentMethod: [],
  openingFloat: 200_000,
  cashReceived: 1_300_000,
  cashRefunded: 0,
  returnsCount: 0,
  cashExpenses: 0,
  countedCash: 1_450_000,
  expectedCash: 1_500_000,
  difference: -50_000,
} as unknown as ZReport;

function pageOf(content: CashShift[]): PagedResponse<CashShift> {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: 1,
    first: true,
    last: true,
  } as PagedResponse<CashShift>;
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  configureQueryDefaults(qc);
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  render(<ShiftsPage />, { wrapper: Wrapper });
  return qc;
}

describe('ShiftsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    window.print = vi.fn();
    // Ochish/yopish tugmalari SHIFTS_MANAGE ruxsati ortida
    useAuthStore.setState({ permissions: new Set([PermissionCode.SHIFTS_MANAGE]) });

    vi.mocked(shiftsApi.getCurrent).mockResolvedValue(OPEN_SHIFT);
    vi.mocked(shiftsApi.getAll).mockResolvedValue(pageOf([]));
    vi.mocked(shiftsApi.open).mockResolvedValue(OPEN_SHIFT);
    vi.mocked(shiftsApi.close).mockResolvedValue(Z_REPORT);
    vi.mocked(settingsApi.get).mockResolvedValue({} as never);
  });

  it('joriy smena va tarixni yuklaydi', async () => {
    renderPage();

    await waitFor(() => expect(shiftsApi.getCurrent).toHaveBeenCalled());
    expect(shiftsApi.getAll).toHaveBeenCalled();
    expect(await screen.findByText(/Boshlang'ich qoldiq/i)).toBeInTheDocument();
  });

  /**
   * ENG MUHIM TEST: yopishda yuboriladigan summa.
   *
   * <p>Server aynan shu raqamni kutilgan naqd bilan taqqoslaydi va farqni
   * kassirga yozadi. Noto'g'ri qiymat — odamga asossiz kamomad.
   */
  it('yopishda sanalgan naqd va izoh yuboriladi', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /^Smenani yopish$/i }));

    fireEvent.change(await screen.findByLabelText(/Sanalgan naqd/i), {
      target: { value: '1450000' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Yopish va Z-hisobot/i }));

    await waitFor(() => expect(shiftsApi.close).toHaveBeenCalled());
    expect(shiftsApi.close).toHaveBeenCalledWith(1_450_000, undefined);
  });

  /**
   * Kutilgan naqd yopish oynasida KO'RSATILMAYDI.
   *
   * <p>Bu ataylab qo'yilgan nazorat: kassir pulni mustaqil sanashi kerak.
   * Kutilgan summa ekranda tursa, uni ko'chirib yozib qo'yish mumkin va
   * kamomad umuman aniqlanmay qoladi — ya'ni smena yopish marosimga
   * aylanadi.
   */
  it('yopish oynasida kutilgan naqd ko\'rsatilmaydi', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /^Smenani yopish$/i }));
    await screen.findByLabelText(/Sanalgan naqd/i);

    expect(screen.queryByText(/Kutilgan naqd/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/1[\s ]?500[\s ]?000/)).not.toBeInTheDocument();
  });

  /**
   * Yopilgach Z-hisobot va KAMOMAD ko'rsatiladi.
   *
   * <p>Farq ekranda ochiq aytilishi kerak: kassir ham, rahbar ham uni
   * o'sha zahoti ko'rsin. Jimgina yopilgan smena kamomadni faqat
   * hisobotdan topiladigan qilib qo'yardi.
   */
  it('yopilgandan keyin Z-hisobot va kamomad ko\'rsatiladi', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /^Smenani yopish$/i }));
    fireEvent.change(await screen.findByLabelText(/Sanalgan naqd/i), {
      target: { value: '1450000' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Yopish va Z-hisobot/i }));

    // "Z-HISOBOT" ikki joyda: xulosa kartochkasi va chop etiladigan varaq
    expect((await screen.findAllByText(/Z-HISOBOT/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Kamomad/i).length).toBeGreaterThan(0);
  });

  it('ochishda boshlang\'ich qoldiq yuboriladi', async () => {
    vi.mocked(shiftsApi.getCurrent).mockResolvedValue(null);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /^Smena ochish$/i }));
    fireEvent.change(await screen.findByLabelText(/Boshlang'ich qoldiq/i), {
      target: { value: '200000' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /^Smena ochish$/i }).at(-1)!);

    await waitFor(() => expect(shiftsApi.open).toHaveBeenCalledWith(200_000));
  });

  // Yopilgach ro'yxat va joriy smena qayta so'raladi — aks holda ekranda
  // yopilgan smena hali ham "ochiq" bo'lib turardi.
  it('yopilgandan keyin smenalar qayta so\'raladi', async () => {
    renderPage();
    await waitFor(() => expect(shiftsApi.getCurrent).toHaveBeenCalledTimes(1));

    fireEvent.click(await screen.findByRole('button', { name: /^Smenani yopish$/i }));
    fireEvent.change(await screen.findByLabelText(/Sanalgan naqd/i), {
      target: { value: '1450000' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Yopish va Z-hisobot/i }));

    await waitFor(() =>
      expect(vi.mocked(shiftsApi.getCurrent).mock.calls.length).toBeGreaterThan(1)
    );
  });
});
