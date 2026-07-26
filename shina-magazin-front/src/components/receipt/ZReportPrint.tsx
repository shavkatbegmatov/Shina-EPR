import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDateTime } from '../../config/constants';
import { enumLabel } from '@/shared/enumLabel';
import type { ReceiptSettings, ZReport } from '../../types';

/**
 * Z-hisobot chop etish ko'rinishi — chek bilan bir xil 80mm formatda.
 *
 * <p>`#receipt-print` id si ATAYLAB chek bilan bir xil: `@media print`
 * qoidalari shu id ga bog'langan (`index.css`). Ikkalasi hech qachon bir
 * vaqtda ko'rinmaydi — sahifada bittasi render qilinadi.
 */
export function ZReportPrint({ report, settings }: { report: ZReport; settings?: ReceiptSettings }) {
  const { t } = useTranslation();
  const shopName = settings?.receiptShopName?.trim();
  const { shift } = report;

  const row = (label: string, value: string, strong = false) => (
    <div className={strong ? 'receipt-row receipt-total' : 'receipt-row'}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );

  return (
    <div id="receipt-print" className="receipt">
      <header className="receipt-center">
        {shopName && <div className="receipt-title">{shopName}</div>}
        <div className="receipt-title">{t('erp.shifts.zReport')}</div>
      </header>

      <hr className="receipt-rule" />

      {row(t('erp.shifts.cashier'), shift.openedByName ?? '—')}
      {row(t('erp.shifts.openedAt'), formatDateTime(shift.openedAt))}
      {shift.closedAt && row(t('erp.shifts.closedAt'), formatDateTime(shift.closedAt))}

      <hr className="receipt-rule" />

      {row(t('erp.shifts.salesCount'), String(report.salesCount))}
      {report.cancelledCount > 0 && row(t('erp.shifts.cancelledCount'), String(report.cancelledCount))}
      {row(t('erp.shifts.grossTotal'), formatCurrency(report.grossTotal), true)}
      {report.debtIssued > 0 && row(t('erp.shifts.debtIssued'), formatCurrency(report.debtIssued))}

      <hr className="receipt-rule" />

      {report.byPaymentMethod.map((b) => (
        <div key={b.method} className="receipt-row">
          <span>
            {enumLabel('paymentMethod', b.method)} ({b.count})
          </span>
          <span>{formatCurrency(b.total)}</span>
        </div>
      ))}

      <hr className="receipt-rule" />

      {row(t('erp.shifts.openingFloat'), formatCurrency(report.openingFloat))}
      {row(t('erp.shifts.cashReceived'), formatCurrency(report.cashReceived))}
      {/* Qaytarishlar kassadan pul CHIQARADI — kutilgan summadan ayirilgan */}
      {report.cashRefunded > 0 &&
        row(
          `${t('erp.shifts.cashRefunded')} (${report.returnsCount})`,
          `−${formatCurrency(report.cashRefunded)}`
        )}
      {row(t('erp.shifts.expectedCash'), formatCurrency(report.expectedCash), true)}
      {report.countedCash != null && row(t('erp.shifts.countedCash'), formatCurrency(report.countedCash))}
      {report.difference != null &&
        row(
          report.difference < 0 ? t('erp.shifts.shortage') : t('erp.shifts.overage'),
          formatCurrency(Math.abs(report.difference)),
          true
        )}

      {shift.notes && (
        <>
          <hr className="receipt-rule" />
          <div>{shift.notes}</div>
        </>
      )}
    </div>
  );
}
