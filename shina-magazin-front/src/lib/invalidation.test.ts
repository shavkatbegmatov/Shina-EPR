import { describe, it, expect } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { invalidateAfter } from './invalidation';

/**
 * Har hodisa qaysi domenlarni eskirtirishi.
 *
 * <p>Testlar "chaqirildimi" emas, keshning HOLATINI tekshiradi: har domen
 * uchun soxta yozuv qo'yiladi va hodisadan keyin uning `isInvalidated`
 * bo'lishi talab qilinadi. Shu bilan prefiks xatosi ham tutiladi.
 */

/** Har domenga bittadan yozuv qo'yadi va mijozni qaytaradi. */
function seededClient() {
  const client = new QueryClient();
  for (const domain of Object.keys(queryKeys) as Array<keyof typeof queryKeys>) {
    client.setQueryData(queryKeys[domain].all, { seeded: true });
  }
  return client;
}

function invalidatedDomains(client: QueryClient): string[] {
  return (Object.keys(queryKeys) as Array<keyof typeof queryKeys>).filter(
    (domain) => client.getQueryState(queryKeys[domain].all)?.isInvalidated
  );
}

describe('invalidateAfter', () => {
  /**
   * Savdo zaxirani kamaytiradi, qarz yozuvi yaratadi va mijoz balansini
   * o'zgartiradi — uchalasi ham ekranda ko'rinadi.
   */
  it('savdo: zaxira, qarz, mijoz va hisobotlar eskiradi', () => {
    const client = seededClient();

    invalidateAfter.sale(client);

    expect(invalidatedDomains(client).sort()).toEqual(
      ['customers', 'dashboard', 'debts', 'products', 'reports', 'sales', 'warehouse'].sort()
    );
  });

  // Qaytarish tovarni zaxiraga QAYTARADI va qarzni kamaytiradi.
  it('qaytarish savdo bilan bir xil tarmoqni eskirtiradi', () => {
    const saleClient = seededClient();
    const returnClient = seededClient();

    invalidateAfter.sale(saleClient);
    invalidateAfter.saleReturn(returnClient);

    expect(invalidatedDomains(returnClient).sort()).toEqual(
      invalidatedDomains(saleClient).sort()
    );
  });

  /**
   * Xarid zaxirani oshiradi VA mahsulotning xarid narxini yangilaydi.
   *
   * <p>Ilgari Ta'minotchilar oynasidan qilingan xarid omborni va
   * mahsulotlarni bekor qilmasdi — ro'yxat eski qoldiqni ko'rsatardi.
   */
  it('xarid: ombor, mahsulot, ta\'minotchi va hisobotlar eskiradi', () => {
    const client = seededClient();

    invalidateAfter.purchase(client);

    expect(invalidatedDomains(client).sort()).toEqual(
      ['dashboard', 'products', 'purchases', 'reports', 'suppliers', 'warehouse'].sort()
    );
  });

  it('ombor harakati: ombor, mahsulot va hisobotlar eskiradi', () => {
    const client = seededClient();

    invalidateAfter.stockMovement(client);

    expect(invalidatedDomains(client).sort()).toEqual(
      ['dashboard', 'products', 'reports', 'warehouse'].sort()
    );
  });

  it('xarajat: xarajat, smena va hisobotlar eskiradi', () => {
    const client = seededClient();

    invalidateAfter.expense(client);

    expect(invalidatedDomains(client).sort()).toEqual(
      ['dashboard', 'expenses', 'reports', 'shifts'].sort()
    );
  });

  /**
   * Bekor qilish PREFIKS bo'yicha ishlaydi.
   *
   * <p>Domen ildizi emas, ost-kalitlar ham eskirishi kerak — aks holda
   * sahifalangan ro'yxat eski holicha qolardi.
   */
  it('ost-kalitlarga ham tarqaladi', () => {
    const client = new QueryClient();
    const listKey = queryKeys.products.list({ page: 0, size: 20 });
    const searchKey = queryKeys.products.search('mich');
    client.setQueryData(listKey, { seeded: true });
    client.setQueryData(searchKey, { seeded: true });

    invalidateAfter.stockMovement(client);

    expect(client.getQueryState(listKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(searchKey)?.isInvalidated).toBe(true);
  });
});
