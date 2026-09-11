import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate, formatDateTime, formatForeign } from '../../config/constants';
import type { PurchaseOrder, ReceiptSettings } from '../../types';

/**
 * Kirim hujjati — A4 chop etish uchun.
 *
 * <p>Ta'minotchi yuk xati bilan BIR XIL tuzilma (raqam, sana, mashina,
 * qatorlar: soni / narx / jami / bonus, To'lov summa) — omborchi ikkita
 * qog'ozni yonma-yon qo'yib solishtiradi. Qabul qilingan hujjatda
 * "TEKSHIRILDI" muhri (kim, qachon) chiqadi — ta'minotchi hujjatidagi
 * muhr bilan bir xil ma'no.
 *
 * <p>Chop etish `window.print()` orqali; uslublar `index.css` dagi
 * `#document-print` bloki (nomlangan `@page a4doc` — kassa chekining 80mm
 * sahifasi bilan aralashmasin).
 */
export function PurchaseDocumentPrint({
  purchase,
  settings,
}: {
  purchase: PurchaseOrder;
  settings?: ReceiptSettings;
}) {
  const { t } = useTranslation();

  const shopName = settings?.receiptShopName?.trim();
  const shopPhone = settings?.receiptShopPhone?.trim();
  const shopAddress = settings?.receiptShopAddress?.trim();

  const foreign = purchase.currency && purchase.currency !== 'UZS';
  const currency = purchase.currency ?? 'UZS';
  const received = purchase.status === 'RECEIVED' || purchase.status === 'PARTIAL';
  const fmtDoc = (value: number) => (foreign ? formatForeign(value, currency) : formatCurrency(value));

  const items = purchase.items ?? [];
  const totalOrdered = items.reduce((sum, i) => sum + (i.orderedQuantity ?? i.quantity), 0);
  const totalReceived = items.reduce((sum, i) => sum + (i.receivedQuantity ?? 0), 0);
  const foreignGoods = foreign
    ? items.reduce((sum, i) => sum + (i.foreignUnitPrice ?? 0) * (received ? i.receivedQuantity : i.orderedQuantity ?? i.quantity), 0)
    : purchase.goodsAmount;
  const foreignBonus = foreign ? purchase.bonusAmount / (purchase.exchangeRate || 1) : purchase.bonusAmount;

  return (
    <div id="document-print" className="print-document">
      <header className="print-doc-header">
        <div>
          {shopName && <div className="print-doc-shop">{shopName}</div>}
          {shopAddress && <div className="print-doc-muted">{shopAddress}</div>}
          {shopPhone && <div className="print-doc-muted">{shopPhone}</div>}
        </div>
        <div className="print-doc-title-block">
          <div className="print-doc-title">{t('erp.purchaseDoc.title')}</div>
          <div>
            {t('erp.purchaseDoc.number')} <strong>{purchase.orderNumber}</strong>
          </div>
          <div>
            {t('erp.purchaseDoc.date')}: {formatDate(purchase.orderDate)}
          </div>
        </div>
      </header>

      <table className="print-doc-meta">
        <tbody>
          <tr>
            <th>{t('erp.purchaseDoc.supplier')}</th>
            <td>{purchase.supplierName}</td>
            <th>{t('erp.purchaseDoc.supplierDoc')}</th>
            <td>
              {purchase.supplierDocNumber ?? '—'}
              {purchase.supplierDocDate && ` (${formatDate(purchase.supplierDocDate)})`}
            </td>
          </tr>
          <tr>
            <th>{t('erp.purchaseDoc.vehicle')}</th>
            <td>{purchase.vehicleNumber ?? '—'}</td>
            <th>{t('erp.purchaseDoc.currency')}</th>
            <td>
              {currency}
              {foreign && ` · ${t('erp.purchaseDoc.rate')} ${formatCurrency(purchase.exchangeRate)}`}
            </td>
          </tr>
          <tr>
            <th>{t('erp.purchaseDoc.transport')}</th>
            <td>{purchase.transportCost > 0 ? formatCurrency(purchase.transportCost) : '—'}</td>
            <th>{t('erp.purchaseDoc.createdBy')}</th>
            <td>{purchase.createdByName}</td>
          </tr>
        </tbody>
      </table>

      <table className="print-doc-items">
        <thead>
          <tr>
            <th>{t('erp.purchaseDoc.colNo')}</th>
            <th className="print-doc-left">{t('erp.purchaseDoc.colProduct')}</th>
            <th>{t('erp.purchaseDoc.colOrdered')}</th>
            <th>{t('erp.purchaseDoc.colReceived')}</th>
            <th>{t('erp.purchaseDoc.colPrice')}</th>
            <th>{t('erp.purchaseDoc.colTotal')}</th>
            <th>{t('erp.purchaseDoc.colBonus')}</th>
            {foreign && <th>{t('erp.purchaseDoc.colTotalUzs')}</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const qty = received ? item.receivedQuantity : item.orderedQuantity ?? item.quantity;
            const price = foreign ? item.foreignUnitPrice ?? 0 : item.unitPrice;
            const lineTotal = foreign ? price * qty : item.totalPrice;
            const lineBonus = foreign
              ? item.bonusAmount / (purchase.exchangeRate || 1)
              : item.bonusAmount;
            return (
              <tr key={item.id ?? index}>
                <td>{index + 1}</td>
                <td className="print-doc-left">
                  {item.productName}
                  {item.sizeString && <span className="print-doc-muted"> {item.sizeString}</span>}
                </td>
                <td>{item.orderedQuantity ?? item.quantity}</td>
                <td>{received ? item.receivedQuantity : '—'}</td>
                <td>{fmtDoc(price)}</td>
                <td>{fmtDoc(lineTotal)}</td>
                <td>{lineBonus > 0 ? fmtDoc(lineBonus) : '—'}</td>
                {foreign && <td>{formatCurrency(item.totalPrice - item.bonusAmount)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>

      <section className="print-doc-totals">
        <table>
          <tbody>
            <tr>
              <th>{t('erp.purchaseDoc.totalQty')}</th>
              <td>
                {received ? totalReceived : totalOrdered}
                {received && totalReceived !== totalOrdered && ` / ${totalOrdered}`}
              </td>
            </tr>
            <tr>
              <th>{t('erp.purchaseDoc.goods')}</th>
              <td>{fmtDoc(foreignGoods)}</td>
            </tr>
            {purchase.bonusAmount > 0 && (
              <tr>
                <th>{t('erp.purchaseDoc.bonus')}</th>
                <td>−{fmtDoc(foreignBonus)}</td>
              </tr>
            )}
            <tr className="print-doc-total">
              <th>{t('erp.purchaseDoc.payable')}</th>
              <td>
                {foreign && purchase.foreignTotalAmount != null
                  ? formatForeign(purchase.foreignTotalAmount, currency)
                  : formatCurrency(purchase.totalAmount)}
                {foreign && (
                  <span className="print-doc-muted"> ({formatCurrency(purchase.totalAmount)})</span>
                )}
              </td>
            </tr>
            <tr>
              <th>{t('erp.purchaseDoc.paid')}</th>
              <td>{formatCurrency(purchase.paidAmount)}</td>
            </tr>
            <tr>
              <th>{t('erp.purchaseDoc.debt')}</th>
              <td>{formatCurrency(purchase.debtAmount)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {purchase.notes && (
        <p className="print-doc-notes">
          <strong>{t('erp.purchaseDoc.notes')}:</strong> {purchase.notes}
        </p>
      )}

      <footer className="print-doc-footer">
        <div className="print-doc-sign">
          <div>{t('erp.purchaseDoc.createdBy')}: {purchase.createdByName}</div>
          <div className="print-doc-line">{t('erp.purchaseDoc.signature')}</div>
        </div>
        <div className="print-doc-sign">
          <div>
            {t('erp.purchaseDoc.receivedBy')}: {purchase.receivedByName ?? '________________'}
          </div>
          <div className="print-doc-line">{t('erp.purchaseDoc.signature')}</div>
        </div>
        <div className={received ? 'print-doc-stamp' : 'print-doc-stamp print-doc-stamp-muted'}>
          <div>{received ? t('erp.purchaseDoc.stamp') : t('erp.purchaseDoc.notReceived')}</div>
          {received && purchase.receivedAt && (
            <div className="print-doc-stamp-date">{formatDateTime(purchase.receivedAt)}</div>
          )}
        </div>
      </footer>
    </div>
  );
}
