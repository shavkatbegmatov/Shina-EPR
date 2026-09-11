import { describe, expect, it } from 'vitest';
import {
  THOUSANDS_SEPARATOR,
  formatAmount,
  formatCurrency,
  formatForeign,
  formatNumber,
} from './constants';

/**
 * Ming ajratkichi brauzer ICU/CLDR versiyasiga bog'liq bo'lmasligi kerak:
 * uz-UZ uchun `Intl` bir brauzerda vergul, boshqasida bo'sh joy berardi va
 * bitta sahifada summa (`formatCurrency`) bilan kiritish maydoni
 * (`CurrencyInput`) har xil ko'rinardi. Endi hammasi U+00A0 bilan.
 */
describe('formatAmount / formatCurrency / formatForeign', () => {
  const nb = THOUSANDS_SEPARATOR;

  it('ming ajratkichi uzilmaydigan bo\'sh joy, vergul yoki oddiy bo\'sh joy emas', () => {
    expect(nb).toBe(' ');
    expect(formatAmount(2_760_000)).toBe(`2${nb}760${nb}000`);
    expect(formatAmount(2_760_000)).not.toContain(',');
    expect(formatAmount(2_760_000)).not.toContain(' ');
  });

  it('so\'m: butun son, qo\'shimcha bilan', () => {
    expect(formatCurrency(150_000)).toBe(`150${nb}000 so'm`);
    expect(formatCurrency(999)).toBe("999 so'm");
    expect(formatCurrency(0)).toBe("0 so'm");
    expect(formatCurrency(-406_400)).toBe(`-406${nb}400 so'm`);
    // Kasr yaxlitlanadi — pul ustunlari so'mda butun
    expect(formatCurrency(751_416.67)).toBe(`751${nb}417 so'm`);
  });

  it('hujjat valyutasi: kasr faqat kerak bo\'lganda, nuqta bilan', () => {
    expect(formatForeign(46.25)).toBe('$46.25');
    expect(formatForeign(48.5)).toBe('$48.5');
    expect(formatForeign(5_296)).toBe(`$5${nb}296`);
    expect(formatForeign(1_508, 'EUR')).toBe(`1${nb}508 EUR`);
  });

  it('formatNumber: 3 xonagacha kasr, ming ajratkichi bir xil', () => {
    expect(formatNumber(1_234.5)).toBe(`1${nb}234.5`);
    expect(formatNumber(525)).toBe('525');
  });
});
