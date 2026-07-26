import { useCallback, useEffect, useRef, useState } from 'react';
import { settingsApi } from '../../api/settings.api';
import type { ReceiptSettings, Sale } from '../../types';
import { SaleReceipt } from './SaleReceipt';

/**
 * Kassa chekini chop etish.
 *
 * <p>Ishlatilishi:
 * <pre>
 *   const { printReceipt, receipt } = useSaleReceipt();
 *   ...
 *   printReceipt(sale);      // chek chiqadi
 *   return (&lt;&gt;{...sahifa}{receipt}&lt;/&gt;);
 * </pre>
 *
 * <p>Chek DOM'da doim turadi, lekin ekranda yashirin (`#receipt-print`
 * `display:none`). Chop etishda esa `@media print` boshqa hamma narsani
 * yashiradi. Shu sababli alohida oyna yoki iframe kerak emas — ular
 * pop-up bloklovchilar bilan muammo tug'dirardi.
 */
export function useSaleReceipt() {
  const [sale, setSale] = useState<Sale | null>(null);
  const [settings, setSettings] = useState<ReceiptSettings>();
  const pendingPrint = useRef(false);

  // Do'kon ma'lumotlari bir marta olinadi. Xato bo'lsa chek sarlavhasiz
  // chiqadi — savdoni chop eta olmaslikdan ko'ra shunisi yaxshi.
  useEffect(() => {
    let cancelled = false;
    settingsApi
      .get()
      .then((data) => {
        if (!cancelled) setSettings(data);
      })
      .catch(() => {
        /* sarlavhasiz chek — chop etish baribir ishlaydi */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Chekni DOM'ga qo'ygandan KEYIN chop etamiz. Ikki marta rAF: birinchisi
  // React commit'idan keyin, ikkinchisi brauzer chizib bo'lgach ishlaydi.
  // Darhol window.print() chaqirilsa bo'sh sahifa chiqishi mumkin.
  useEffect(() => {
    if (!sale || !pendingPrint.current) return;

    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        pendingPrint.current = false;
        window.print();
      })
    );
    return () => cancelAnimationFrame(frame);
  }, [sale]);

  const printReceipt = useCallback((next: Sale) => {
    pendingPrint.current = true;
    setSale(next);
  }, []);

  return {
    printReceipt,
    /** Sahifaga qo'shiladigan yashirin chek tuguni. */
    receipt: sale ? <SaleReceipt sale={sale} settings={settings} /> : null,
  };
}
