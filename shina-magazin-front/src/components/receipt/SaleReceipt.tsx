import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDateTime } from '../../config/constants';
import { enumLabel } from '@/shared/enumLabel';
import type { ReceiptSettings, Sale } from '../../types';

/**
 * Kassa cheki — 80mm termal printer uchun.
 *
 * <p>Chop etish `window.print()` orqali: alohida kutubxona yoki drayver kerak
 * emas, termal printerlar brauzerdan oddiy printer sifatida ishlaydi. Chop
 * etish uslublari `index.css` dagi `@media print` blokida — u shu komponentdan
 * boshqa hamma narsani yashiradi.
 *
 * <p>O'lchamlar `mm` da: piksel termal printerda kutilganidek chiqmaydi.
 * Shrift monospace — ustunlar (miqdor × narx) tekis turishi uchun.
 */
export function SaleReceipt({ sale, settings }: { sale: Sale; settings?: ReceiptSettings }) {
  const { t } = useTranslation();

  const shopName = settings?.receiptShopName?.trim();
  const shopPhone = settings?.receiptShopPhone?.trim();
  const shopAddress = settings?.receiptShopAddress?.trim();
  const footer = settings?.receiptFooter?.trim();

  return (
    <div id="receipt-print" className="receipt">
      <header className="receipt-center">
        {shopName && <div className="receipt-title">{shopName}</div>}
        {shopAddress && <div>{shopAddress}</div>}
        {shopPhone && <div>{shopPhone}</div>}
      </header>

      <hr className="receipt-rule" />

      <div className="receipt-row">
        <span>{t('erp.receipt.invoice')}</span>
        <span>{sale.invoiceNumber}</span>
      </div>
      <div className="receipt-row">
        <span>{t('erp.receipt.date')}</span>
        <span>{formatDateTime(sale.saleDate)}</span>
      </div>
      {sale.customerName && (
        <div className="receipt-row">
          <span>{t('erp.receipt.customer')}</span>
          <span>{sale.customerName}</span>
        </div>
      )}
      {sale.createdByName && (
        <div className="receipt-row">
          <span>{t('erp.receipt.cashier')}</span>
          <span>{sale.createdByName}</span>
        </div>
      )}

      <hr className="receipt-rule" />

      <table className="receipt-items">
        <tbody>
          {(sale.items ?? []).map((item, index) => (
            <tr key={item.id ?? `${item.productId}-${index}`}>
              <td colSpan={2} className="receipt-item-name">
                {item.productName ?? item.productSku}
                {item.sizeString && <span className="receipt-muted"> {item.sizeString}</span>}
                <div className="receipt-item-calc">
                  {item.quantity} × {formatCurrency(item.unitPrice)}
                  {item.discount > 0 && (
                    <span className="receipt-muted"> −{formatCurrency(item.discount)}</span>
                  )}
                  <span className="receipt-item-total">{formatCurrency(item.totalPrice)}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="receipt-rule" />

      <div className="receipt-row">
        <span>{t('erp.receipt.subtotal')}</span>
        <span>{formatCurrency(sale.subtotal)}</span>
      </div>
      {sale.discountAmount > 0 && (
        <div className="receipt-row">
          <span>{t('erp.receipt.discount')}</span>
          <span>−{formatCurrency(sale.discountAmount)}</span>
        </div>
      )}
      <div className="receipt-row receipt-total">
        <span>{t('erp.receipt.total')}</span>
        <span>{formatCurrency(sale.totalAmount)}</span>
      </div>
      <div className="receipt-row">
        <span>{t('erp.receipt.paid')}</span>
        <span>{formatCurrency(sale.paidAmount)}</span>
      </div>
      {sale.debtAmount > 0 && (
        <div className="receipt-row receipt-total">
          <span>{t('erp.receipt.debt')}</span>
          <span>{formatCurrency(sale.debtAmount)}</span>
        </div>
      )}
      <div className="receipt-row">
        <span>{t('erp.receipt.paymentMethod')}</span>
        <span>{enumLabel('paymentMethod', sale.paymentMethod)}</span>
      </div>

      {footer && (
        <>
          <hr className="receipt-rule" />
          <div className="receipt-center">{footer}</div>
        </>
      )}
    </div>
  );
}
