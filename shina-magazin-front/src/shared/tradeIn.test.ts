import { describe, expect, it } from 'vitest';
import { suggestResalePrice, usedTireSku } from './tradeIn';

describe('usedTireSku', () => {
  // Server (`UsedProductService.buildSku`) bilan bir xil kalit — kassir ko'rgan
  // "Ombor kartochkasi" bilan haqiqatda yaratilgan SKU farq qilmasin.
  it('brendsiz va brend bilan server kalitiga mos keladi', () => {
    expect(usedTireSku(205, 55, 16)).toBe('BU-205-55-R16');
    expect(usedTireSku(205, 55, 16, 'Michelin')).toBe('BU-205-55-R16-MICHELIN');
    expect(usedTireSku(205, 55, 16, ' Bridge stone ')).toBe('BU-205-55-R16-BRIDGESTONE');
  });

  it('brend kodi 12 belgi bilan cheklanadi', () => {
    expect(usedTireSku(195, 65, 15, 'ContinentalPremiumContact')).toBe('BU-195-65-R15-CONTINENTALP');
  });
});

describe('suggestResalePrice', () => {
  it('kredit × 1,5, mingga yaxlitlanadi', () => {
    expect(suggestResalePrice(150_000)).toBe(225_000);
    expect(suggestResalePrice(123_456)).toBe(185_000);
    expect(suggestResalePrice(0)).toBe(0);
  });
});
