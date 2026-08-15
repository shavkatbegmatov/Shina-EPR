import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import '../../i18n';
import { ZReportPrint } from './ZReportPrint';
import type { ZReport } from '../../types';

/**
 * Z-hisobotning naqd qismi.
 *
 * <p>Kassa kamomadi aynan shu chek bo'yicha da'vo qilinadi. Kassadan chiqqan
 * pul (qaytarish, xarajat) chekda ko'rinmasa, kassirga o'zi qilmagan
 * kamomad yoziladi — shuning uchun chiqim qatorlari alohida qulflanadi.
 */

const BASE: ZReport = {
  shift: {
    id: 1,
    openedByName: 'Malika',
    openedAt: '2026-07-26T09:00:00',
    openingFloat: 100_000,
    status: 'CLOSED',
    closedByName: 'Malika',
    closedAt: '2026-07-26T21:00:00',
  },
  salesCount: 3,
  cancelledCount: 0,
  grossTotal: 500_000,
  debtIssued: 0,
  byPaymentMethod: [{ method: 'CASH', count: 3, total: 500_000, paid: 500_000 }],
  openingFloat: 100_000,
  cashReceived: 500_000,
  cashRefunded: 0,
  returnsCount: 0,
  cashDebtPayments: 0,
  debtPaymentsCount: 0,
  cashExpenses: 0,
  expensesCount: 0,
  expectedCash: 600_000,
};

describe('ZReportPrint', () => {
  it('naqd xarajat chiqim sifatida ko\'rsatiladi', () => {
    const { container } = render(
      <ZReportPrint
        report={{ ...BASE, cashExpenses: 80_000, expensesCount: 2, expectedCash: 520_000 }}
      />
    );

    expect(container.textContent).toContain('Naqd xarajatlar');
    // Minus belgisi muhim: bu kassaga QO'SHILGAN emas, undan CHIQQAN pul
    expect(container.textContent).toMatch(/−\s?80/);
    expect(container.textContent).toContain('(2)');
  });

  // Xarajatsiz smenada ortiqcha qator chekni chalkashtiradi.
  it('xarajat bo\'lmasa qator chiqmaydi', () => {
    const { container } = render(<ZReportPrint report={BASE} />);

    expect(container.textContent).not.toContain('Naqd xarajatlar');
  });

  // Karta bilan to'langan xarajat kassaga tegmaydi — `cashExpenses` nol
  // bo'lsa qator chiqmasligi kerak, garchi xarajat SONI noldan katta bo'lsa ham.
  it('faqat karta bilan to\'langan xarajat kassa qatorini chiqarmaydi', () => {
    const { container } = render(
      <ZReportPrint report={{ ...BASE, cashExpenses: 0, expensesCount: 1 }} />
    );

    expect(container.textContent).not.toContain('Naqd xarajatlar');
  });

  it('chop etish uslublari uchun #receipt-print id si bor', () => {
    const { container } = render(<ZReportPrint report={BASE} />);

    expect(container.querySelector('#receipt-print')).not.toBeNull();
  });
});
