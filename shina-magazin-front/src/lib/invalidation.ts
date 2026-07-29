/**
 * Domen hodisasidan keyin nima eskirishi.
 *
 * <p>Ilgari bu bilim har sahifada qaytadan yozilardi va TABIIY ravishda
 * ajralib ketdi: masalan xarid Xaridlar sahifasida omborni bekor qilardi,
 * xuddi shu xarid Ta'minotchilar oynasidan qilinsa — YO'Q. Natijada
 * mahsulot ro'yxati eski qoldiqni ko'rsatib turardi.
 *
 * <p>Bu yerda har hodisa uchun ro'yxat BIR MARTA yozilgan. Yangi sahifa
 * qo'shilganda u ro'yxatni qayta o'ylab topmaydi — shunchaki mos
 * funksiyani chaqiradi.
 *
 * <p>Ortiqcha bekor qilishdan qo'rqmaslik kerak: ochiq so'rov bo'lmasa
 * invalidatsiya faqat keshni "eski" deb belgilaydi va HECH QANDAY so'rov
 * yubormaydi. Yetishmayotgan invalidatsiyaning narxi esa — ekranda
 * noto'g'ri raqam.
 */

import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

type Domain = readonly unknown[];

function invalidate(client: QueryClient, domains: Domain[]): void {
  for (const queryKey of domains) {
    void client.invalidateQueries({ queryKey });
  }
}

export const invalidateAfter = {
  /**
   * Savdo yaratildi.
   *
   * <p>Server: zaxirani kamaytiradi, qarzga sotilgan bo'lsa qarz yozuvi
   * yaratadi va mijoz balansini o'zgartiradi.
   */
  sale: (client: QueryClient) =>
    invalidate(client, [
      queryKeys.sales.all,
      queryKeys.debts.all,
      queryKeys.customers.all,
      queryKeys.products.all,
      queryKeys.warehouse.all,
      queryKeys.reports.all,
      queryKeys.dashboard.all,
    ]),

  /**
   * Savdo qaytarildi.
   *
   * <p>Server: tovarni zaxiraga QAYTARADI, qarzni kamaytiradi va mijoz
   * balansini tuzatadi — ya'ni savdo bilan bir xil tarmoq eskiradi.
   */
  saleReturn: (client: QueryClient) =>
    invalidate(client, [
      queryKeys.sales.all,
      queryKeys.debts.all,
      queryKeys.customers.all,
      queryKeys.products.all,
      queryKeys.warehouse.all,
      queryKeys.reports.all,
      queryKeys.dashboard.all,
    ]),

  /**
   * Xarid yaratildi yoki to'lov qilindi.
   *
   * <p>Server: zaxirani oshiradi, mahsulotning XARID NARXINI yangilaydi
   * (u tannarx sifatida foyda hisobiga kiradi) va ta'minotchi balansini
   * o'zgartiradi.
   */
  purchase: (client: QueryClient) =>
    invalidate(client, [
      queryKeys.purchases.all,
      queryKeys.suppliers.all,
      queryKeys.products.all,
      queryKeys.warehouse.all,
      queryKeys.reports.all,
      queryKeys.dashboard.all,
    ]),

  /**
   * Ombor kirimi, chiqimi yoki tuzatishi.
   *
   * <p>Mahsulot qoldig'i o'zgaradi — uni POS va Mahsulotlar sahifasi ham
   * ko'rsatadi.
   */
  stockMovement: (client: QueryClient) =>
    invalidate(client, [
      queryKeys.warehouse.all,
      queryKeys.products.all,
      queryKeys.reports.all,
      queryKeys.dashboard.all,
    ]),

  /**
   * Xarajat yozildi.
   *
   * <p>P&L dagi sof foydaga bevosita kiradi; naqd bo'lsa smenaning
   * kutilgan kassasini o'zgartiradi.
   */
  expense: (client: QueryClient) =>
    invalidate(client, [
      queryKeys.expenses.all,
      queryKeys.shifts.all,
      queryKeys.reports.all,
      queryKeys.dashboard.all,
    ]),
} as const;
