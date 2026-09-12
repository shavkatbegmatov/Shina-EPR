import { describe, expect, it } from 'vitest';
import { suggestResalePrice, toTradeInItemRequest, usedTireSku } from './tradeIn';

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

describe('toTradeInItemRequest', () => {
  // POS va Barter sahifasi bir xil so'rov tuzadi — kalit serverga ketmaydi
  it('savat qatorini serverga ketadigan ko\'rinishga o\'tkazadi', () => {
    expect(
      toTradeInItemRequest({

        width: 205,
        profile: 55,
        diameter: 16,
        brandName: 'Michelin',
        condition: 'protektor 60%',
        quantity: 4,
        unitValue: 150_000,
        resalePrice: 225_000,
      })
    ).toEqual({
      width: 205,
      profile: 55,
      diameter: 16,
      brandName: 'Michelin',
      condition: 'protektor 60%',
      quantity: 4,
      unitValue: 150_000,
      resalePrice: 225_000,
    });
  });
});
