import { describe, expect, it } from 'vitest';
import { computePurchasePricing, toUzs } from './purchasePricing';

/**
 * Forma ko'rsatadigan raqamlar server yozadigani bilan BIR XIL bo'lishi
 * kerak — bu test backend `PurchasePricingTest` bilan bir xil hujjatni
 * ("LARGO TYRES GROUP": 8 × 40 $, 8 × 48,5 $, 1 $ bonus, kurs 12 700,
 * yo'l haqi 254 000) hisoblaydi va o'sha natijalarni kutadi.
 */
describe('computePurchasePricing', () => {
  it('USD hujjatni so\'mga qator darajasida aylantiradi', () => {
    const totals = computePurchasePricing('USD', 12_700, 254_000, [
      { key: 1, quantity: 8, unitPrice: 40, bonusPerUnit: 1, bonusPercent: 0 },
      { key: 2, quantity: 8, unitPrice: 48.5, bonusPerUnit: 1, bonusPercent: 0 },
    ]);

    expect(totals.totalQuantity).toBe(16);
    expect(totals.foreignGoods).toBe(708);
    expect(totals.foreignBonus).toBe(16);
    expect(totals.foreignTotalAmount).toBe(692);
    expect(totals.goodsAmount).toBe(8_991_600);
    expect(totals.bonusAmount).toBe(203_200);
    expect(totals.totalAmount).toBe(8_788_400);

    expect(totals.lines[0].unitPrice).toBe(508_000);
    expect(totals.lines[0].transportShare).toBe(127_000);
    expect(totals.lines[0].landedUnitCost).toBe(511_175);
    expect(totals.lines[1].landedUnitCost).toBe(619_125);
  });

  it('UZS hujjatda kurs e\'tiborga olinmaydi', () => {
    const totals = computePurchasePricing('UZS', 99_999, 0, [
      { key: 1, quantity: 10, unitPrice: 100_000, bonusPerUnit: 0, bonusPercent: 0 },
    ]);

    expect(totals.totalAmount).toBe(1_000_000);
    expect(totals.foreignTotalAmount).toBe(1_000_000);
    expect(totals.lines[0].landedUnitCost).toBe(100_000);
  });

  it('foizli bonus qator summasidan olinadi', () => {
    const totals = computePurchasePricing('UZS', 1, 0, [
      { key: 1, quantity: 10, unitPrice: 100_000, bonusPerUnit: 0, bonusPercent: 10 },
    ]);

    expect(totals.bonusAmount).toBe(100_000);
    expect(totals.totalAmount).toBe(900_000);
  });

  it('yo\'l haqi ulushlari yig\'indisi yo\'l haqiga teng', () => {
    const totals = computePurchasePricing('UZS', 1, 100, [
      { key: 1, quantity: 1, unitPrice: 1000, bonusPerUnit: 0, bonusPercent: 0 },
      { key: 2, quantity: 1, unitPrice: 1000, bonusPerUnit: 0, bonusPercent: 0 },
      { key: 3, quantity: 1, unitPrice: 1000, bonusPerUnit: 0, bonusPercent: 0 },
    ]);

    expect(totals.lines.map((l) => l.transportShare)).toEqual([33.33, 33.33, 33.34]);
  });

  it('toUzs butun so\'mgacha yaxlitlaydi', () => {
    expect(toUzs(692, 'USD', 12_700)).toBe(8_788_400);
    expect(toUzs(46.25, 'USD', 12_650)).toBe(585_063);
    expect(toUzs(1_000, 'UZS', 12_700)).toBe(1_000);
  });
});
