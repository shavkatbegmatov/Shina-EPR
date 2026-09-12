/**
 * Barter yordamchilari — sof funksiyalar (komponentdan alohida, sinaladigan).
 */
import type { TradeInItemRequest, TradeInLine } from '../types';

/** Savat/forma qatori → serverga ketadigan barter qatori (kalit yuborilmaydi). */
export function toTradeInItemRequest(line: Omit<TradeInLine, 'key'>): TradeInItemRequest {
  return {
    width: line.width,
    profile: line.profile,
    diameter: line.diameter,
    brandName: line.brandName,
    condition: line.condition,
    quantity: line.quantity,
    unitValue: line.unitValue,
    resalePrice: line.resalePrice,
  };
}

/** Server bilan bir xil kalit: `BU-205-55-R16[-BREND]` — kassir SKU o'ylamaydi. */
export function usedTireSku(
  width: number,
  profile: number,
  diameter: number,
  brandName?: string
): string {
  const base = `BU-${width}-${profile}-R${diameter}`;
  const code = (brandName ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  return code ? `${base}-${code}` : base;
}

/**
 * Kredit asosida B/U sotish narxi taklifi: ×1,5, mingga yaxlitlangan.
 * Faqat taklif — kassir o'zgartirsa ergashmaydi (`TradeInModal`).
 */
export function suggestResalePrice(unitValue: number): number {
  if (unitValue <= 0) return 0;
  return Math.round((unitValue * 1.5) / 1000) * 1000;
}
