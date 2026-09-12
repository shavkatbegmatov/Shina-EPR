import { useCallback, useEffect, useRef, useState } from 'react';
import { settingsApi } from '../../api/settings.api';
import type { PurchaseOrder, ReceiptSettings } from '../../types';
import { PurchaseDocumentPrint } from './PurchaseDocumentPrint';

/**
 * Kirim hujjatini chop etish — kassa cheki (`useSaleReceipt`) bilan bir xil
 * mexanizm: hujjat DOM'da yashirin turadi, `@media print` da faqat u
 * qoladi. Alohida oyna yoki iframe kerak emas.
 *
 * <pre>
 *   const { printDocument, document } = usePurchaseDocument();
 *   ...
 *   printDocument(purchase);
 *   return (&lt;&gt;{...sahifa}{document}&lt;/&gt;);
 * </pre>
 */
export function usePurchaseDocument() {
  const [purchase, setPurchase] = useState<PurchaseOrder | null>(null);
  const [settings, setSettings] = useState<ReceiptSettings>();
  const pendingPrint = useRef(false);

  // Do'kon rekvizitlari OMMAVIY sozlamalardan (kassa cheki bilan bir xil manba;
  // to'liq /v1/settings SETTINGS_VIEW talab qiladi). Xato bo'lsa hujjat
  // sarlavhasiz chiqadi — chop eta olmaslikdan ko'ra shunisi yaxshi.
  useEffect(() => {
    let cancelled = false;
    settingsApi
      .getPublic()
      .then((data) => {
        if (!cancelled) setSettings(data);
      })
      .catch(() => {
        /* sarlavhasiz hujjat — chop etish baribir ishlaydi */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Hujjatni DOM'ga qo'ygandan KEYIN chop etamiz (ikki rAF: React commit +
  // brauzer chizishi). Darhol window.print() bo'sh sahifa berishi mumkin.
  useEffect(() => {
    if (!purchase || !pendingPrint.current) return;

    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        pendingPrint.current = false;
        window.print();
      })
    );
    return () => cancelAnimationFrame(frame);
  }, [purchase]);

  const printDocument = useCallback((next: PurchaseOrder) => {
    pendingPrint.current = true;
    setPurchase(next);
  }, []);

  return {
    printDocument,
    /** Sahifaga qo'shiladigan yashirin hujjat tuguni. */
    document: purchase ? <PurchaseDocumentPrint purchase={purchase} settings={settings} /> : null,
  };
}
