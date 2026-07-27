import { describe, it, expect } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { configureQueryDefaults, staleTime } from './queryConfig';

function client() {
  const qc = new QueryClient();
  configureQueryDefaults(qc);
  return qc;
}

describe('configureQueryDefaults', () => {
  it("har bir domenga muddat qo'yadi", () => {
    const qc = client();

    // `queryKeys` ga yangi domen qo'shilib, muddati unutilsa shu test yiqiladi.
    for (const domain of Object.keys(queryKeys) as Array<keyof typeof queryKeys>) {
      const defaults = qc.getQueryDefaults(queryKeys[domain].all);
      expect(defaults.staleTime, `${domain} domeni uchun staleTime yo'q`).toBeTypeOf('number');
    }
  });

  it('muddat PREFIKS bo\'yicha ost-kalitlarga ham tarqaladi', () => {
    const qc = client();

    // Asosiy da'vo: sahifalarda `staleTime` yozilmagan, lekin sahifalangan va
    // filtrlangan kalitlar ham domen muddatini oladi.
    expect(qc.getQueryDefaults(queryKeys.brands.list()).staleTime).toBe(staleTime.reference);
    expect(qc.getQueryDefaults(queryKeys.categories.attributes(7)).staleTime)
      .toBe(staleTime.reference);
    expect(qc.getQueryDefaults(queryKeys.sales.list({ page: 0, size: 20 })).staleTime)
      .toBe(staleTime.transactional);
    expect(qc.getQueryDefaults(queryKeys.reports.profitLoss({ start: 'a', end: 'b' })).staleTime)
      .toBe(staleTime.reports);
  });

  it('zaxiraga bog\'liq so\'rovlarni keshlamaydi', () => {
    const qc = client();

    // Eskirgan qoldiq kassirni yo'q tovarni sotishga undaydi — bu kalitlar
    // har mount'da qayta so'ralishi SHART.
    expect(qc.getQueryDefaults(queryKeys.products.search('mich')).staleTime).toBe(0);
    expect(qc.getQueryDefaults(queryKeys.products.list({ page: 0, size: 20 })).staleTime).toBe(0);
    expect(qc.getQueryDefaults(queryKeys.products.detail(3)).staleTime).toBe(0);
    expect(qc.getQueryDefaults(queryKeys.warehouse.stats()).staleTime).toBe(0);
    expect(qc.getQueryDefaults(queryKeys.warehouse.lowStock()).staleTime).toBe(0);
    expect(qc.getQueryDefaults(queryKeys.warehouse.movements({ page: 0, size: 20 })).staleTime)
      .toBe(0);
  });

  it('gcTime har doim staleTime dan katta', () => {
    const qc = client();

    // Aks holda kesh muddat tugashidan oldin tozalanadi va uzun `staleTime`
    // amalda ishlamay qoladi.
    for (const domain of Object.keys(queryKeys) as Array<keyof typeof queryKeys>) {
      const { staleTime: stale, gcTime } = qc.getQueryDefaults(queryKeys[domain].all);
      expect(gcTime, `${domain} domeni uchun gcTime yo'q`).toBeTypeOf('number');
      expect(gcTime as number, `${domain}: gcTime <= staleTime`).toBeGreaterThan(stale as number);
    }
  });

  it('sahifadagi ochiq qiymat ustun turadi', () => {
    const qc = client();

    // Alohida holat kerak bo'lsa sahifa o'zi yozib keta olishi kerak.
    const options = qc.defaultQueryOptions({
      queryKey: queryKeys.brands.list(),
      staleTime: 0,
    });

    expect(options.staleTime).toBe(0);
  });

  it('do\'kon vitrinasi kalitlariga tegmaydi', () => {
    const qc = client();

    // Vitrina o'z kalitlarida ishlaydi (`['catalog']`, `['shop-orders']`) —
    // ERP muddatlari ularga tasodifan tushib qolmasligi kerak.
    expect(qc.getQueryDefaults(['catalog']).staleTime).toBeUndefined();
    expect(qc.getQueryDefaults(['shop-orders']).staleTime).toBeUndefined();
    expect(qc.getQueryDefaults(['public-settings']).staleTime).toBeUndefined();
  });
});
