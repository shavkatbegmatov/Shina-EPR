import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';

vi.mock('../../api/audit-logs.api', () => ({
  auditLogsApi: {
    searchAuditLogs: vi.fn(),
    searchGroupedAuditLogs: vi.fn(),
    exportAuditLogs: vi.fn(),
    getDetail: vi.fn(),
  },
}));

import { auditLogsApi } from '../../api/audit-logs.api';
import { AuditLogsPage } from './AuditLogsPage';
import { configureQueryDefaults } from '../../lib/queryConfig';

/**
 * Audit loglari — xarakteristik testlar.
 *
 * <p>Bu sahifa "kim nima qildi" degan savolga javob beradi va nizoli
 * holatda dalil sifatida ishlatiladi. Shuning uchun eng muhim xususiyat
 * — ko'rsatilgan o'zgarish AYNAN o'sha yozuvga tegishli bo'lishi.
 */

const LOG = {
  id: 11,
  entityType: 'Product',
  entityId: 7,
  action: 'UPDATE',
  username: 'kassir',
  ipAddress: '10.0.0.1',
  createdAt: '2026-06-10T10:00:00',
  description: 'Mahsulot narxi o\'zgartirildi',
};

function pageOf(content: unknown[]) {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: 1,
    first: true,
    last: true,
  };
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  configureQueryDefaults(qc);
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  render(<AuditLogsPage />, { wrapper: Wrapper });
  return qc;
}

describe('AuditLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();

    vi.mocked(auditLogsApi.searchGroupedAuditLogs).mockResolvedValue(pageOf([]) as never);
    vi.mocked(auditLogsApi.searchAuditLogs).mockResolvedValue(pageOf([LOG]) as never);
    vi.mocked(auditLogsApi.exportAuditLogs).mockResolvedValue(undefined as never);
    vi.mocked(auditLogsApi.getDetail).mockResolvedValue({
      fieldChanges: [{ field: 'sellingPrice', oldValue: '1000', newValue: '1200' }],
    } as never);
  });

  it('guruhlangan ko\'rinishda yuklanadi', async () => {
    renderPage();

    await waitFor(() => expect(auditLogsApi.searchGroupedAuditLogs).toHaveBeenCalled());
    expect(auditLogsApi.searchAuditLogs).not.toHaveBeenCalled();
  });

  /**
   * Qidiruv TUGMA bilan ishlaydi, har harfda emas.
   *
   * <p>Bu ataylab: audit jadvali eng katta jadvallardan biri va unda
   * matn bo'yicha qidiruv qimmat. Terish davomida so'rov yuborilsa,
   * har harf butun tarix bo'ylab skan qilardi.
   */
  it('matn terilganda so\'rov yubormaydi, faqat tugma bosilganda', async () => {
    renderPage();
    await waitFor(() => expect(auditLogsApi.searchGroupedAuditLogs).toHaveBeenCalledTimes(1));

    const input = await screen.findByPlaceholderText(/Username yoki IP/i);
    for (const term of ['k', 'ka', 'kas', 'kass', 'kassir']) {
      fireEvent.change(input, { target: { value: term } });
    }

    // Terish HECH QANDAY so'rov tug'dirmaydi
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(auditLogsApi.searchGroupedAuditLogs).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /^Qidirish$/i }));

    await waitFor(() =>
      expect(auditLogsApi.searchGroupedAuditLogs).toHaveBeenCalledWith(
        0, 20, undefined, undefined, undefined, 'kassir'
      )
    );
  });

  /**
   * Ko'rinish kalitga kiradi.
   *
   * <p>Guruhlangan va oddiy ko'rinish TURLI tuzilma qaytaradi. Kalitda
   * `mode` bo'lmasa ular bir kesh yozuvini bo'lishardi va ekranga
   * mos kelmaydigan ma'lumot tushardi.
   */
  it('ko\'rinish almashtirilganda o\'sha ko\'rinish so\'raladi', async () => {
    renderPage();
    await waitFor(() => expect(auditLogsApi.searchGroupedAuditLogs).toHaveBeenCalled());

    fireEvent.click(await screen.findByRole('button', { name: /^Oddiy$/i }));

    await waitFor(() => expect(auditLogsApi.searchAuditLogs).toHaveBeenCalled());
  });

  /**
   * ENG MUHIM TEST: yoyilgan qatorlar kesh bilan birga tozalanadi.
   *
   * <p>Yoyilgan qator va uning maydon o'zgarishlari LOG ID bo'yicha
   * saqlanadi. Ro'yxat almashganda (filtr, sahifa yoki ko'rinish) bu
   * kesh tozalanmasa, ochilgan qatorda BOSHQA yozuvning o'zgarishlari
   * ko'rinishi mumkin — audit jurnalida bu jimgina yolg'on dalil.
   */
  it('ko\'rinish almashganda maydon o\'zgarishlari keshi tozalanadi', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /^Oddiy$/i }));
    await waitFor(() => expect(auditLogsApi.searchAuditLogs).toHaveBeenCalled());

    // Qatorni yoyamiz — tafsilot yuklanadi va keshga tushadi
    const row = await screen.findByText('#11');
    fireEvent.click(row);
    await waitFor(() => expect(auditLogsApi.getDetail).toHaveBeenCalledWith(11));

    // Ko'rinishni almashtirib qaytamiz — kesh tozalangan bo'lishi kerak,
    // ya'ni qayta yoyilganda tafsilot QAYTA so'raladi.
    fireEvent.click(screen.getByRole('button', { name: /^Guruhlangan$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^Oddiy$/i }));

    fireEvent.click(await screen.findByText('#11'));

    await waitFor(() =>
      expect(vi.mocked(auditLogsApi.getDetail).mock.calls.length).toBeGreaterThan(1)
    );
  });

  // Eksport joriy filtrlar bilan ketadi — aks holda ekranda ko'rilgan
  // ro'yxat bilan yuklangan fayl mos kelmasdi.
  it('eksport joriy qidiruv bilan yuboriladi', async () => {
    renderPage();
    await waitFor(() => expect(auditLogsApi.searchGroupedAuditLogs).toHaveBeenCalled());

    // Eksport tugmasi ro'yxat bo'sh bo'lsa o'chirilgan — natijasi bor
    // oddiy ko'rinishga o'tamiz.
    fireEvent.click(await screen.findByRole('button', { name: /^Oddiy$/i }));
    await waitFor(() => expect(auditLogsApi.searchAuditLogs).toHaveBeenCalled());

    fireEvent.change(await screen.findByPlaceholderText(/Username yoki IP/i), {
      target: { value: 'kassir' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Qidirish$/i }));
    await waitFor(() =>
      expect(auditLogsApi.searchAuditLogs).toHaveBeenCalledTimes(2)
    );

    // Eksport tugmasi yangilanish tugamaguncha ham o'chirilgan bo'ladi
    const excelButton = screen.getByRole('button', { name: /Excel/i });
    await waitFor(() => expect(excelButton).toBeEnabled());
    fireEvent.click(excelButton);

    await waitFor(() =>
      expect(auditLogsApi.exportAuditLogs).toHaveBeenCalledWith(
        'excel',
        expect.objectContaining({ search: 'kassir' })
      )
    );
  });
});
