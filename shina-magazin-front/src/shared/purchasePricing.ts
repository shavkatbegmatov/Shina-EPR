import type { PurchaseCurrency } from '../types';

/**
 * Kirim hujjati arifmetikasi — backend `PurchasePricing` ning ko'zgusi.
 *
 * <p>Forma raqamlarni FAQAT KO'RSATISH uchun hisoblaydi; saqlanadigan
 * qiymatlarni server hisoblaydi. Lekin kassir formada ko'rgan "To'lov
 * summa" server yozadigani bilan bir xil bo'lishi kerak — aks holda u
 * ta'minotchi hujjatidagi raqam bilan solishtirolmaydi. Shuning uchun
 * yaxlitlash qoidasi ham bir xil: qator darajasida, 2 xonagacha.
 */

export interface PricingLineInput {
  key: string | number;
  quantity: number;
  /** Narx hujjat valyutasida. */
  unitPrice: number;
  /** Bir dona uchun bonus, hujjat valyutasida. */
  bonusPerUnit: number;
  /** Qator bonusi foizda (berilsa bonusPerUnit e'tiborga olinmaydi). */
  bonusPercent: number;
}

export interface PricingLine {
  key: string | number;
  quantity: number;
  /** So'mda. */
  unitPrice: number;
  totalPrice: number;
  bonusAmount: number;
  transportShare: number;
  landedUnitCost: number;
  /** Hujjat valyutasida. */
  foreignLineTotal: number;
  foreignBonus: number;
}

export interface PricingTotals {
  lines: PricingLine[];
  totalQuantity: number;
  goodsAmount: number;
  bonusAmount: number;
  /** To'lov summasi (so'm) = tovar − bonus. */
  totalAmount: number;
  foreignGoods: number;
  foreignBonus: number;
  /** To'lov summasi hujjat valyutasida (UZS hujjatda = totalAmount). */
  foreignTotalAmount: number;
}

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export function computePurchasePricing(
  currency: PurchaseCurrency,
  exchangeRate: number,
  transportCost: number,
  inputs: PricingLineInput[]
): PricingTotals {
  const fx = currency === 'UZS' ? 1 : exchangeRate;
  const transport = Math.max(0, transportCost || 0);
  const totalQuantity = inputs.reduce((sum, line) => sum + line.quantity, 0);

  let allocated = 0;
  let goodsAmount = 0;
  let bonusAmount = 0;
  let foreignGoods = 0;
  let foreignBonus = 0;

  const lines = inputs.map((input, index) => {
    const qty = input.quantity;
    const unitPrice = round2((input.unitPrice || 0) * fx);
    const totalPrice = round2(unitPrice * qty);
    const bonusPerUnit = round2((input.bonusPerUnit || 0) * fx);
    const foreignLineTotal = round2((input.unitPrice || 0) * qty);

    let lineBonus: number;
    let lineForeignBonus: number;
    if (input.bonusPercent > 0) {
      lineBonus = round2((totalPrice * input.bonusPercent) / 100);
      lineForeignBonus = round2((foreignLineTotal * input.bonusPercent) / 100);
    } else {
      lineBonus = round2(bonusPerUnit * qty);
      lineForeignBonus = round2((input.bonusPerUnit || 0) * qty);
    }

    // Yo'l haqi ulushi — oxirgi qator qoldiqni oladi (yaxlitlash farqi yo'qolmasin)
    let share: number;
    if (totalQuantity === 0 || qty === 0) {
      share = 0;
    } else if (index === inputs.length - 1) {
      share = round2(transport - allocated);
    } else {
      share = round2((transport * qty) / totalQuantity);
    }
    allocated = round2(allocated + share);

    const landedUnitCost = qty > 0 ? round2((totalPrice - lineBonus + share) / qty) : 0;

    goodsAmount = round2(goodsAmount + totalPrice);
    bonusAmount = round2(bonusAmount + lineBonus);
    foreignGoods = round2(foreignGoods + foreignLineTotal);
    foreignBonus = round2(foreignBonus + lineForeignBonus);

    return {
      key: input.key,
      quantity: qty,
      unitPrice,
      totalPrice,
      bonusAmount: lineBonus,
      transportShare: share,
      landedUnitCost,
      foreignLineTotal,
      foreignBonus: lineForeignBonus,
    };
  });

  return {
    lines,
    totalQuantity,
    goodsAmount,
    bonusAmount,
    totalAmount: round2(goodsAmount - bonusAmount),
    foreignGoods,
    foreignBonus,
    foreignTotalAmount: round2(foreignGoods - foreignBonus),
  };
}

/** Hujjat valyutasidagi summani so'mga (butun so'mgacha yaxlitlab). */
export function toUzs(amount: number, currency: PurchaseCurrency, exchangeRate: number): number {
  return currency === 'UZS' ? amount : Math.round(amount * exchangeRate);
}
